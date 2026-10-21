package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyLookupResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyLookupResponse.BlockReason;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyLookupResponse.IntakeRequest;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyLookupResponse.Item;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.LichSuBaoHanh;
import com.example.dantruventu.Entity.PhieuBaoHanh;
import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.KetQuaTiepNhanBaoHanh;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiDieuKienBaoHanh;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.WarrantyReadException;
import com.example.dantruventu.Repository.warranty.WarrantyHistoryRepository;
import com.example.dantruventu.Repository.warranty.WarrantyLookupRepository;
import com.example.dantruventu.Repository.warranty.WarrantyLookupRepository.Candidate;
import com.example.dantruventu.Repository.warranty.WarrantyLookupRepository.Filter;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminWarrantyLookupService {
  private static final Set<TrangThaiTraHang> OPEN_RETURNS =
      Set.of(
          TrangThaiTraHang.CHO_TIEP_NHAN,
          TrangThaiTraHang.DA_NHAN_HANG,
          TrangThaiTraHang.CHO_TRA_KHACH);
  private static final Set<TrangThaiTraHang> ACCEPTED_RETURNS =
      Set.of(
          TrangThaiTraHang.DA_NHAN_HANG, TrangThaiTraHang.DA_HOAN_TIEN, TrangThaiTraHang.HOAN_TAT);
  private final WarrantyLookupRepository repository;
  private final WarrantyHistoryRepository historyRepository;
  private final WarrantyHistorySupport history;
  private final WarrantyDeviceResolver deviceResolver;

  public AdminWarrantyLookupResponse getLookup(
      String soSerial,
      String maTheoDoi,
      String maDonHang,
      String sdt,
      String requestId,
      String page,
      String limit) {
    Filter filter =
        new Filter(
            normalize(soSerial, 100),
            normalize(maTheoDoi, 50),
            normalize(maDonHang, 50),
            normalize(sdt, 20));
    Long intakeId =
        requestId == null
            ? null
            : WarrantyReadValidation.id(requestId, ErrorCode.INVALID_WARRANTY_LOOKUP);
    if (intakeId == null && empty(filter)) throw invalidSearch();
    int pageNumber = WarrantyReadValidation.page(page, 0, ErrorCode.INVALID_WARRANTY_LOOKUP);
    int pageSize = WarrantyReadValidation.pageSize(limit, 20, ErrorCode.INVALID_WARRANTY_LOOKUP);
    WarrantyReadValidation.validateOffset(pageNumber, pageSize, ErrorCode.INVALID_WARRANTY_LOOKUP);
    if (intakeId != null) return byIntakeId(intakeId, filter, pageNumber, pageSize);

    // Count/order/page source rows in the database before enriching that one page.
    Page<Candidate> candidates =
        repository.findCandidates(filter, PageRequest.of(pageNumber, pageSize));
    List<Item> items = candidates.getContent().stream().map(this::toItem).toList();
    List<IntakeRequest> requests = searchIntakes(filter);
    return new AdminWarrantyLookupResponse(
        items,
        requests,
        WarrantyReadValidation.pagination(pageNumber, pageSize, candidates.getTotalElements()));
  }

  private AdminWarrantyLookupResponse byIntakeId(Long id, Filter filter, int page, int limit) {
    LichSuBaoHanh root =
        historyRepository
            .findIntakeById(id)
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.INTAKE_REQUEST_NOT_FOUND,
                        "query.yeu_cau_tiep_nhan_id",
                        "INTAKE_REQUEST_NOT_FOUND"));
    IntakeRequest request = intake(root, historyRepository.findIntakeEvents(id));
    if (!matches(filter, request))
      return new AdminWarrantyLookupResponse(
          List.of(), List.of(), WarrantyReadValidation.pagination(page, limit, 0));
    if (request.thietBiId() != null) {
      ThietBiBaoHanh device = repository.device(request.thietBiId());
      DonHang order = device.getChiTietDonHang().getDonHang();
      if (request.donHangId() != null && !Objects.equals(request.donHangId(), order.getId()))
        throw invalidData();
      Candidate candidate =
          new Candidate(
              "DEVICE",
              device.getId(),
              device.getChiTietDonHang().getId(),
              device.getSoSerial() == null ? null : device.getSoSerial().getId(),
              order.getId(),
              device.getPhienBan().getId(),
              1);
      return new AdminWarrantyLookupResponse(
          page == 0 ? List.of(toItem(candidate)) : List.of(),
          List.of(request),
          WarrantyReadValidation.pagination(page, limit, 1));
    }
    if (request.donHangId() != null) {
      DonHang order = repository.order(request.donHangId());
      if (request.maDonHang() != null && !Objects.equals(request.maDonHang(), order.getMaDonHang()))
        throw invalidData();
      Filter linkedFilter =
          new Filter(filter.serial(), filter.tracking(), order.getMaDonHang(), filter.phone());
      Page<Candidate> candidates =
          repository.findCandidates(linkedFilter, PageRequest.of(page, limit));
      return new AdminWarrantyLookupResponse(
          candidates.getContent().stream().map(this::toItem).toList(),
          List.of(request),
          WarrantyReadValidation.pagination(page, limit, candidates.getTotalElements()));
    }
    // A saved unverified request is not silently attached to a matching serial/order.
    return new AdminWarrantyLookupResponse(
        List.of(), List.of(request), WarrantyReadValidation.pagination(page, limit, 0));
  }

  private List<IntakeRequest> searchIntakes(Filter filter) {
    Map<Long, LichSuBaoHanh> roots = new LinkedHashMap<>();
    for (LichSuBaoHanh event :
        historyRepository.searchIntakes(
            filter.serial(), filter.tracking(), filter.orderCode(), filter.phone())) {
      Long rootId = history.id(history.payload(event).get("yeu_cau_tiep_nhan_id"));
      if (rootId == null) rootId = event.getId();
      if (!roots.containsKey(rootId)) {
        LichSuBaoHanh root =
            historyRepository.findIntakeById(rootId).orElseThrow(this::invalidData);
        roots.put(rootId, root);
      }
    }
    List<IntakeRequest> requests = new ArrayList<>();
    for (var entry : roots.entrySet()) {
      IntakeRequest request =
          intake(entry.getValue(), historyRepository.findIntakeEvents(entry.getKey()));
      if (matches(filter, request)) requests.add(request);
    }
    return requests;
  }

  private IntakeRequest intake(LichSuBaoHanh root, List<LichSuBaoHanh> events) {
    Map<String, Object> data = history.latestSection(events, "yeu_cau_tiep_nhan");
    if (data == null) throw invalidHistory();
    String result = history.text(data.get("ket_qua_tiep_nhan"));
    try {
      KetQuaTiepNhanBaoHanh.valueOf(result == null ? "" : result);
    } catch (IllegalArgumentException failure) {
      throw invalidHistory();
    }
    return new IntakeRequest(
        root.getId(),
        result,
        history.text(data.get("ly_do")),
        history.id(data.get("don_hang_id")),
        history.id(data.get("thiet_bi_id")),
        history.text(data.get("ten_nguoi_lien_he")),
        history.text(data.get("sdt_nguoi_lien_he")),
        history.text(data.get("so_serial")),
        history.text(data.get("ma_theo_doi")),
        history.text(data.get("ma_don_hang")));
  }

  private Item toItem(Candidate candidate) {
    ThietBiBaoHanh device = repository.device(candidate.deviceId());
    ChiTietDonHang line = repository.line(candidate.lineId());
    SoSerialSanPham serial = repository.serial(candidate.serialId());
    DonHang order = repository.order(candidate.orderId());
    List<BlockReason> blocks = new ArrayList<>();
    WarrantyDeviceResolver.DeviceState state = null;
    boolean current = true;
    Long currentId = null;
    Long returnLineId = null;
    if (device != null) {
      state = deviceResolver.resolve(device);
      current = state.hienHanh();
      currentId = state.thietBiHienHanh() == null ? null : state.thietBiHienHanh().getId();
      returnLineId = state.chiTietTraHangId();
      blocks.addAll(state.lyDoChan());
      if (!Objects.equals(device.getChiTietDonHang().getId(), candidate.lineId())
          || !Objects.equals(device.getChiTietDonHang().getDonHang().getId(), candidate.orderId())
          || !Objects.equals(device.getPhienBan().getId(), candidate.variantId())
          || (serial != null
              && !Objects.equals(serial.getPhienBan().getId(), device.getPhienBan().getId())))
        throw invalidData();
    }
    boolean delivered = repository.wasDelivered(order);
    if (order == null) {
      current = false;
      blocks.add(
          new BlockReason("PURCHASE_ORIGIN_UNVERIFIED", "Chưa xác minh được giao dịch mua gốc"));
    } else if (!delivered) {
      blocks.add(new BlockReason("NOT_DELIVERED", "Chưa có căn cứ sản phẩm đã giao cho khách"));
    }
    if (line == null) {
      current = false;
      String code =
          candidate.matchingLines() > 1
              ? "PURCHASE_LINE_AMBIGUOUS"
              : order != null && repository.hasComboLines(order.getId())
                  ? "MISSING_SOLD_SNAPSHOT"
                  : "PURCHASE_LINE_UNVERIFIED";
      blocks.add(
          new BlockReason(
              code,
              candidate.matchingLines() > 1
                  ? "Serial khớp nhiều dòng mua; cần xác minh chính xác dòng gốc"
                  : "Chưa có căn cứ liên kết serial với dòng mua hoặc cấu hình đã bán"));
    }
    long purchased = line == null ? 0 : quantity(line.getSoLuong());
    long processing = 0;
    List<LichSuBaoHanh> deviceEvents = new ArrayList<>();
    Map<Long, Long> originalDeviceByEvent = new LinkedHashMap<>();
    if (line != null) {
      if (order == null || !Objects.equals(line.getDonHang().getId(), order.getId()))
        throw invalidData();
      List<PhieuBaoHanh> warranties = repository.findWarrantiesForLine(line.getId());
      Set<Long> activeDevices = new HashSet<>();
      boolean selectedDeviceLocked = false;
      for (PhieuBaoHanh ticket : warranties) {
        if (!Objects.equals(ticket.getDonHang().getId(), order.getId())) throw invalidData();
        if (ticket.getTrangThaiXuLy() != TrangThaiBaoHanh.HOAN_TAT) {
          activeDevices.add(ticket.getThietBi().getId());
          if (device != null && Objects.equals(ticket.getThietBi().getId(), device.getId()))
            selectedDeviceLocked = true;
        }
        if (device != null) {
          // A replacement's warranty basis can live on the original device's handover event.
          // Keep its source device so an unscoped old-device snapshot never leaks to the new one.
          for (LichSuBaoHanh event :
              historyRepository.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(ticket.getId())) {
            if (originalDeviceByEvent.put(event.getId(), ticket.getThietBi().getId()) != null) {
              throw invalidHistory();
            }
            deviceEvents.add(event);
          }
        }
      }
      if (selectedDeviceLocked)
        blocks.add(
            new BlockReason(
                "WARRANTY_DEVICE_LOCKED", "Thiết bị đang có phiếu bảo hành chưa hoàn tất"));
      processing = activeDevices.size();
      long acceptedReturns = 0;
      boolean returnLocked = false;
      for (ChiTietTraHang returned : repository.findReturnsForLine(line.getId())) {
        TrangThaiTraHang status = returned.getPhieuTraHang().getTrangThaiTraHang();
        long amount = quantity(returned.getSoLuong());
        if (ACCEPTED_RETURNS.contains(status))
          acceptedReturns = Math.addExact(acceptedReturns, amount);
        if (OPEN_RETURNS.contains(status)) {
          returnLocked = true;
          processing = Math.addExact(processing, amount);
        }
      }
      if (returnLocked)
        blocks.add(new BlockReason("RETURN_LINE_LOCKED", "Dòng đơn có yêu cầu trả đang xử lý"));
      if (acceptedReturns > purchased) throw invalidData();
      if (current && !selectedDeviceLocked && activeDevices.size() >= purchased - acceptedReturns) {
        blocks.add(
            new BlockReason(
                "WARRANTY_QUANTITY_LIMIT",
                "Số lượng đang xử lý đã sử dụng hết quyền còn lại của dòng mua"));
      }
      if ("LINE".equals(candidate.kind())) {
        for (ThietBiBaoHanh tracked : repository.findDevicesForLine(line.getId()))
          deviceResolver.resolve(tracked);
        if (line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC) {
          blocks.add(
              new BlockReason(
                  line.getCauHinhDaBan() == null
                      ? "MISSING_SOLD_SNAPSHOT"
                      : "SOLD_SNAPSHOT_REQUIRES_VERIFICATION",
                  "Cần xác minh thành phần và nhận dạng của bộ sản phẩm từ cấu hình đã bán; không dùng cấu hình combo hiện tại"));
        } else if (!Boolean.FALSE.equals(line.getPhienBan().getCoQuanLySerial())) {
          blocks.add(
              new BlockReason(
                  "MISSING_DEVICE_IDENTIFICATION",
                  "Chưa có serial hoặc nhận dạng thiết bị đã giao để xác minh dòng mua"));
        }
      }
    }
    if (serial != null) {
      if (serial.getTrangThai() == TrangThaiSerial.DANG_BAO_HANH) {
        if (blocks.stream().noneMatch(reason -> "WARRANTY_DEVICE_LOCKED".equals(reason.code()))) {
          blocks.add(new BlockReason("WARRANTY_DEVICE_LOCKED", "Serial đang được xử lý bảo hành"));
        }
      } else if (serial.getTrangThai() == TrangThaiSerial.DA_THAY_THE_BAO_HANH) {
        current = false;
        if (blocks.stream().noneMatch(reason -> "DEVICE_REPLACED".equals(reason.code()))) {
          blocks.add(
              new BlockReason(
                  "DEVICE_REPLACED",
                  "Serial cũ đã được thay thế; cần truy vết thiết bị hiện hành"));
        }
      } else if (serial.getTrangThai() != TrangThaiSerial.DA_BAN) {
        current = false;
        if (blocks.stream().noneMatch(reason -> "SERIAL_RIGHT_UNVERIFIED".equals(reason.code()))) {
          blocks.add(
              new BlockReason(
                  "SERIAL_RIGHT_UNVERIFIED",
                  "Chưa có căn cứ serial đang thuộc quyền của khách tại giao dịch này"));
        }
      }
    }
    deviceEvents.sort(
        java.util.Comparator.comparing(
                LichSuBaoHanh::getNgayTao,
                java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder()))
            .thenComparing(LichSuBaoHanh::getId));
    Map<String, Object> deviceSnapshot = null;
    Map<String, Object> intakeSnapshot = null;
    for (LichSuBaoHanh event : deviceEvents) {
      Map<String, Object> data = history.payload(event);
      Map<String, Object> snapshot = history.object(data.get("thiet_bi"));
      boolean original =
          device != null
              && Objects.equals(device.getId(), originalDeviceByEvent.get(event.getId()));
      if (belongsToDevice(snapshot, device, original)) deviceSnapshot = snapshot;
      Map<String, Object> currentSnapshot = history.object(data.get("thiet_bi_hien_hanh"));
      if (belongsToDevice(currentSnapshot, device, false)) deviceSnapshot = currentSnapshot;
      if (original && data.containsKey("tiep_nhan")) {
        intakeSnapshot = history.object(data.get("tiep_nhan"));
      }
    }
    String basis =
        deviceSnapshot == null ? null : history.text(deviceSnapshot.get("can_cu_tinh_han"));
    if (basis == null && line != null)
      basis = "Cần xác minh chính sách và mốc nhận của dòng " + line.getId();
    String condition =
        deviceSnapshot == null ? null : history.text(deviceSnapshot.get("dieu_kien_bao_hanh"));
    if (condition == null && intakeSnapshot != null)
      condition = history.text(intakeSnapshot.get("dieu_kien_bao_hanh"));
    if (condition == null) condition = TrangThaiDieuKienBaoHanh.CHUA_XAC_MINH.name();
    try {
      TrangThaiDieuKienBaoHanh.valueOf(condition);
    } catch (IllegalArgumentException failure) {
      throw invalidHistory();
    }
    LocalDateTime deadline =
        serial == null ? device == null ? null : device.getHanBaoHanh() : serial.getHanBaoHanh();
    java.time.OffsetDateTime deadlineResponse = WarrantyReadValidation.time(deadline);
    if (deadlineResponse == null && deviceSnapshot != null) {
      // The snapshot has already been scoped to this exact device/source ticket above.
      deadlineResponse = history.time(deviceSnapshot.get("han_bao_hanh"));
    }
    return new Item(
        order == null ? null : order.getId(),
        order == null ? null : order.getMaDonHang(),
        line == null ? null : line.getId(),
        order == null || order.getKhachHang() == null ? null : order.getKhachHang().getId(),
        delivered,
        delivered ? purchased : 0,
        processing,
        device == null ? null : device.getId(),
        device == null ? null : device.getMaTheoDoi(),
        candidate.variantId(),
        serial == null ? null : serial.getId(),
        serial == null ? null : serial.getSoSerial(),
        current,
        deadlineResponse,
        basis,
        condition,
        blocks.isEmpty() && current && delivered,
        List.copyOf(blocks),
        current ? null : currentId,
        returnLineId);
  }

  private boolean matches(Filter filter, IntakeRequest request) {
    return (filter.serial() == null || filter.serial().equals(request.soSerial()))
        && (filter.tracking() == null || filter.tracking().equals(request.maTheoDoi()))
        && (filter.orderCode() == null || filter.orderCode().equals(request.maDonHang()))
        && (filter.phone() == null || filter.phone().equals(request.sdtNguoiLienHe()));
  }

  private boolean belongsToDevice(
      Map<String, Object> snapshot, ThietBiBaoHanh device, boolean original) {
    if (snapshot == null || device == null) return false;
    Long snapshotId = history.id(snapshot.get("id"));
    if (snapshotId == null ? !original : !device.getId().equals(snapshotId)) return false;
    Long serialId = history.id(snapshot.get("so_serial_id"));
    if (serialId != null
        && (device.getSoSerial() == null || !serialId.equals(device.getSoSerial().getId())))
      throw invalidHistory();
    return true;
  }

  private boolean empty(Filter filter) {
    return filter.serial() == null
        && filter.tracking() == null
        && filter.orderCode() == null
        && filter.phone() == null;
  }

  private String normalize(String value, int max) {
    if (value == null) return null;
    String normalized = value.strip();
    if (normalized.isEmpty() || normalized.length() > max) throw invalidSearch();
    return normalized;
  }

  private long quantity(Integer value) {
    if (value == null || value <= 0) throw invalidData();
    return value;
  }

  private AppException invalidSearch() {
    return new AppException(ErrorCode.INVALID_WARRANTY_LOOKUP);
  }

  private AppException invalidData() {
    return new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
  }

  private AppException invalidHistory() {
    return new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
  }
}
