package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyEventRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyEventResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminWarrantyEventService {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyMutationSupport mutations;
  private final WarrantyEventRepository repository;
  private final WarrantyDetailRepository details;
  private final WarrantyEventWorkAuthorization work;
  private final ObjectMapper mapper;

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyEventResponse> save(
      String rawId, AdminWarrantyEventRequest request, String key, Long actorId) {
    try {
      Long id = WarrantyReadValidation.id(rawId, ErrorCode.INVALID_WARRANTY_EVENT);
      return execute(id, WarrantyEventValidation.validate(request), key, actorId);
    } catch (AppException | PessimisticLockingFailureException failure) {
      throw failure;
    } catch (RuntimeException failure) {
      log.error("Saving warranty event failed", failure);
      throw new AppException(ErrorCode.WARRANTY_EVENT_FAILED);
    }
  }

  private ApiResponse<AdminWarrantyEventResponse> execute(
      Long id, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-EVENT-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/" + id + "/events",
            input,
            AdminWarrantyEventResponse.class,
            ErrorCode.INVALID_WARRANTY_EVENT);
    if (replay.previous() != null) return replay.previous();
    var origin = workflow.ticketOrigin(id);
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    PhieuBaoHanh ticket = workflow.lockTicket(id);
    if (ticket.getThietBi() == null
        || ticket.getDonHang() == null
        || !ticket.getDonHang().getId().equals(origin.orderId())
        || !ticket.getThietBi().getChiTietDonHang().getId().equals(origin.lineId())
        || ticket.getTrangThaiXuLy() == null
        || ticket.getKetQuaXuLy() == null) throw WarrantyEventWorkAuthorization.invalidHistory();
    Map<Long, ThietBiBaoHanh> devices = new TreeMap<>();
    devices.put(ticket.getThietBi().getId(), ticket.getThietBi());
    if (ticket.getThietBiThayThe() != null)
      devices.put(ticket.getThietBiThayThe().getId(), ticket.getThietBiThayThe());
    for (Long deviceId : new ArrayList<>(devices.keySet())) {
      var device = locks.lockDevice(deviceId);
      if (!device.getChiTietDonHang().getId().equals(origin.lineId()))
        throw WarrantyEventWorkAuthorization.invalidHistory();
      devices.put(deviceId, device);
    }
    Set<Long> serials = new TreeSet<>();
    for (var device : devices.values())
      if (device.getSoSerial() != null) serials.add(device.getSoSerial().getId());
    for (Long serialId : serials) locks.lockSerial(serialId);
    List<LichSuBaoHanh> events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    String eventType = input.get("su_kien").toString();
    boolean cost = eventType.equals("GHI_CHI_PHI_DON_VI");
    boolean complete = ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT;
    if (!cost
        && (complete
            || ticket.getKetQuaXuLy() == KetQuaXuLyBaoHanh.DOI_SAN_PHAM
            || events.stream().anyMatch(e -> "HANDOVER".equals(e.getLoaiSuKien()))))
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_ALREADY_COMPLETED, "su_kien", "WARRANTY_ALREADY_COMPLETED");
    var custody = history.latestSection(events, "noi_dang_giu");
    if (custody == null
        || history.id(custody.get("thiet_bi_id")) == null
        || !devices.containsKey(history.id(custody.get("thiet_bi_id")))) throw transition();
    if (!cost)
      for (var device : devices.values())
        if (device.getSoSerial() != null
            && device.getSoSerial().getTrangThai() != TrangThaiSerial.DANG_BAO_HANH)
          throw transition();
    OffsetDateTime at =
        input.get("thoi_diem") instanceof OffsetDateTime time
            ? time
            : OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    if (ticket.getNgayTiepNhan() == null
        || at.isBefore(WarrantyReadValidation.time(ticket.getNgayTiepNhan()))) throw transition();
    for (var event : events) {
      var data = history.payload(event);
      OffsetDateTime previous = history.time(data.get("thoi_diem"));
      for (String section : List.of("trang_thai", "giao_nhan", "cong_viec_da_bat_dau")) {
        var saved = history.object(data.get(section));
        OffsetDateTime candidate =
            history.time(
                saved == null
                    ? null
                    : saved.get(section.equals("giao_nhan") ? "ngay" : "thoi_diem"));
        if (candidate != null && (previous == null || candidate.isAfter(previous)))
          previous = candidate;
      }
      if (previous != null && at.isBefore(previous)) throw transition();
    }
    Map<String, Object> payload = fields("su_kien", eventType, "thoi_diem", at.toString());
    Map<String, Object> extra = new LinkedHashMap<>();
    String message;
    switch (eventType) {
      case "GHI_KET_LUAN" -> {
        requireState(
            ticket,
            TrangThaiBaoHanh.DANG_KIEM_TRA,
            TrangThaiBaoHanh.DANG_BAO_HANH,
            TrangThaiBaoHanh.DA_NHAN_LAI);
        requireLocation(custody, "CUA_HANG", "DON_VI_BAO_HANH");
        var conclusion =
            fields(
                "noi_dung",
                input.get("noi_dung"),
                "hang_muc",
                input.get("hang_muc"),
                "bang_chung_urls",
                input.get("bang_chung_urls"));
        payload.put("ket_luan", conclusion);
        extra.put("ket_luan", conclusion);
        ticket.setKetLuanKiemTra(input.get("noi_dung").toString());
        boolean free =
            items(input, "hang_muc").stream()
                .anyMatch(
                    i ->
                        "DU_DIEU_KIEN".equals(i.get("dieu_kien_bao_hanh"))
                            || "CUA_HANG".equals(i.get("ben_chiu_phi")));
        boolean paid =
            items(input, "hang_muc").stream()
                .anyMatch(i -> "KHACH_HANG".equals(i.get("ben_chiu_phi")));
        message =
            free && paid
                ? "Lưu kết luận miễn phí và có phí trên cùng thiết bị"
                : "Lưu kết luận kiểm tra theo hạng mục";
      }
      case "GHI_CHI_PHI_DON_VI" -> {
        Long supplierId = (Long) input.get("nha_cung_cap_id");
        repository.supplier(supplierId, !complete);
        boolean confirmed = Boolean.TRUE.equals(input.get("xac_nhan_nghia_vu"));
        BigDecimal quote =
            items(input, "hang_muc").stream()
                .map(i -> (BigDecimal) i.get("chi_phi"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (quote.precision() > 15) throw WarrantyEventValidation.invalid();
        var report =
            fields(
                "nha_cung_cap_id",
                supplierId,
                "hang_muc",
                input.get("hang_muc"),
                "tong_bao_phi",
                quote,
                "da_xac_nhan",
                confirmed,
                "can_cu",
                input.get("can_cu"),
                "chung_tu_urls",
                input.get("chung_tu_urls"));
        payload.put("bao_phi_don_vi", report);
        if (confirmed) ticket.setChiPhiNccXacNhan(confirmedCosts(ticket, events, report));
        Map<String, Object> balance = supplierBalance(ticket);
        extra.put("chi_phi_don_vi", balance);
        extra.put("phieu_thu_chi_id", null);
        if (!confirmed) {
          extra.put(
              "bao_phi_don_vi",
              fields("nha_cung_cap_id", supplierId, "tong_bao_phi", quote, "da_xac_nhan", false));
          message = "Lưu báo phí chưa xác nhận nghĩa vụ";
        } else if (complete && ((BigDecimal) balance.get("con_phai_nhan_hoan")).signum() > 0)
          message = "Giảm chi phí sau đã chi, phát sinh cần NCC hoàn";
        else if (complete) message = "Xác nhận chi phí còn phải trả sau bàn giao";
        else
          message =
              "Xác nhận chi phí đơn vị"
                  + ticket.getChiPhiNccXacNhan().stripTrailingZeros().toPlainString();
      }
      case "GUI_DON_VI" -> {
        requireState(ticket, TrangThaiBaoHanh.DANG_KIEM_TRA);
        requireLocation(custody, "CUA_HANG");
        Long deviceId = (Long) input.get("thiet_bi_id");
        if (!devices.containsKey(deviceId)) throw referenceDevice(deviceId);
        if (!deviceId.equals(ticket.getThietBi().getId())
            || !deviceId.equals(history.id(custody.get("thiet_bi_id")))) throw transition();
        Long supplierId = (Long) input.get("nha_cung_cap_id");
        repository.supplier(supplierId, true);
        var transfer = new LinkedHashMap<>(input);
        transfer.put("ngay", at.toString());
        transfer.put("da_gui_thuc_te", true);
        transfer.put("don_vi_da_xac_nhan_nhan", false);
        payload.put("giao_nhan", transfer);
        extra.put(
            "giao_nhan",
            fields(
                "thiet_bi_id",
                deviceId,
                "phu_kien",
                input.get("phu_kien"),
                "chung_tu_urls",
                input.get("chung_tu_urls"),
                "da_gui_thuc_te",
                true,
                "don_vi_da_xac_nhan_nhan",
                false));
        custody =
            fields(
                "loai", "DANG_VAN_CHUYEN", "thiet_bi_id", deviceId, "nha_cung_cap_id", supplierId);
        payload.put("noi_dang_giu", custody);
        payload.put("san_sang_tra", null);
        ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DA_GUI_BAO_HANH);
        message = "Ghi nhận gửi thiết bị ra đơn vị";
      }
      case "DON_VI_TIEP_NHAN" -> {
        requireState(ticket, TrangThaiBaoHanh.DA_GUI_BAO_HANH);
        requireLocation(custody, "DANG_VAN_CHUYEN");
        var trip = trip(events, (Long) input.get("lan_gui_lich_su_id"));
        checkTripCustody(trip, custody);
        var transfer = new LinkedHashMap<>(input);
        transfer.put("thiet_bi_id", trip.get("thiet_bi_id"));
        transfer.put("ngay", at.toString());
        transfer.put("da_tiep_nhan", true);
        payload.put("giao_nhan", transfer);
        extra.put(
            "giao_nhan",
            fields(
                "lan_gui_lich_su_id",
                input.get("lan_gui_lich_su_id"),
                "nguoi_nhan",
                input.get("nguoi_nhan"),
                "da_tiep_nhan",
                true));
        extra.put("da_cap_phep_cong_viec_co_phi", false);
        custody =
            fields(
                "loai",
                "DON_VI_BAO_HANH",
                "thiet_bi_id",
                trip.get("thiet_bi_id"),
                "nha_cung_cap_id",
                trip.get("nha_cung_cap_id"));
        payload.put("noi_dang_giu", custody);
        ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DANG_BAO_HANH);
        message = "Đơn vị xác nhận đã nhận thiết bị";
      }
      case "BAT_DAU_CONG_VIEC" -> {
        // API E06/E15 adopts the Ext6 shop-processing branch explicitly, without a fake send.
        requireState(ticket, TrangThaiBaoHanh.DANG_KIEM_TRA, TrangThaiBaoHanh.DANG_BAO_HANH);
        String place = input.get("noi_xu_ly").toString();
        requireLocation(custody, place);
        if (place.equals("DON_VI_BAO_HANH")
            && ticket.getTrangThaiXuLy() != TrangThaiBaoHanh.DANG_BAO_HANH) throw transition();
        Long version = (Long) input.get("phien_ban_bao_gia");
        Map<String, Object> started;
        if (version != null) {
          extra.put(
              "dieu_kien_dat_coc",
              work.paid(
                  ticket, events, version.intValue(), ids(input, "chi_tiet_phi_ids"), at, true));
          started =
              fields(
                  "phien_ban_bao_gia", version, "chi_tiet_phi_ids", input.get("chi_tiet_phi_ids"));
          message =
              place.equals("CUA_HANG")
                  ? "Bắt đầu sửa có phí tại cửa hàng"
                  : "Bắt đầu công việc có phí đã được duyệt ở đơn vị";
        } else {
          work.free(events, (Long) input.get("ket_luan_lich_su_id"), strings(input, "ma_hang_muc"));
          started =
              fields(
                  "ket_luan_lich_su_id",
                  input.get("ket_luan_lich_su_id"),
                  "ma_hang_muc",
                  input.get("ma_hang_muc"),
                  "mien_phi",
                  true);
          extra.put("hoa_don_id", null);
          message =
              place.equals("CUA_HANG")
                  ? "Bắt đầu hạng mục miễn phí tại cửa hàng"
                  : "Bắt đầu hạng mục miễn phí tại đơn vị";
        }
        extra.put("cong_viec_da_bat_dau", started);
        var saved = new LinkedHashMap<>(started);
        saved.put("noi_xu_ly", place);
        saved.put("thoi_diem", at.toString());
        saved.put("ghi_chu", input.get("ghi_chu"));
        payload.put("cong_viec_da_bat_dau", saved);
        payload.put("san_sang_tra", null);
        ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DANG_BAO_HANH);
      }
      case "CAP_NHAT_TIEN_DO" -> {
        requireState(ticket, TrangThaiBaoHanh.DANG_BAO_HANH);
        requireLocation(custody, "CUA_HANG", "DON_VI_BAO_HANH");
        work.progress(
            ticket, events, ids(input, "chi_tiet_phi_ids"), at, custody.get("loai").toString());
        var progress =
            fields(
                "noi_dung",
                input.get("noi_dung"),
                "chi_tiet_phi_ids",
                input.get("chi_tiet_phi_ids"),
                "bang_chung_urls",
                input.get("bang_chung_urls"));
        payload.put("tien_do", progress);
        extra.put("tien_do", progress);
        message = "Lưu tiến độ công việc đang xử lý";
      }
      case "YEU_CAU_DUNG" -> {
        requireState(
            ticket,
            TrangThaiBaoHanh.DANG_KIEM_TRA,
            TrangThaiBaoHanh.DA_GUI_BAO_HANH,
            TrangThaiBaoHanh.DANG_BAO_HANH,
            TrangThaiBaoHanh.DA_NHAN_LAI,
            TrangThaiBaoHanh.CHO_TRA_KHACH);
        requireLocation(custody, "CUA_HANG", "DON_VI_BAO_HANH", "DANG_VAN_CHUYEN");
        boolean outside = !"CUA_HANG".equals(custody.get("loai"));
        var stop = fields("ly_do", input.get("ly_do"), "phan_chua_thuc_hien_dung", true);
        payload.put("yeu_cau_dung", stop);
        payload.put("bang_chung_urls", input.get("bang_chung_urls"));
        payload.put("san_sang_tra", null);
        extra.put("yeu_cau_dung", stop);
        extra.put("can_thu_hoi", outside);
        extra.put("co_the_san_sang_tra", false);
        if (!outside) ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DANG_KIEM_TRA);
        message =
            outside
                ? "Ghi nhận yêu cầu dừng khi thiết bị ở đơn vị"
                : "Ghi nhận dừng khi thiết bị đang tại cửa hàng";
      }
      case "YEU_CAU_THU_HOI" -> {
        requireState(ticket, TrangThaiBaoHanh.DA_GUI_BAO_HANH, TrangThaiBaoHanh.DANG_BAO_HANH);
        requireLocation(custody, "DON_VI_BAO_HANH", "DANG_VAN_CHUYEN");
        checkTripCustody(trip(events, (Long) input.get("lan_gui_lich_su_id")), custody);
        var recall =
            fields(
                "lan_gui_lich_su_id", input.get("lan_gui_lich_su_id"), "ly_do", input.get("ly_do"));
        payload.put("yeu_cau_thu_hoi", recall);
        payload.put("chung_tu_urls", input.get("chung_tu_urls"));
        extra.put("yeu_cau_thu_hoi", recall);
        extra.put("da_nhan_lai", false);
        extra.put("co_the_san_sang_tra", false);
        message = "Yêu cầu thu hồi, chưa nhận lại thiết bị";
      }
      case "NHAN_LAI" -> {
        requireState(
            ticket,
            TrangThaiBaoHanh.DA_GUI_BAO_HANH,
            TrangThaiBaoHanh.DANG_BAO_HANH,
            TrangThaiBaoHanh.CHO_DOI_SAN_PHAM);
        var trip = trip(events, (Long) input.get("lan_gui_lich_su_id"));
        Long expected = history.id(trip.get("thiet_bi_id"));
        Long chosen = (Long) input.get("thiet_bi_id");
        if (!devices.containsKey(chosen)) throw referenceDevice(chosen);
        if (!expected.equals(chosen) || !chosen.equals(ticket.getThietBi().getId()))
          throw transition();
        Map<String, Object> oldLocation = custody;
        if (!expected.equals(history.id(custody.get("thiet_bi_id"))))
          oldLocation = history.latestSection(events, "noi_dang_giu_thiet_bi_cu");
        if (oldLocation == null) throw transition();
        requireLocation(oldLocation, "DON_VI_BAO_HANH", "DANG_VAN_CHUYEN");
        checkTripCustody(trip, oldLocation);
        ThietBiBaoHanh device = devices.get(chosen);
        String expectedSerial =
            device.getSoSerial() == null ? null : device.getSoSerial().getSoSerial();
        String actualSerial = (String) input.get("so_serial_thuc_nhan");
        boolean correct = Objects.equals(expectedSerial, actualSerial);
        List<Map<String, Object>> differences = new ArrayList<>(items(input, "sai_lech"));
        if (!correct)
          addDifference(differences, "SAI_THIET_BI", "Serial nhận không khớp serial gửi");
        var sentAccessories = quantities(trip.get("phu_kien"));
        var returnedAccessories = quantities(input.get("phu_kien"));
        boolean missing =
            sentAccessories.entrySet().stream()
                .anyMatch(e -> returnedAccessories.getOrDefault(e.getKey(), 0L) < e.getValue());
        boolean extraAccessories =
            returnedAccessories.entrySet().stream()
                .anyMatch(e -> sentAccessories.getOrDefault(e.getKey(), 0L) < e.getValue());
        if (missing) addDifference(differences, "THIEU_PHU_KIEN", "Chưa nhận đủ phụ kiện đã gửi");
        if (extraAccessories)
          addDifference(differences, "THUA_PHU_KIEN", "Phụ kiện thực nhận khác lần gửi");
        if (differences.stream().anyMatch(d -> "SAI_THIET_BI".equals(d.get("loai"))))
          correct = false;
        var actual =
            fields(
                "thiet_bi_id",
                correct ? chosen : null,
                "so_serial",
                actualSerial,
                "tinh_trang",
                input.get("tinh_trang"),
                "phu_kien",
                input.get("phu_kien"));
        var transfer = new LinkedHashMap<>(input);
        transfer.put("ngay", at.toString());
        transfer.put("hang_thuc_nhan", actual);
        transfer.put("da_nhan_dung_thiet_bi", correct);
        transfer.put("sai_lech", differences);
        payload.put("giao_nhan", transfer);
        payload.put("san_sang_tra", null);
        // A wrong item is physically at the shop, but is NOT assigned the expected device ID.
        payload.put("vat_thuc_nhan", fields("noi_luu", "CUA_HANG", "hang_thuc_nhan", actual));
        extra.put("hang_thuc_nhan", actual);
        extra.put("da_nhan_dung_thiet_bi", correct);
        extra.put("sai_lech", differences);
        extra.put("co_the_san_sang_tra", false);
        if (correct) {
          var shop = fields("loai", "CUA_HANG", "thiet_bi_id", chosen);
          if (expected.equals(history.id(custody.get("thiet_bi_id")))) {
            custody = shop;
            payload.put("noi_dang_giu", shop);
          } else payload.put("noi_dang_giu_thiet_bi_cu", shop);
          ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DA_NHAN_LAI);
          message =
              missing
                  ? "Đã nhận đúng thiết bị nhưng thiếu phụ kiện"
                  : "Nhận lại đúng thiết bị, chờ kiểm tra sau nhận";
          if (!differences.isEmpty())
            extra.put(
                "canh_bao",
                List.of(
                    missing
                        ? sentAccessories.getOrDefault("hộp", 0L)
                                > returnedAccessories.getOrDefault("hộp", 0L)
                            ? "Đã nhận đúng thiết bị nhưng còn thiếu hộp"
                            : "Đã nhận đúng thiết bị nhưng còn thiếu phụ kiện"
                        : "Đã nhận thiết bị nhưng còn sai lệch cần xử lý"));
        } else {
          message = "Đã lưu lần nhận sai thiết bị, tiếp tục bị chặn bàn giao";
          extra.put(
              "canh_bao",
              List.of("Đã lưu vật thực nhận; device" + chosen + " chưa được chứng minh đã về"));
        }
      }
      default -> throw WarrantyEventValidation.invalid();
    }
    var event =
        workflow.append(ticket, actorId, eventType, message, mapper.writeValueAsString(payload));
    if (eventType.equals("GHI_KET_LUAN"))
      mutableSection(payload, "ket_luan").put("lich_su_id", event.getId());
    if (eventType.equals("GUI_DON_VI")) {
      mutableSection(payload, "giao_nhan").put("lan_gui_lich_su_id", event.getId());
      mutableSection(extra, "giao_nhan").put("lan_gui_lich_su_id", event.getId());
    }
    if (eventType.equals("NHAN_LAI")) {
      List<Map<String, Object>> persisted = new ArrayList<>();
      int index = 0;
      for (var difference : items(inputFromPayload(payload), "sai_lech")) {
        var item = new LinkedHashMap<>(difference);
        item.put("id", Math.addExact(Math.multiplyExact(event.getId(), 1000L), ++index));
        item.put("da_xu_ly", false);
        item.put("thiet_bi_id", input.get("thiet_bi_id"));
        persisted.add(item);
      }
      mutableSection(payload, "giao_nhan").put("sai_lech", persisted);
    }
    event.setDuLieuChiTiet(mapper.writeValueAsString(payload));
    repository.finish(ticket, at.toLocalDateTime());
    AdminWarrantyEventResponse response = new AdminWarrantyEventResponse();
    response.putAll(
        fields(
            "id",
            id,
            "su_kien",
            eventType,
            "lich_su_id",
            event.getId(),
            "trang_thai_xu_ly",
            ticket.getTrangThaiXuLy().name(),
            "ket_qua_xu_ly",
            ticket.getKetQuaXuLy().name(),
            "noi_dang_giu",
            custody,
            "chi_phi_ncc_xac_nhan",
            ticket.getChiPhiNccXacNhan(),
            "ngay_cap_nhat",
            at));
    response.putAll(extra);
    return mutations.complete(replay, 200, message, response);
  }

  private Map<String, Object> inputFromPayload(Map<String, Object> payload) {
    return history.object(payload.get("giao_nhan"));
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> mutableSection(Map<String, Object> payload, String key) {
    return (Map<String, Object>) payload.get(key);
  }

  private Map<String, Object> trip(List<LichSuBaoHanh> events, Long id) {
    var root =
        events.stream()
            .filter(e -> id.equals(e.getId()))
            .findFirst()
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.NOT_FOUND, "lan_gui_lich_su_id", "SEND_EVENT_NOT_FOUND"));
    if (!"GUI_DON_VI".equals(root.getLoaiSuKien())) throw transition();
    var result = history.object(history.payload(root).get("giao_nhan"));
    if (result == null
        || history.id(result.get("thiet_bi_id")) == null
        || history.id(result.get("nha_cung_cap_id")) == null)
      throw WarrantyEventWorkAuthorization.invalidHistory();
    for (var event : events) {
      var transfer = history.object(history.payload(event).get("giao_nhan"));
      if (event.getId() > id
          && "GUI_DON_VI".equals(event.getLoaiSuKien())
          && transfer != null
          && Objects.equals(
              history.id(transfer.get("thiet_bi_id")), history.id(result.get("thiet_bi_id"))))
        throw transition();
      if (transfer != null
          && id.equals(history.id(transfer.get("lan_gui_lich_su_id")))
          && "NHAN_LAI".equals(event.getLoaiSuKien())
          && Boolean.TRUE.equals(transfer.get("da_nhan_dung_thiet_bi"))) throw transition();
    }
    return result;
  }

  private void checkTripCustody(Map<String, Object> trip, Map<String, Object> custody) {
    if (!Objects.equals(history.id(trip.get("thiet_bi_id")), history.id(custody.get("thiet_bi_id")))
        || !Objects.equals(
            history.id(trip.get("nha_cung_cap_id")), history.id(custody.get("nha_cung_cap_id"))))
      throw transition();
  }

  private BigDecimal confirmedCosts(
      PhieuBaoHanh ticket, List<LichSuBaoHanh> events, Map<String, Object> update) {
    Map<String, BigDecimal> costs = new LinkedHashMap<>();
    for (var event : events) {
      var report = history.object(history.payload(event).get("bao_phi_don_vi"));
      if (report != null && Boolean.TRUE.equals(report.get("da_xac_nhan")))
        mergeCosts(costs, report);
    }
    BigDecimal previous = costs.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    if (ticket.getChiPhiNccXacNhan() != null
        && ticket.getChiPhiNccXacNhan().compareTo(previous) != 0)
      throw new AppException(
          ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA,
          "Chi phí cũ thiếu snapshot theo đơn vị/hạng mục; không tự ghi đè nghĩa vụ.");
    mergeCosts(costs, update);
    BigDecimal result = costs.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    if (result.precision() > 15) throw WarrantyEventValidation.invalid();
    return result;
  }

  private void mergeCosts(Map<String, BigDecimal> costs, Map<String, Object> report) {
    Long supplier = history.id(report.get("nha_cung_cap_id"));
    if (supplier == null) throw WarrantyEventWorkAuthorization.invalidHistory();
    for (Object raw : history.array(report.get("hang_muc"))) {
      var item = history.object(raw);
      String code = item == null ? null : history.text(item.get("ma_hang_muc"));
      if (code == null || !(item.get("chi_phi") instanceof Number))
        throw WarrantyEventWorkAuthorization.invalidHistory();
      BigDecimal value = new BigDecimal(item.get("chi_phi").toString());
      if (value.signum() < 0) throw WarrantyEventWorkAuthorization.invalidHistory();
      costs.put(supplier + ":" + code, value);
    }
  }

  private Map<String, Object> supplierBalance(PhieuBaoHanh ticket) {
    BigDecimal paid = BigDecimal.ZERO, refunded = BigDecimal.ZERO;
    for (var cash : details.findPostedMoney(ticket.getId())) {
      if (cash.getHoaDonBaoHanh() != null
          || cash.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN) continue;
      if (cash.getPhieuBaoHanh() == null
          || !ticket.getId().equals(cash.getPhieuBaoHanh().getId())
          || cash.getNhaCungCap() == null
          || cash.getNhomNguoiNopNhan() != NhomNguoiNopNhanEnum.NHA_CUNG_CAP)
        throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
      WarrantyFinanceCalculator.validateMoney(cash);
      if (cash.getLoaiPhieu() == LoaiPhieuThuChi.CHI) paid = paid.add(cash.getSoTien());
      else refunded = refunded.add(cash.getSoTien());
    }
    if (refunded.compareTo(paid) > 0)
      throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    BigDecimal confirmed = ticket.getChiPhiNccXacNhan();
    return fields(
        "chi_phi_ncc_xac_nhan",
        confirmed,
        "da_chi",
        paid,
        "da_nhan_hoan",
        refunded,
        "con_phai_chi",
        confirmed == null ? null : confirmed.subtract(paid.subtract(refunded)).max(BigDecimal.ZERO),
        "con_phai_nhan_hoan",
        confirmed == null
            ? null
            : paid.subtract(refunded).subtract(confirmed).max(BigDecimal.ZERO));
  }

  private static Map<String, Long> quantities(Object raw) {
    Map<String, Long> result = new LinkedHashMap<>();
    if (!(raw instanceof List<?> list)) throw WarrantyEventWorkAuthorization.invalidHistory();
    for (Object value : list) {
      var item = WarrantyEventValidation.object(value);
      String name = WarrantyEventValidation.text(item.get("ten"), true, 255);
      Long quantity =
          WarrantyWriteValidation.id(
              item.get("so_luong"), true, ErrorCode.INVALID_WARRANTY_HISTORY);
      result.merge(name.strip().toLowerCase(Locale.ROOT), quantity, Math::addExact);
    }
    return result;
  }

  private static void addDifference(List<Map<String, Object>> list, String type, String text) {
    if (list.stream().noneMatch(i -> type.equals(i.get("loai"))))
      list.add(fields("loai", type, "noi_dung", text));
  }

  private RuntimeException referenceDevice(Long id) {
    if (!workflow.deviceExists(id))
      return WarrantyReadException.notFound(
          ErrorCode.WARRANTY_DEVICE_NOT_FOUND, "thiet_bi_id", "WARRANTY_DEVICE_NOT_FOUND");
    return transition();
  }

  private static void requireState(PhieuBaoHanh ticket, TrangThaiBaoHanh... allowed) {
    if (!Set.of(allowed).contains(ticket.getTrangThaiXuLy())) throw transition();
  }

  private static void requireLocation(Map<String, Object> location, String... allowed) {
    if (!Set.of(allowed).contains(location.get("loai"))) throw transition();
  }

  private static AppException transition() {
    return new AppException(ErrorCode.WARRANTY_EVENT_TRANSITION_INVALID);
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> items(Map<String, Object> data, String key) {
    return (List<Map<String, Object>>) data.get(key);
  }

  @SuppressWarnings("unchecked")
  private static List<Long> ids(Map<String, Object> data, String key) {
    return (List<Long>) data.get(key);
  }

  @SuppressWarnings("unchecked")
  private static List<String> strings(Map<String, Object> data, String key) {
    return (List<String>) data.get(key);
  }
}
