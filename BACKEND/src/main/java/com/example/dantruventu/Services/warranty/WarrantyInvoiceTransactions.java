package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.amount;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.invalidHistory;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyDetailResponse.Invoice;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyInvoiceResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

/** Never creates invoices, cash vouchers or inventory movements. */
@Service
@RequiredArgsConstructor
public class WarrantyInvoiceTransactions {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;
  private final WarrantyQuoteEventRepository repository;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyInvoiceResponse> apply(
      Long id, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-INV-",
            key,
            actorId,
            "PATCH:/api/v1/admin/warranties/" + id + "/invoice",
            input,
            AdminWarrantyInvoiceResponse.class,
            WarrantyInvoiceValidation.INVALID);
    if (replay.previous() != null) return replay.previous();
    var origin = workflow.ticketOrigin(id);
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    var ticket = workflow.lockTicket(id);
    if (ticket.getDonHang() == null
        || ticket.getThietBi() == null
        || ticket.getThietBi().getChiTietDonHang() == null
        || !origin.orderId().equals(ticket.getDonHang().getId())
        || !origin.lineId().equals(ticket.getThietBi().getChiTietDonHang().getId()))
      throw invalidHistory();
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    var invoices = details.findInvoices(id);
    if (invoices.stream().filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC).count()
        > 1) throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    String action = input.get("hanh_dong").toString();
    boolean applying = action.equals("AP_DUNG_BAO_GIA_DA_DUYET");
    if (applying
        && !invoices.isEmpty()
        && invoices.stream().noneMatch(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC))
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_INVOICE_INACTIVE, "hoa_don_id", "INVOICE_INACTIVE");
    var invoice =
        invoices.stream()
            .filter(
                i ->
                    applying
                        ? i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC
                        : Objects.equals(i.getId(), input.get("hoa_don_id")))
            .findFirst()
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.WARRANTY_INVOICE_NOT_FOUND,
                        "hoa_don_id",
                        "WARRANTY_INVOICE_NOT_FOUND"));
    repository.lockInvoice(invoice);
    if (invoice.getPhieuBaoHanh() == null || !id.equals(invoice.getPhieuBaoHanh().getId()))
      throw invalidHistory();
    if (invoice.getTrangThai() != TrangThaiHoaDonBaoHanh.HIEU_LUC)
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_INVOICE_INACTIVE, "hoa_don_id", "INVOICE_INACTIVE");
    var versions = WarrantyQuoteSnapshots.load(history, ticket, events, details.findFees(id));
    if (invoice.getPhienBanBaoGia() == null) throw invalidHistory();
    WarrantyInvoiceAdjustments.validate(
        invoice, versions.get(invoice.getPhienBanBaoGia()), events, history);
    var vouchers = details.findPostedMoney(id);
    Invoice before = WarrantyFinanceCalculator.invoice(invoice, vouchers);
    Map<String, Object> reduction = null;
    Map<String, Object> debt = null;
    String message;
    if (applying) {
      int version = (Integer) input.get("phien_ban_bao_gia");
      var quote = versions.get(version);
      if (quote == null)
        throw WarrantyReadException.notFound(
            ErrorCode.NOT_FOUND, "phien_ban_bao_gia", "QUOTE_VERSION_NOT_FOUND");
      requireApproved(quote);
      int latestApproved =
          versions.entrySet().stream()
              .filter(e -> "DONG_Y".equals(e.getValue().get("trang_thai")))
              .mapToInt(Map.Entry::getKey)
              .max()
              .orElseThrow(WarrantyQuoteSnapshots::invalidHistory);
      if (version != latestApproved || version < invoice.getPhienBanBaoGia()) throw unapproved();
      if (version == invoice.getPhienBanBaoGia()) {
        Long auditId = appliedHistory(invoice, events);
        var data = response(before, before, action, auditId);
        data.put("co_thay_doi", false);
        return mutations.complete(
            replay, 200, "Hóa đơn đã áp dụng báo giá, không điều chỉnh lại", data);
      }
      invoice.setPhienBanBaoGia(version);
      invoice.setTongTien(amount(quote.get("tong_tien_khach")));
      message = "Áp dụng báo giá đã được khách duyệt thành công";
    } else if (action.equals("HUY")) {
      invoice.setTrangThai(TrangThaiHoaDonBaoHanh.HUY);
      message =
          before.daThu().subtract(before.daHoan()).signum() > 0
              ? "Hủy hóa đơn, theo dõi khoản tiền còn phải hoàn"
              : "Hủy hóa đơn không còn tiền phải hoàn";
    } else if (action.equals("DUYET_MIEN_GIAM")) {
      BigDecimal discount = (BigDecimal) input.get("so_tien_mien_giam");
      if (discount.compareTo(invoice.getTongTien()) > 0) throw exceeded();
      invoice.setTongTien(invoice.getTongTien().subtract(discount));
      reduction =
          fields("nguoi_phe_duyet_id", actorId, "so_tien", discount, "ly_do", input.get("ly_do"));
      message = "Duyệt miễn giảm hóa đơn thành công";
    } else {
      BigDecimal maximum = (BigDecimal) input.get("so_tien_cong_no_toi_da");
      LocalDate due = LocalDate.parse(input.get("han_thanh_toan").toString());
      if (due.isBefore(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))))
        throw WarrantyInvoiceValidation.invalid();
      if (before.conPhaiThu().signum() <= 0 || maximum.compareTo(before.conPhaiThu()) > 0)
        throw exceeded();
      debt =
          fields(
              "nguoi_phe_duyet_id",
              actorId,
              "so_tien_toi_da",
              maximum,
              "han_thanh_toan",
              due.toString(),
              "ly_do",
              input.get("ly_do"),
              "duoc_ban_giao_khi_con_no",
              before.conPhaiThu().compareTo(maximum) <= 0);
      message = "Duyệt ngoại lệ công nợ, giữ nguyên khoản phải thu";
    }
    Invoice after = WarrantyFinanceCalculator.invoice(invoice, vouchers);
    var change =
        fields(
            "hanh_dong",
            action,
            "hoa_don_truoc",
            before,
            "hoa_don_sau",
            after,
            "ly_do",
            input.get("ly_do"),
            "can_cu",
            input.get("can_cu"),
            "bang_chung_urls",
            input.get("bang_chung_urls"));
    if (reduction != null) change.put("phe_duyet_mien_giam", reduction);
    if (debt != null) change.put("phe_duyet_cong_no", debt);
    var event =
        workflow.append(
            ticket,
            actorId,
            "DIEU_CHINH_HOA_DON_BAO_HANH",
            message,
            mapper.writeValueAsString(
                fields(
                    "thoi_diem",
                    OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString(),
                    "dieu_chinh_hoa_don",
                    change)));
    if (event.getId() == null) throw invalidHistory();
    repository.flush();
    var data = response(before, after, action, event.getId());
    if (applying) data.put("co_thay_doi", true);
    if (reduction != null) data.put("phe_duyet_mien_giam", reduction);
    if (debt != null) {
      debt.put("lich_su_id", event.getId());
      data.put("phe_duyet_cong_no", debt);
    }
    return mutations.complete(replay, 200, message, data);
  }

  private void requireApproved(Map<String, Object> quote) {
    var consent = history.object(quote.get("quyet_dinh"));
    if (!"DONG_Y".equals(quote.get("trang_thai"))
        || consent == null
        || !"DONG_Y".equals(consent.get("quyet_dinh"))
        || history.time(consent.get("thoi_diem")) == null
        || history.text(consent.get("kenh")) == null
        || history.array(consent.get("bang_chung_urls")).isEmpty()
        || Boolean.TRUE.equals(quote.get("da_huy"))) throw unapproved();
    var at = history.time(consent.get("thoi_diem"));
    var deadline = history.time(quote.get("han_phan_hoi"));
    if (deadline == null
        || at.isAfter(deadline)
        || at.isAfter(OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")))) throw unapproved();
  }

  private Long appliedHistory(HoaDonBaoHanh invoice, List<LichSuBaoHanh> events) {
    Long auditId = null;
    Long consentId = null;
    for (var event : events) {
      var payload = history.payload(event);
      var quote = history.object(payload.get("bao_gia"));
      if (quote != null
          && "DONG_Y".equals(quote.get("trang_thai"))
          && Objects.equals(
              history.id(quote.get("phien_ban")), invoice.getPhienBanBaoGia().longValue()))
        consentId = event.getId();
      var change = history.object(payload.get("dieu_chinh_hoa_don"));
      var after = change == null ? null : history.object(change.get("hoa_don_sau"));
      if (after != null
          && invoice.getId().equals(history.id(after.get("id")))
          && Objects.equals(
              history.id(after.get("phien_ban_bao_gia")), invoice.getPhienBanBaoGia().longValue())
          && !"DUYET_CONG_NO".equals(change.get("hanh_dong"))) auditId = event.getId();
    }
    if (auditId == null) auditId = consentId;
    if (auditId == null) throw invalidHistory();
    return auditId;
  }

  private AdminWarrantyInvoiceResponse response(
      Invoice before, Invoice after, String action, Long auditId) {
    var data = new AdminWarrantyInvoiceResponse();
    data.putAll(
        fields(
            "hoa_don_id",
            after.id(),
            "trang_thai",
            after.trangThai().name(),
            "phien_ban_bao_gia",
            after.phienBanBaoGia(),
            "tong_tien_truoc",
            before.tongTien(),
            "tong_tien",
            after.tongTien(),
            "da_thu",
            after.daThu(),
            "da_hoan",
            after.daHoan(),
            "con_phai_thu",
            after.conPhaiThu(),
            "con_phai_hoan",
            after.conPhaiHoan(),
            "trang_thai_thanh_toan",
            after.trangThaiThanhToan(),
            "trang_thai_hoan_tien",
            after.trangThaiHoanTien(),
            "lich_su_id",
            auditId,
            "hanh_dong",
            action,
            "khoan_phai_thu_hieu_luc",
            after.khoanPhaiThuHieuLuc(),
            "phieu_thu_chi_moi_id",
            null));
    return data;
  }

  private static WarrantyReadException unapproved() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_QUOTE_NOT_APPROVED, "phien_ban_bao_gia", "QUOTE_NOT_APPROVED");
  }

  private static WarrantyReadException exceeded() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_INVOICE_AMOUNT_EXCEEDED, "hanh_dong", "INVOICE_AMOUNT_EXCEEDED");
  }
}
