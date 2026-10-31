package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyHandoverChecks.notReady;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.invalidHistory;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyHandoverResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class WarrantyHandoverTransactions {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;
  private final WarrantyHandoverRepository repository;
  private final WarrantyDeviceResolver resolver;
  private final WarrantyReplacementTransactions plans;
  private final WarrantyReplacementResources resources;
  private final WarrantyHandoverChecks checks;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyHandoverResponse> apply(
      Long id, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-HAND-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/" + id + "/handover",
            input,
            AdminWarrantyHandoverResponse.class,
            WarrantyHandoverValidation.INVALID);
    if (replay.previous() != null) return replay.previous();
    var origin = workflow.ticketOrigin(id);
    var order = locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    var ticket = workflow.lockTicket(id);
    if (ticket.getDonHang() == null
        || ticket.getThietBi() == null
        || ticket.getThietBi().getChiTietDonHang() == null
        || !origin.orderId().equals(ticket.getDonHang().getId())
        || !origin.lineId().equals(ticket.getThietBi().getChiTietDonHang().getId()))
      throw invalidHistory();
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT
        || ticket.getKetQuaXuLy() == KetQuaXuLyBaoHanh.DOI_SAN_PHAM
        || events.stream().anyMatch(e -> "HANDOVER".equals(e.getLoaiSuKien()))) throw already();
    Long selected = (Long) input.get("thiet_bi_ban_giao_id");
    if (!workflow.deviceExists(selected))
      throw WarrantyReadException.notFound(
          ErrorCode.WARRANTY_DEVICE_NOT_FOUND, "thiet_bi_ban_giao_id", "WARRANTY_DEVICE_NOT_FOUND");
    var devices = new TreeMap<Long, ThietBiBaoHanh>();
    devices.put(ticket.getThietBi().getId(), ticket.getThietBi());
    if (ticket.getThietBiThayThe() != null)
      devices.put(ticket.getThietBiThayThe().getId(), ticket.getThietBiThayThe());
    for (Long deviceId : new ArrayList<>(devices.keySet())) {
      var device = locks.lockDevice(deviceId);
      if (device == null
          || device.getChiTietDonHang() == null
          || !origin.lineId().equals(device.getChiTietDonHang().getId())
          || device.getChiTietTraHang() != null) throw notReady();
      devices.put(deviceId, device);
    }
    var serials = new TreeMap<Long, SoSerialSanPham>();
    for (var device : devices.values())
      if (device.getSoSerial() != null)
        serials.put(device.getSoSerial().getId(), device.getSoSerial());
    for (Long serialId : new ArrayList<>(serials.keySet()))
      serials.put(serialId, locks.lockSerial(serialId));
    if (repository.usedByAnotherOpenTicket(id, new ArrayList<>(devices.keySet()))) throw notReady();
    var original = devices.get(ticket.getThietBi().getId());
    if (ticket.getThietBiThayThe() != null
        && (original.getId().equals(ticket.getThietBiThayThe().getId())
            || original.getSoSerial() != null
                && ticket.getThietBiThayThe().getSoSerial() != null
                && original
                    .getSoSerial()
                    .getId()
                    .equals(ticket.getThietBiThayThe().getSoSerial().getId()))) throw notReady();
    var current = resolver.resolve(original);
    if (!current.hienHanh()
        || current.thietBiHienHanh() == null
        || !original.getId().equals(current.thietBiHienHanh().getId())
        || current.lyDoChan().stream()
            .anyMatch(reason -> !"WARRANTY_DEVICE_LOCKED".equals(reason.code()))) throw notReady();
    boolean exchange = ticket.getThietBiThayThe() != null;
    var returning = exchange ? devices.get(ticket.getThietBiThayThe().getId()) : original;
    if (!returning.getId().equals(selected)) throw notReady();
    OffsetDateTime at = (OffsetDateTime) input.get("thoi_diem");
    var ready = checks.readiness(ticket, input, events, at);
    Map<String, Object> plan = null;
    Long issue = null;
    if (exchange) {
      var versions = plans.versions(events);
      Long version = (Long) input.get("phien_ban_phuong_an");
      if (version == null) throw notReady();
      if (!versions.containsKey(version.intValue()))
        throw WarrantyReadException.notFound(
            ErrorCode.NOT_FOUND, "phien_ban_phuong_an", "REPLACEMENT_VERSION_NOT_FOUND");
      if (versions.lastKey().longValue() != version
          || !version.equals(history.id(ready.get("phien_ban_phuong_an")))) throw notReady();
      plan = new LinkedHashMap<>(versions.lastEntry().getValue());
      validatePlan(ticket, returning, plan, events, at);
      var state = resources.state(ticket, plan, events);
      if (state.replacement() == null
          || !selected.equals(state.replacement().getId())
          || state.held()) throw notReady();
      boolean shop = "TON_KHO_CUA_HANG".equals(plan.get("nguon"));
      if (shop) {
        if (state.issue() == null) throw notReady();
        issue = state.issue().getId();
        var export = history.latestSection(events, "xuat_hang_doi");
        if (export == null
            || !selected.equals(history.id(export.get("thiet_bi_id")))
            || !issue.equals(history.id(export.get("giao_dich_xuat_the_kho_id")))) throw notReady();
      } else {
        if (!"DON_VI_BAO_HANH".equals(plan.get("nguon")) || state.issue() != null) throw notReady();
        boolean received = false;
        for (var event : events) {
          var receipt = history.object(history.payload(event).get("nhan_hang_don_vi"));
          if (receipt != null
              && selected.equals(history.id(receipt.get("thiet_bi_id")))
              && version.equals(history.id(receipt.get("phien_ban_phuong_an")))
              && Boolean.TRUE.equals(receipt.get("da_cap_cho_phuong_an"))) received = true;
        }
        if (!received) throw notReady();
      }
      plans.requireQuoteConsent(ticket, events, plan, at);
    } else {
      if (input.get("phien_ban_phuong_an") != null) throw notReady();
      if (!Set.of(
              KetQuaXuLyBaoHanh.SUA_THANH_CONG,
              KetQuaXuLyBaoHanh.KHONG_SUA_DUOC,
              KetQuaXuLyBaoHanh.KHONG_THUC_HIEN_SUA)
          .contains(ticket.getKetQuaXuLy())) throw notReady();
      if (ticket.getKetQuaXuLy() != KetQuaXuLyBaoHanh.SUA_THANH_CONG
          && history.text(ready.get("ly_do")) == null) throw notReady();
      var versions = plans.versions(events);
      if (!versions.isEmpty()) {
        var latest = versions.lastEntry().getValue();
        if (!Boolean.TRUE.equals(latest.get("da_huy"))
            || resources.state(ticket, latest, events).hasResources()) throw notReady();
      }
    }
    validateSerial(original, serials, origin.orderId(), false);
    if (exchange) validateSerial(returning, serials, origin.orderId(), true);
    var payment = checks.payment(ticket, input, events, at);
    var settlements = new WarrantySupplierSettlementSnapshots(history);
    var obligations = settlements.load(events);
    for (var value : obligations.values())
      settlements.reconcileMoney(value, events, details.findPostedMoney(id));
    boolean settlementOpen =
        obligations.values().stream().anyMatch(v -> !Boolean.TRUE.equals(v.get("da_giai_quyet")));
    var oldCustody = exchange ? oldCustody(events, original.getId()) : null;
    if (exchange && oldCustody == null) throw notReady();
    if (exchange && obligations.isEmpty() && !"DON_VI_BAO_HANH".equals(oldCustody.get("loai")))
      settlementOpen = true;
    OffsetDateTime expiry =
        exchange ? history.time(plan.get("han_bao_hanh_ap_dung")) : expiry(original, events);
    var originalSerial =
        original.getSoSerial() == null ? null : serials.get(original.getSoSerial().getId());
    if (originalSerial != null)
      originalSerial.setTrangThai(
          exchange ? TrangThaiSerial.DA_THAY_THE_BAO_HANH : TrangThaiSerial.DA_BAN);
    if (exchange) {
      // Chỉ chuyển quyền tại bàn giao; giữ nguyên lịch sử đơn và không xuất kho lần nữa.
      returning.setNgayKichHoat(at.toLocalDateTime());
      returning.setHanBaoHanh(expiry.toLocalDateTime());
      if (returning.getSoSerial() != null) {
        var serial = serials.get(returning.getSoSerial().getId());
        serial.setTrangThai(TrangThaiSerial.DA_BAN);
        serial.setDonHang(order);
        serial.setNgayKichHoat(at.toLocalDateTime());
        serial.setHanBaoHanh(expiry.toLocalDateTime());
      }
      plan.put("da_ban_giao", true);
      ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.DOI_SAN_PHAM);
    }
    ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
    var handover = new LinkedHashMap<>(input);
    handover.put("thoi_diem", at.toString());
    handover.putAll(
        fields(
            "su_kien",
            "HANDOVER",
            "ngay",
            at.toString(),
            "thiet_bi_id",
            selected,
            "thiet_bi_cu_id",
            original.getId(),
            "thiet_bi_thay_the_id",
            exchange ? selected : null,
            "thiet_bi_hien_hanh_id",
            selected,
            "han_bao_hanh_ap_dung",
            expiry == null ? null : expiry.toString(),
            "nguoi_thuc_hien_id",
            actorId));
    var payload =
        fields(
            "thoi_diem",
            at.toString(),
            "giao_nhan",
            handover,
            "ban_giao",
            handover,
            "ngay_hoan_tat",
            at.toString(),
            "noi_dang_giu",
            fields("loai", "KHACH_HANG", "thiet_bi_id", selected),
            "thiet_bi_hien_hanh",
            fields(
                "id",
                selected,
                "ma_theo_doi",
                returning.getMaTheoDoi(),
                "han_bao_hanh",
                expiry == null ? null : expiry.toString()),
            "da_giai_phong_khoa",
            true,
            "khoa_thiet_bi",
            false,
            "so_luong_quyen_dang_khoa",
            0,
            "doi_soat_ncc_con_mo",
            settlementOpen,
            "san_sang_tra",
            null);
    if (exchange) {
      payload.put("phuong_an_doi", plan);
      payload.put("noi_dang_giu_thiet_bi_cu", oldCustody);
    }
    String message =
        message(ticket, exchange, returning.getSoSerial() != null, plan, payment, settlementOpen);
    var event =
        workflow.append(ticket, actorId, "HANDOVER", message, mapper.writeValueAsString(payload));
    if (event == null || event.getId() == null) throw invalidHistory();
    repository.flush();
    var data = new AdminWarrantyHandoverResponse();
    data.putAll(
        fields(
            "id",
            id,
            "ma_phieu",
            ticket.getMaPhieu(),
            "trang_thai_xu_ly",
            ticket.getTrangThaiXuLy(),
            "ket_qua_xu_ly",
            ticket.getKetQuaXuLy(),
            "thiet_bi_da_tra_id",
            selected,
            "serials",
            serials.values().stream()
                .map(
                    s ->
                        fields(
                            "id",
                            s.getId(),
                            "trang_thai",
                            s.getTrangThai(),
                            "don_hang_id",
                            s.getDonHang() == null ? null : s.getDonHang().getId()))
                .toList(),
            "da_giai_phong_khoa",
            true,
            "ngay_hoan_tat",
            at,
            "the_kho_moi",
            null,
            "con_phai_hoan",
            payment.refund(),
            "doi_soat_ncc_con_mo",
            settlementOpen,
            "lich_su_id",
            event.getId(),
            "thiet_bi_cu_id",
            original.getId(),
            "thiet_bi_thay_the_id",
            exchange ? selected : null,
            "thiet_bi_hien_hanh_id",
            selected,
            "han_bao_hanh_ap_dung",
            expiry,
            "con_phai_thu",
            payment.remaining(),
            "nguon_san_pham_thay_the",
            exchange ? plan.get("nguon") : null));
    if (payment.paymentStatus() != null) data.put("trang_thai_thanh_toan", payment.paymentStatus());
    if (payment.refund().signum() > 0) data.put("trang_thai_hoan_tien", payment.refundStatus());
    if (payment.debt() != null) data.put("phe_duyet_cong_no", payment.debt());
    if (exchange) {
      data.put("quyen_thiet_bi_cu_con_hieu_luc", false);
      data.put("giao_dich_xuat_da_co_id", issue);
      if (originalSerial == null) data.put("ma_theo_doi_cu", original.getMaTheoDoi());
      if (returning.getSoSerial() == null)
        data.put("ma_theo_doi_thay_the", returning.getMaTheoDoi());
    } else if (returning.getSoSerial() == null)
      data.put("ma_theo_doi_da_tra", returning.getMaTheoDoi());
    if (returning.getSoSerial() == null) data.put("khoa_thiet_bi_da_giai_phong", true);
    return mutations.complete(replay, 200, message, data);
  }

  private void validatePlan(
      PhieuBaoHanh ticket,
      ThietBiBaoHanh device,
      Map<String, Object> plan,
      List<LichSuBaoHanh> events,
      OffsetDateTime at) {
    if (!Boolean.TRUE.equals(plan.get("da_duyet"))
        || !Boolean.TRUE.equals(plan.get("khach_dong_y"))
        || Boolean.TRUE.equals(plan.get("da_huy"))
        || Boolean.TRUE.equals(plan.get("da_ban_giao"))
        || !ticket.getThietBi().getId().equals(history.id(plan.get("thiet_bi_cu_id")))
        || !device.getId().equals(history.id(plan.get("thiet_bi_thay_the_id")))
        || history.time(plan.get("han_bao_hanh_ap_dung")) == null) throw notReady();
    var approval = history.object(plan.get("phe_duyet"));
    var consent = history.object(plan.get("quyet_dinh"));
    Long approvalId = history.id(plan.get("lich_su_phe_duyet_id"));
    var saved =
        events.stream()
            .filter(e -> approvalId != null && approvalId.equals(e.getId()))
            .findFirst()
            .orElseThrow(WarrantyHandoverChecks::notReady);
    if (!"PHUONG_AN_DOI_PHE_DUYET".equals(saved.getLoaiSuKien())
        || saved.getNguoiThucHien() == null
        || approval == null
        || !saved.getNguoiThucHien().getId().equals(history.id(approval.get("nguoi_phe_duyet_id")))
        || history.text(approval.get("can_cu")) == null
        || consent == null
        || !"DONG_Y".equals(consent.get("quyet_dinh"))
        || history.time(consent.get("thoi_diem")) == null
        || history.time(consent.get("thoi_diem")).isAfter(at)
        || history.array(consent.get("bang_chung_urls")).isEmpty()) throw notReady();
  }

  private void validateSerial(
      ThietBiBaoHanh device, Map<Long, SoSerialSanPham> serials, Long order, boolean replacement) {
    if (device.getPhienBan() == null || device.getPhienBan().getCoQuanLySerial() == null)
      throw invalidHistory();
    if (Boolean.TRUE.equals(device.getPhienBan().getCoQuanLySerial())
        != (device.getSoSerial() != null)) throw notReady();
    if (device.getSoSerial() == null) {
      if (replacement && device.getNgayKichHoat() != null) throw notReady();
      return;
    }
    var serial = serials.get(device.getSoSerial().getId());
    if (serial == null
        || serial.getPhienBan() == null
        || !device.getPhienBan().getId().equals(serial.getPhienBan().getId())) throw notReady();
    if (replacement) {
      if (serial.getTrangThai() != TrangThaiSerial.GIU_CHO_BAO_HANH
              && serial.getTrangThai() != TrangThaiSerial.DANG_BAO_HANH
          || serial.getDonHang() != null
          || serial.getNgayKichHoat() != null
          || device.getNgayKichHoat() != null) throw notReady();
    } else if (serial.getTrangThai() != TrangThaiSerial.DANG_BAO_HANH
        || serial.getDonHang() == null
        || !order.equals(serial.getDonHang().getId())) throw notReady();
  }

  private OffsetDateTime expiry(ThietBiBaoHanh device, List<LichSuBaoHanh> events) {
    var expiry =
        WarrantyReadValidation.time(
            device.getSoSerial() == null
                ? device.getHanBaoHanh()
                : device.getSoSerial().getHanBaoHanh());
    if (expiry != null) return expiry;
    for (var event : events) {
      var value = history.object(history.payload(event).get("thiet_bi"));
      if (value != null
          && device.getId().equals(history.id(value.get("id")))
          && history.time(value.get("han_bao_hanh")) != null)
        expiry = history.time(value.get("han_bao_hanh"));
    }
    return expiry;
  }

  private Map<String, Object> oldCustody(List<LichSuBaoHanh> events, Long original) {
    Map<String, Object> result = null;
    for (var event : events)
      for (String key : List.of("noi_dang_giu", "noi_dang_giu_thiet_bi_cu")) {
        var value = history.object(history.payload(event).get(key));
        if (value != null && original.equals(history.id(value.get("thiet_bi_id")))) result = value;
      }
    return result;
  }

  private String message(
      PhieuBaoHanh ticket,
      boolean exchange,
      boolean managed,
      Map<String, Object> plan,
      WarrantyHandoverChecks.Payment payment,
      boolean open) {
    if (payment.debt() != null && payment.remaining().signum() > 0)
      return "Bàn giao với ngoại lệ công nợ hợp lệ";
    if (payment.refund().signum() > 0) return "Bàn giao xong, cửa hàng vẫn còn phải hoàn tiền";
    if (exchange) {
      if (!managed)
        return "TON_KHO_CUA_HANG".equals(plan.get("nguon")) && open
            ? "Bàn giao hàng kho đổi không serial, còn nghĩa vụ nhà cung cấp"
            : "Bàn giao sản phẩm đổi không serial";
      if ("DON_VI_BAO_HANH".equals(plan.get("nguon")))
        return "Bàn giao hàng hãng cấp riêng, không xuất tồn cửa hàng";
      return open
          ? "Bàn giao hàng kho đổi, chốt chuỗi quyền và còn đối soát"
          : "Bàn giao hàng kho đổi, chốt chuỗi quyền bảo hành";
    }
    return switch (ticket.getKetQuaXuLy()) {
      case KHONG_SUA_DUOC -> "Bàn giao thiết bị không sửa được";
      case KHONG_THUC_HIEN_SUA -> "Bàn giao thiết bị không thực hiện sửa";
      default ->
          managed
              ? "Bàn giao thiết bị cũ đã sửa thành công"
              : "Bàn giao thiết bị không serial đã sửa";
    };
  }

  private static WarrantyReadException already() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_HANDOVER_ALREADY_COMPLETED, "path.id", "WARRANTY_ALREADY_HANDED_OVER");
  }
}
