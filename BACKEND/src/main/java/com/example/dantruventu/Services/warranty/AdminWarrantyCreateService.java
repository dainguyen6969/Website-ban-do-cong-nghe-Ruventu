package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyCreateRequest;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyCreateResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.WarrantyReadException;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.warranty.WarrantyHistoryRepository;
import com.example.dantruventu.Repository.warranty.WarrantyIntakeRepository;
import com.example.dantruventu.Repository.warranty.WarrantyLookupRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminWarrantyCreateService {
  private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final Set<TrangThaiTraHang> OPEN_RETURNS =
      Set.of(
          TrangThaiTraHang.CHO_TIEP_NHAN,
          TrangThaiTraHang.DA_NHAN_HANG,
          TrangThaiTraHang.CHO_TRA_KHACH);
  private static final Set<TrangThaiTraHang> ACCEPTED_RETURNS =
      Set.of(
          TrangThaiTraHang.DA_NHAN_HANG, TrangThaiTraHang.DA_HOAN_TIEN, TrangThaiTraHang.HOAN_TAT);
  private final WarrantyIntakeRepository writes;
  private final WarrantyLookupRepository reads;
  private final WarrantyDeviceResolver resolver;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final SalesIdempotencyRepository idempotency;
  private final ObjectMapper mapper;

  private record Input(
      Long requestId,
      Long deviceId,
      Long lineId,
      OffsetDateTime receivedAt,
      String reason,
      String condition,
      String contact,
      String phone,
      String eligibility,
      String basis,
      String identification,
      String provider,
      String note,
      List<Map<String, Object>> accessories,
      List<String> images) {}

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminWarrantyCreateResponse create(
      AdminWarrantyCreateRequest request, String key, Long actorId) {
    try {
      return createInTransaction(request, key, actorId);
    } catch (AppException | PessimisticLockingFailureException failure) {
      throw failure;
    } catch (RuntimeException failure) {
      log.error("Warranty intake transaction failed", failure);
      throw new AppException(ErrorCode.WARRANTY_CREATE_FAILED);
    }
  }

  private AdminWarrantyCreateResponse createInTransaction(
      AdminWarrantyCreateRequest request, String key, Long actorId) {
    if (actorId == null) throw new AppException(ErrorCode.UNAUTHORIZED);
    Input input = validate(request);
    if (key == null || !key.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
      throw invalid("Idempotency-Key bắt buộc và phải là UUID.");
    String storageKey = "BH-CREATE-" + key.toLowerCase(Locale.ROOT);
    String hash =
        hash(
            actorId
                + ":POST:/api/v1/admin/warranties:v1:"
                + mapper
                    .writer()
                    .with(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
                    .writeValueAsString(input));
    var entry = idempotency.acquire(storageKey, actorId, hash);
    if (!Objects.equals(entry.actorId(), actorId) || !Objects.equals(entry.requestHash(), hash))
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
          "headers.Idempotency-Key",
          "IDEMPOTENCY_KEY_REUSED");
    // Successful retries return the original result, even if the device is now locked by that
    // ticket.
    if (entry.responseJson() != null)
      return mapper
          .readerFor(AdminWarrantyCreateResponse.class)
          .without(DateTimeFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
          .readValue(entry.responseJson());

    var origin = writes.origin(input.deviceId(), input.lineId());
    // Shared lock order with return creation: order -> purchase line -> device -> serial.
    // READ_COMMITTED prevents pre-lock reads from retaining a stale MySQL read view.
    DonHang order = writes.lockOrder(origin.orderId());
    ChiTietDonHang line = writes.lockLine(origin.lineId());
    if (!Objects.equals(line.getDonHang().getId(), order.getId())
        || !reads.wasDelivered(order)
        || (order.getNgayTao() != null
            && input.receivedAt().toLocalDateTime().isBefore(order.getNgayTao())))
      throw originUnverified();
    LocalDateTime deliveredAt = writes.deliveryRecordedAt(order.getId());
    if (deliveredAt != null && input.receivedAt().toLocalDateTime().isBefore(deliveredAt))
      throw originUnverified();
    List<ChiTietTraHang> returns = reads.findReturnsForLine(line.getId());
    if (returns.stream()
        .anyMatch(r -> OPEN_RETURNS.contains(r.getPhieuTraHang().getTrangThaiTraHang())))
      throw locked();
    List<PhieuBaoHanh> tickets = reads.findWarrantiesForLine(line.getId());
    LichSuBaoHanh intake = input.requestId() == null ? null : writes.lockIntake(input.requestId());

    boolean newDevice = input.deviceId() == null;
    ThietBiBaoHanh device;
    Map<String, Object> savedBasis = Map.of();
    if (newDevice) {
      if (line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC)
        throw new AppException(ErrorCode.WARRANTY_PC_COMPONENT_UNSUPPORTED);
      if (line.getPhienBan().getSanPham().getLoaiSanPham() != LoaiSanPham.DON
          || !Boolean.FALSE.equals(line.getPhienBan().getCoQuanLySerial()))
        throw originUnverified();
      ensureCapacity(line, returns, tickets, true, input.identification());
      if ("DU_DIEU_KIEN".equals(input.eligibility()))
        throw new AppException(ErrorCode.WARRANTY_FREE_CONDITION_UNVERIFIED);
      // Check the pre-ticket request before allocating a new tracking identity.
      validateIntake(intake, line, null);
      device = writes.createDevice(line, input.identification());
    } else {
      device = writes.lockDevice(input.deviceId());
      if (!Objects.equals(device.getChiTietDonHang().getId(), line.getId()))
        throw originUnverified();
      boolean replacement = !reads.findIncomingReplacementTickets(device.getId()).isEmpty();
      if (!replacement
          && line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.DON
          && !Objects.equals(device.getPhienBan().getId(), line.getPhienBan().getId()))
        throw originUnverified();
      if (device.getSoSerial() != null) {
        SoSerialSanPham serial = writes.lockSerial(device.getSoSerial().getId());
        device.setSoSerial(serial);
        if (!Objects.equals(serial.getPhienBan().getId(), device.getPhienBan().getId()))
          throw originUnverified();
        // A replacement serial may not refer directly to the original order; the resolver
        // requires an actual completed HANDOVER chain in that case.
        if (!replacement
            && (serial.getDonHang() == null
                || !Objects.equals(serial.getDonHang().getId(), order.getId())))
          throw originUnverified();
      } else if (!Boolean.FALSE.equals(device.getPhienBan().getCoQuanLySerial())) {
        throw originUnverified();
      }
      var state = resolver.resolve(device);
      if (!state.hienHanh() || !state.lyDoChan().isEmpty()) throw locked();
      for (PhieuBaoHanh previous : tickets) {
        if (Objects.equals(previous.getThietBi().getId(), device.getId())) {
          if (previous.getTrangThaiXuLy() != TrangThaiBaoHanh.HOAN_TAT) throw locked();
          LocalDateTime ended = previous.getNgayCapNhat();
          if (ended != null && input.receivedAt().toLocalDateTime().isBefore(ended)) throw locked();
        }
      }
      if (line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.DON)
        ensureCapacity(line, returns, tickets, false, null);
      validateIntake(intake, line, device);
      savedBasis = savedBasis(device, tickets);
      LocalDateTime expiry =
          device.getSoSerial() == null
              ? device.getHanBaoHanh()
              : device.getSoSerial().getHanBaoHanh();
      if (expiry == null && savedBasis.get("han_bao_hanh") != null)
        expiry = history.time(savedBasis.get("han_bao_hanh")).toLocalDateTime();
      LocalDateTime activated =
          device.getSoSerial() == null
              ? device.getNgayKichHoat()
              : device.getSoSerial().getNgayKichHoat();
      if (activated != null && input.receivedAt().toLocalDateTime().isBefore(activated))
        throw originUnverified();
      if ("DU_DIEU_KIEN".equals(input.eligibility())
          && (expiry == null || input.receivedAt().toLocalDateTime().isAfter(expiry)))
        throw new AppException(ErrorCode.WARRANTY_FREE_CONDITION_UNVERIFIED);
    }

    if (device.getSoSerial() != null)
      device.getSoSerial().setTrangThai(TrangThaiSerial.DANG_BAO_HANH);
    PhieuBaoHanh ticket =
        writes.createTicket(
            device,
            actorId,
            input.reason(),
            input.condition(),
            input.contact(),
            input.phone(),
            input.receivedAt().toLocalDateTime(),
            input.provider(),
            input.note());
    writes.recordHistory(
        ticket, actorId, mapper.writeValueAsString(event(input, device, intake, savedBasis)));
    AdminWarrantyCreateResponse response =
        new AdminWarrantyCreateResponse(
            ticket.getId(),
            ticket.getMaPhieu(),
            order.getId(),
            line.getId(),
            order.getKhachHang() == null ? null : order.getKhachHang().getId(),
            device.getId(),
            device.getMaTheoDoi(),
            device.getSoSerial() == null ? null : device.getSoSerial().getId(),
            device.getSoSerial() == null ? null : device.getSoSerial().getTrangThai().name(),
            "TIEP_NHAN",
            "CHAP_NHAN",
            input.eligibility(),
            actorId,
            input.receivedAt(),
            device.getPhienBan().getId(),
            true,
            1,
            null,
            null,
            false);
    idempotency.complete(storageKey, mapper.writeValueAsString(response));
    return response;
  }

  private void ensureCapacity(
      ChiTietDonHang line,
      List<ChiTietTraHang> returns,
      List<PhieuBaoHanh> tickets,
      boolean allocating,
      String identification) {
    if (line.getSoLuong() == null || line.getSoLuong() <= 0) throw originUnverified();
    long returned = 0;
    Map<Long, Long> returnQuantities = new HashMap<>();
    for (var r : returns)
      if (ACCEPTED_RETURNS.contains(r.getPhieuTraHang().getTrangThaiTraHang())) {
        if (r.getSoLuong() == null || r.getSoLuong() <= 0) throw originUnverified();
        returned += r.getSoLuong();
        returnQuantities.put(r.getId(), r.getSoLuong().longValue());
      }
    long rootCount = 0;
    Map<Long, Long> trackedReturned = new HashMap<>();
    for (var d : reads.findDevicesForLine(line.getId())) {
      if (!reads.findIncomingReplacementTickets(d.getId()).isEmpty()) continue;
      rootCount++;
      var state = resolver.resolve(d);
      if (state.chiTietTraHangId() != null)
        trackedReturned.merge(state.chiTietTraHangId(), 1L, Long::sum);
      if (allocating && Objects.equals(identification, d.getDauHieuNhanDang())) throw locked();
    }
    for (var r : trackedReturned.entrySet())
      if (r.getValue() > returnQuantities.getOrDefault(r.getKey(), 0L)) throw originUnverified();
    long untrackedReturned =
        returned - trackedReturned.values().stream().mapToLong(Long::longValue).sum();
    long accounted = rootCount + untrackedReturned;
    long open =
        tickets.stream()
            .filter(w -> w.getTrangThaiXuLy() != TrangThaiBaoHanh.HOAN_TAT)
            .map(w -> w.getThietBi().getId())
            .distinct()
            .count();
    // Count physical purchase roots, never the lifetime number of warranty visits.
    if (returned > line.getSoLuong()
        || accounted > line.getSoLuong()
        || open >= line.getSoLuong() - returned
        || (allocating && accounted >= line.getSoLuong())) throw locked();
  }

  private void validateIntake(LichSuBaoHanh root, ChiTietDonHang line, ThietBiBaoHanh device) {
    if (root == null) return;
    List<LichSuBaoHanh> events = histories.findIntakeEvents(root.getId());
    if (events.stream().anyMatch(e -> e.getPhieuBaoHanh() != null)) throw locked();
    Map<String, Object> data = history.latestSection(events, "yeu_cau_tiep_nhan");
    if (data == null || !"CHO_XAC_MINH".equals(history.text(data.get("ket_qua_tiep_nhan"))))
      throw locked();
    checkId(data, "don_hang_id", line.getDonHang().getId());
    checkId(data, "chi_tiet_don_hang_id", line.getId());
    checkId(data, "thiet_bi_id", device == null ? null : device.getId());
    checkText(data, "ma_don_hang", line.getDonHang().getMaDonHang());
    checkText(data, "ma_theo_doi", device == null ? null : device.getMaTheoDoi());
    checkText(
        data,
        "so_serial",
        device == null || device.getSoSerial() == null ? null : device.getSoSerial().getSoSerial());
  }

  private void checkId(Map<String, Object> data, String key, Long actual) {
    Long expected = history.id(data.get(key));
    if (expected != null && !Objects.equals(expected, actual)) throw originUnverified();
  }

  private void checkText(Map<String, Object> data, String key, String actual) {
    String expected = history.text(data.get(key));
    if (expected != null && !Objects.equals(expected, actual)) throw originUnverified();
  }

  private Map<String, Object> savedBasis(ThietBiBaoHanh device, List<PhieuBaoHanh> tickets) {
    Map<Long, PhieuBaoHanh> owners = new HashMap<>();
    List<LichSuBaoHanh> events = new ArrayList<>();
    for (var ticket : tickets) {
      for (var event : histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(ticket.getId())) {
        owners.put(event.getId(), ticket);
        events.add(event);
      }
    }
    events.sort(
        Comparator.comparing(LichSuBaoHanh::getNgayTao).thenComparing(LichSuBaoHanh::getId));
    Map<String, Object> result = Map.of();
    for (var event : events) {
      var data = history.payload(event);
      for (String section : List.of("thiet_bi", "thiet_bi_hien_hanh")) {
        var candidate = history.object(data.get(section));
        if (candidate == null) continue;
        Long scopedId = history.id(candidate.get("id"));
        boolean scoped =
            Objects.equals(scopedId, device.getId())
                || (scopedId == null
                    && section.equals("thiet_bi")
                    && Objects.equals(
                        owners.get(event.getId()).getThietBi().getId(), device.getId()));
        if (scoped) {
          Long serialId = history.id(candidate.get("so_serial_id"));
          if (serialId != null
              && (device.getSoSerial() == null
                  || !Objects.equals(serialId, device.getSoSerial().getId())))
            throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
          result = candidate;
        }
      }
    }
    return result;
  }

  private Map<String, Object> event(
      Input in, ThietBiBaoHanh device, LichSuBaoHanh root, Map<String, Object> savedBasis) {
    Map<String, Object> event = new LinkedHashMap<>();
    event.put("ket_qua_tiep_nhan", "CHAP_NHAN");
    Map<String, Object> intake = new LinkedHashMap<>();
    intake.put("ngay_tiep_nhan_thuc_te", in.receivedAt().toString());
    intake.put("dieu_kien_bao_hanh", in.eligibility());
    intake.put("can_cu_xac_minh", in.basis());
    intake.put("phu_kien", in.accessories());
    intake.put("anh_urls", in.images());
    intake.put("don_vi_bao_hanh_du_kien", in.provider());
    intake.put("da_chap_thuan_phi", false);
    intake.put("ket_qua_tiep_nhan", "CHAP_NHAN");
    event.put("tiep_nhan", intake);
    Map<String, Object> source = new LinkedHashMap<>(savedBasis);
    source.put("id", device.getId());
    source.put("phien_ban_id", device.getPhienBan().getId());
    source.put("so_serial_id", device.getSoSerial() == null ? null : device.getSoSerial().getId());
    LocalDateTime expiry =
        device.getSoSerial() == null
            ? device.getHanBaoHanh()
            : device.getSoSerial().getHanBaoHanh();
    if (expiry != null) source.put("han_bao_hanh", WarrantyReadValidation.time(expiry).toString());
    source.put("dieu_kien_bao_hanh", in.eligibility());
    source.put("can_cu_xac_minh", in.basis());
    event.put("thiet_bi", source);
    event.put(
        "noi_dang_giu",
        Map.of("loai", "CUA_HANG", "ten", "Cửa hàng", "thiet_bi_id", device.getId()));
    event.put(
        "giao_nhan",
        Map.of(
            "su_kien",
            "TIEP_NHAN",
            "thiet_bi_id",
            device.getId(),
            "ngay",
            in.receivedAt().toString()));
    if (root != null) {
      Map<String, Object> request =
          new LinkedHashMap<>(
              history.latestSection(histories.findIntakeEvents(root.getId()), "yeu_cau_tiep_nhan"));
      request.put("ket_qua_tiep_nhan", "CHAP_NHAN");
      request.put("don_hang_id", device.getChiTietDonHang().getDonHang().getId());
      request.put("thiet_bi_id", device.getId());
      request.put("ma_don_hang", device.getChiTietDonHang().getDonHang().getMaDonHang());
      request.put("ma_theo_doi", device.getMaTheoDoi());
      request.put("ten_nguoi_lien_he", in.contact());
      request.put("sdt_nguoi_lien_he", in.phone());
      request.put("ly_do", in.reason());
      event.put("yeu_cau_tiep_nhan_id", root.getId());
      event.put("yeu_cau_tiep_nhan", request);
    }
    return event;
  }

  private Input validate(AdminWarrantyCreateRequest r) {
    if (r == null) throw invalid("Thiếu thông tin tiếp nhận.");
    Long requestId = id(r.yeuCauTiepNhanId()),
        deviceId = id(r.thietBiId()),
        lineId = id(r.chiTietDonHangId());
    if ((deviceId == null) == (lineId == null))
      throw invalid("Chọn đúng một nhánh: thiet_bi_id hoặc chi_tiet_don_hang_id.");
    if (r.soSerialId() != null)
      throw invalid("Thiết bị có serial phải chọn bằng thiet_bi_id đã có hồ sơ.");
    if (deviceId != null && r.dauHieuNhanDang() != null)
      throw invalid("Không ghi đè nhận dạng của thiết bị đã có hồ sơ.");
    String reason = text(r.lyDoBaoHanh(), true, 255),
        condition = text(r.tinhTrangTiepNhan(), true, 16000);
    String contact = text(r.tenNguoiLienHe(), true, 100),
        phone = text(r.sdtNguoiLienHe(), true, 20);
    if (!phone.matches("\\+?[0-9][0-9 .()-]{6,19}"))
      throw invalid("Số điện thoại liên hệ không hợp lệ.");
    String eligibility = text(r.dieuKienBaoHanh(), true, 50);
    if (!Set.of("CHUA_XAC_MINH", "DU_DIEU_KIEN", "KHONG_DU_DIEU_KIEN").contains(eligibility))
      throw invalid("Điều kiện bảo hành không hợp lệ.");
    String basis = text(r.canCuXacMinh(), true, 16000);
    OffsetDateTime received;
    try {
      received =
          OffsetDateTime.parse(r.ngayTiepNhanThucTe())
              .atZoneSameInstant(VIETNAM)
              .toOffsetDateTime()
              .withNano(0);
      if (received.isAfter(OffsetDateTime.now(VIETNAM))
          || received.toInstant().isBefore(Instant.parse("1970-01-01T00:00:01Z"))
          || received.toInstant().isAfter(Instant.parse("2038-01-19T03:14:07Z")))
        throw invalid("Thời điểm thực tiếp nhận không hợp lệ hoặc nằm trong tương lai.");
    } catch (DateTimeException | NullPointerException failure) {
      throw invalid("Thiếu hoặc sai thời điểm thực tiếp nhận có múi giờ.");
    }
    String identification = text(r.dauHieuNhanDang(), deviceId == null, 16000);
    String provider = text(r.donViBaoHanhDuKien(), false, 150),
        note = text(r.ghiChu(), false, 16000);
    List<Map<String, Object>> accessories = new ArrayList<>();
    if (r.phuKien() != null) {
      if (r.phuKien().size() > 100) throw invalid("Quá nhiều phụ kiện.");
      for (var a : r.phuKien()) {
        if (a == null) throw invalid("Phụ kiện không hợp lệ.");
        Long quantity = id(a.soLuong());
        if (quantity == null || quantity > Integer.MAX_VALUE)
          throw invalid("Số lượng phụ kiện phải là số nguyên dương.");
        accessories.add(Map.of("ten", text(a.ten(), true, 255), "so_luong", quantity));
      }
    }
    List<String> images = new ArrayList<>();
    if (r.anhUrls() != null) {
      if (r.anhUrls().size() > 100) throw invalid("Quá nhiều ảnh.");
      for (String image : r.anhUrls()) images.add(text(image, true, 2048));
    }
    if (r.phienBanThucTeId() != null || r.maDonViVatLy() != null)
      throw new AppException(ErrorCode.WARRANTY_PC_COMPONENT_UNSUPPORTED);
    return new Input(
        requestId,
        deviceId,
        lineId,
        received,
        reason,
        condition,
        contact,
        phone,
        eligibility,
        basis,
        identification,
        provider,
        note,
        List.copyOf(accessories),
        List.copyOf(images));
  }

  private Long id(Object raw) {
    if (raw == null) return null;
    if (!(raw instanceof Integer || raw instanceof Long || raw instanceof java.math.BigInteger))
      throw invalid("ID/số lượng phải là số nguyên dương.");
    try {
      long value = new BigDecimal(raw.toString()).longValueExact();
      if (value <= 0) throw invalid("ID/số lượng phải là số nguyên dương.");
      return value;
    } catch (ArithmeticException failure) {
      throw invalid("ID/số lượng vượt giới hạn.");
    }
  }

  private String text(String raw, boolean required, int max) {
    String value = raw == null ? null : raw.strip();
    if (value != null && value.isEmpty()) value = null;
    if ((required && value == null) || (value != null && value.length() > max))
      throw invalid("Thiếu trường bắt buộc hoặc vượt độ dài cho phép.");
    return value;
  }

  private String hash(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException failure) {
      throw new IllegalStateException(failure);
    }
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_WARRANTY_CREATE, message);
  }

  private AppException originUnverified() {
    return new AppException(ErrorCode.WARRANTY_ORIGIN_UNVERIFIED);
  }

  private WarrantyReadException locked() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_OR_RETURN_LOCKED, "thiet_bi_id", "WARRANTY_OR_RETURN_LOCKED");
  }
}
