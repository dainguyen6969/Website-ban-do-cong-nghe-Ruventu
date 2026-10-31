package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.amount;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.invalidHistory;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.WarrantyDetailRepository;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WarrantyHandoverChecks {
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;
  private final AdminWarrantyStatusService status;

  public Map<String, Object> readiness(
      PhieuBaoHanh ticket,
      Map<String, Object> input,
      List<LichSuBaoHanh> events,
      OffsetDateTime at) {
    Long device = (Long) input.get("thiet_bi_ban_giao_id");
    var custody = history.latestSection(events, "noi_dang_giu");
    var ready = history.latestSection(events, "san_sang_tra");
    if (ticket.getTrangThaiXuLy() != TrangThaiBaoHanh.CHO_TRA_KHACH
        || custody == null
        || ready == null
        || !"CUA_HANG".equals(custody.get("loai"))
        || !device.equals(history.id(custody.get("thiet_bi_id")))
        || !"SAN_SANG_TRA".equals(ready.get("su_kien"))
        || !device.equals(history.id(ready.get("thiet_bi_se_tra_id")))
        || history.text(ready.get("can_cu_kiem_tra")) == null
        || history.text(ready.get("tinh_trang")) == null
        || !(ready.get("phu_kien") instanceof List<?>)
        || !Objects.equals(ticket.getKetQuaXuLy().name(), ready.get("ket_qua_sau")))
      throw notReady();
    var inspectedAt = history.time(ready.get("thoi_diem"));
    if (ticket.getNgayTiepNhan() == null
        || at.isBefore(WarrantyReadValidation.time(ticket.getNgayTiepNhan()))
        || inspectedAt == null
        || at.isBefore(inspectedAt)) throw notReady();
    for (var event : events) {
      var payload = history.payload(event);
      var eventAt = history.time(payload.get("thoi_diem"));
      if (eventAt != null && at.isBefore(eventAt)) throw notReady();
    }
    if (!accessories(ready.get("phu_kien")).equals(accessories(input.get("phu_kien"))))
      throw notReady();
    try {
      status.validateDiscrepancies(events, List.of(), device);
    } catch (AppException e) {
      if (e.getErrorCode() == ErrorCode.WARRANTY_HANDOVER_DEVICE_NOT_READY) throw notReady();
      throw e;
    }
    return ready;
  }

  private Map<String, Long> accessories(Object raw) {
    var result = new TreeMap<String, Long>();
    for (Object value : history.array(raw)) {
      var item = history.object(value);
      String name = item == null ? null : history.text(item.get("ten"));
      Long quantity = item == null ? null : history.id(item.get("so_luong"));
      if (name == null || name.isBlank() || quantity == null) throw invalidHistory();
      result.merge(name.strip().toLowerCase(Locale.ROOT), quantity, Math::addExact);
    }
    return result;
  }

  public record Payment(
      BigDecimal remaining,
      BigDecimal refund,
      TrangThaiThanhToanBaoHanh paymentStatus,
      TrangThaiHoanTienBaoHanh refundStatus,
      Map<String, Object> debt) {}

  public Payment payment(
      PhieuBaoHanh ticket,
      Map<String, Object> input,
      List<LichSuBaoHanh> events,
      OffsetDateTime at) {
    var invoices = details.findInvoices(ticket.getId());
    var cash = details.findPostedMoney(ticket.getId());
    var active =
        invoices.stream().filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC).toList();
    if (active.size() > 1) throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    var quotes =
        WarrantyQuoteSnapshots.load(history, ticket, events, details.findFees(ticket.getId()));
    var seen = new HashSet<Long>();
    BigDecimal refund = BigDecimal.ZERO;
    BigDecimal refunded = BigDecimal.ZERO;
    BigDecimal requiredRefund = BigDecimal.ZERO;
    for (var invoice : invoices) {
      if (invoice.getPhieuBaoHanh() == null
          || !ticket.getId().equals(invoice.getPhieuBaoHanh().getId())
          || !seen.add(invoice.getId())) throw invalidHistory();
      var totals = WarrantyFinanceCalculator.invoice(invoice, cash);
      refund = refund.add(totals.conPhaiHoan());
      refunded = refunded.add(totals.daHoan());
      requiredRefund = requiredRefund.add(totals.tongCanHoan());
    }
    if (invoices.isEmpty()
        && quotes.values().stream()
            .anyMatch(
                q ->
                    "DONG_Y".equals(q.get("trang_thai"))
                        && amount(q.get("tong_tien_khach")).signum() > 0))
      throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    BigDecimal remaining = BigDecimal.ZERO;
    TrangThaiThanhToanBaoHanh payment = null;
    HoaDonBaoHanh invoice = active.isEmpty() ? null : active.getFirst();
    if (invoice != null) {
      WarrantyInvoiceAdjustments.validate(
          invoice, quotes.get(invoice.getPhienBanBaoGia()), events, history);
      var summary = WarrantyFinanceCalculator.invoice(invoice, cash);
      remaining = summary.conPhaiThu();
      payment = summary.trangThaiThanhToan();
    }
    Map<String, Object> debt = null;
    Long approvalId = (Long) input.get("phe_duyet_cong_no_lich_su_id");
    if (approvalId != null) debt = debt(invoice, events, approvalId, remaining, at);
    if (remaining.signum() > 0 && debt == null) throw paymentRequired(remaining);
    // Nghĩa vụ hoàn tiền không chặn trả thiết bị và tuyệt đối không được xóa khi bàn giao.
    var refundStatus =
        requiredRefund.signum() == 0
            ? TrangThaiHoanTienBaoHanh.KHONG_CAN_HOAN
            : refund.signum() == 0
                ? TrangThaiHoanTienBaoHanh.DA_HOAN
                : refunded.signum() > 0
                    ? TrangThaiHoanTienBaoHanh.HOAN_MOT_PHAN
                    : TrangThaiHoanTienBaoHanh.CHO_HOAN;
    return new Payment(remaining, refund, payment, refundStatus, debt);
  }

  private Map<String, Object> debt(
      HoaDonBaoHanh invoice,
      List<LichSuBaoHanh> events,
      Long approvalId,
      BigDecimal remaining,
      OffsetDateTime at) {
    var selected =
        events.stream()
            .filter(e -> approvalId.equals(e.getId()))
            .findFirst()
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.NOT_FOUND,
                        "phe_duyet_cong_no_lich_su_id",
                        "DEBT_APPROVAL_NOT_FOUND"));
    var payload = history.payload(selected);
    var change = history.object(payload.get("dieu_chinh_hoa_don"));
    var approval = history.object(change == null ? null : change.get("phe_duyet_cong_no"));
    var before = history.object(change == null ? null : change.get("hoa_don_truoc"));
    var after = history.object(change == null ? null : change.get("hoa_don_sau"));
    if (invoice == null
        || !"DIEU_CHINH_HOA_DON_BAO_HANH".equals(selected.getLoaiSuKien())
        || change == null
        || !"DUYET_CONG_NO".equals(change.get("hanh_dong"))
        || approval == null
        || before == null
        || after == null
        || selected.getNguoiThucHien() == null
        || !selected
            .getNguoiThucHien()
            .getId()
            .equals(history.id(approval.get("nguoi_phe_duyet_id")))
        || !invoice.getId().equals(history.id(after.get("id")))
        || !invoice.getId().equals(history.id(before.get("id")))
        || !Objects.equals(
            invoice.getPhienBanBaoGia().longValue(), history.id(after.get("phien_ban_bao_gia"))))
      throw paymentRequired(remaining);
    for (var event : events) {
      if (event.getId() <= selected.getId()) continue;
      var later = history.object(history.payload(event).get("dieu_chinh_hoa_don"));
      var laterInvoice = history.object(later == null ? null : later.get("hoa_don_sau"));
      if (later != null
          && laterInvoice != null
          && "DUYET_CONG_NO".equals(later.get("hanh_dong"))
          && invoice.getId().equals(history.id(laterInvoice.get("id"))))
        throw paymentRequired(remaining);
    }
    BigDecimal maximum = amount(approval.get("so_tien_toi_da"));
    LocalDate due;
    try {
      due = LocalDate.parse(history.text(approval.get("han_thanh_toan")));
    } catch (RuntimeException e) {
      throw invalidHistory();
    }
    var approvedAt = history.time(payload.get("thoi_diem"));
    if (!Boolean.TRUE.equals(approval.get("duoc_ban_giao_khi_con_no"))
        || maximum.signum() <= 0
        || remaining.compareTo(maximum) > 0
        || approvedAt == null
        || at.isBefore(approvedAt)
        || due.isBefore(at.toLocalDate())
        || due.isBefore(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))
        || history.text(approval.get("ly_do")) == null) throw paymentRequired(remaining);
    var result = new LinkedHashMap<>(approval);
    result.put("lich_su_id", approvalId);
    return result;
  }

  static WarrantyReadException notReady() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_HANDOVER_NOT_READY, "thiet_bi_ban_giao_id", "HANDOVER_DEVICE_NOT_READY");
  }

  static WarrantyReadException paymentRequired(BigDecimal remaining) {
    return WarrantyReadException.withData(
        ErrorCode.WARRANTY_HANDOVER_PAYMENT_REQUIRED,
        "phe_duyet_cong_no_lich_su_id",
        "HANDOVER_PAYMENT_REQUIRED",
        fields("con_phai_thu", remaining, "da_ban_giao", false));
  }
}
