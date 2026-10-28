package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.amount;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.invalidHistory;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyQuoteEventResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

/** Invoice writes, quote state, consent, audit and successful replay are one transaction. */
@Service
@RequiredArgsConstructor
public class WarrantyQuoteEventTransactions {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;
  private final WarrantyQuoteEventRepository repository;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyQuoteEventResponse> apply(
      Long id, int version, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-QEV-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/" + id + "/quotes/" + version + "/events",
            input,
            AdminWarrantyQuoteEventResponse.class,
            WarrantyQuoteEventValidation.INVALID);
    if (replay.previous() != null) return replay.previous();
    var ticket = lockTicket(id);
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    var versions = WarrantyQuoteSnapshots.load(history, ticket, events, details.findFees(id));
    var saved = versions.get(version);
    if (saved == null)
      throw WarrantyReadException.notFound(
          ErrorCode.NOT_FOUND, "path.version", "QUOTE_VERSION_NOT_FOUND");
    if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT
        || events.stream().anyMatch(e -> "HANDOVER".equals(e.getLoaiSuKien())))
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_ALREADY_COMPLETED, "path.id", "WARRANTY_ALREADY_COMPLETED");
    String state = history.text(saved.get("trang_thai"));
    if (Set.of("DONG_Y", "TU_CHOI").contains(state)
        || history.object(saved.get("quyet_dinh")) != null)
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_QUOTE_ALREADY_DECIDED, "hanh_dong", "QUOTE_ALREADY_DECIDED");
    if ("HET_HIEU_LUC".equals(state)) throw expired();
    if (!Objects.equals(ticket.getPhienBanBaoGia(), version)
        || version != versions.lastKey()
        || ticket.getTrangThaiBaoGia() == null
        || !ticket.getTrangThaiBaoGia().name().equals(state)
        || saved.containsKey("duoc_thay_bang_phien_ban")) throw transition();
    OffsetDateTime at = (OffsetDateTime) input.get("thoi_diem");
    OffsetDateTime deadline = history.time(saved.get("han_phan_hoi"));
    if (deadline == null) throw invalidHistory();
    if (!deadline.isAfter(now()) || at.isAfter(deadline)) throw expired();
    for (var event : events) {
      var quote = history.object(history.payload(event).get("bao_gia"));
      if (quote != null && Objects.equals(history.id(quote.get("phien_ban")), (long) version)) {
        if (event.getNgayTao() == null) throw invalidHistory();
        if (at.isBefore(WarrantyReadValidation.time(event.getNgayTao()))) throw transition();
        break;
      }
    }
    String action = input.get("hanh_dong").toString();
    if (action.equals("GUI") ? !state.equals("NHAP") : !state.equals("CHO_PHAN_HOI"))
      throw transition();
    OffsetDateTime sentAt = history.time(saved.get("ngay_gui"));
    if (!action.equals("GUI") && (sentAt == null || at.isBefore(sentAt))) throw transition();
    var quote = new LinkedHashMap<>(saved);
    HoaDonBaoHanh invoice = activeInvoice(ticket, versions, events);
    var vouchers = details.findPostedMoney(id);
    var priorInvoice =
        invoice == null ? null : WarrantyFinanceCalculator.invoice(invoice, vouchers);
    boolean newInvoice = false;
    Long adjustmentId = null;
    String message;
    if (action.equals("GUI")) {
      quote.put("trang_thai", "CHO_PHAN_HOI");
      quote.put("ngay_gui", iso(at));
      quote.put("kenh", input.get("kenh"));
      quote.put("bang_chung_gui_urls", input.get("bang_chung_urls"));
      message =
          invoice == null
              ? "Gửi báo giá, chờ khách phản hồi"
              : "Gửi báo giá mới, giữ nguyên khoản phải thu đã được duyệt";
    } else if (action.equals("THU_HOI")) {
      quote.put("trang_thai", "HET_HIEU_LUC");
      quote.put("ly_do_het_hieu_luc", input.get("ly_do"));
      quote.put("thoi_diem_het_hieu_luc", iso(at));
      message =
          invoice == null
              ? "Thu hồi bản đang chờ, ghi hết hiệu lực"
              : "Thu hồi báo giá đang chờ, giữ nguyên hóa đơn đã được duyệt";
    } else {
      String choice = input.get("quyet_dinh").toString();
      var decision = fields("quyet_dinh", choice, "thoi_diem", iso(at), "kenh", input.get("kenh"));
      if (choice.equals("TU_CHOI")) decision.put("ly_do", input.get("ly_do"));
      decision.put("bang_chung_urls", input.get("bang_chung_urls"));
      quote.put("trang_thai", choice);
      quote.put("quyet_dinh", decision);
      if (choice.equals("TU_CHOI")) {
        message =
            invoice == null
                ? "Khách từ chối báo giá sửa"
                : "Từ chối sửa nhưng phí kiểm tra đã duyệt vẫn còn";
      } else {
        WarrantyQuoteSnapshots.preserveApprovedFees(history, versions, items(quote));
        BigDecimal total = amount(quote.get("tong_tien_khach"));
        if (invoice == null && total.signum() > 0) {
          invoice =
              HoaDonBaoHanh.builder()
                  .phieuBaoHanh(ticket)
                  .phienBanBaoGia(version)
                  .maHoaDon("HDBH-" + UUID.randomUUID())
                  .tongTien(total)
                  .trangThai(TrangThaiHoaDonBaoHanh.HIEU_LUC)
                  .build();
          repository.insertInvoice(invoice, actorId);
          if (invoice.getId() == null) throw new IllegalStateException("Invoice identity missing");
          newInvoice = true;
          message = "Khách đồng ý báo giá, lập hóa đơn bảo hành thành công";
        } else if (invoice != null) {
          invoice.setPhienBanBaoGia(version);
          invoice.setTongTien(total);
          repository.flush();
          var adjusted = WarrantyFinanceCalculator.invoice(invoice, vouchers);
          var adjustment =
              workflow.append(
                  ticket,
                  actorId,
                  "DIEU_CHINH_HOA_DON_BAO_HANH",
                  "Điều chỉnh cùng hóa đơn từ báo giá đã được khách chấp thuận",
                  mapper.writeValueAsString(
                      fields(
                          "thoi_diem",
                          iso(at),
                          "dieu_chinh_hoa_don",
                          fields(
                              "hoa_don_truoc",
                              priorInvoice,
                              "hoa_don_sau",
                              adjusted,
                              "phien_ban_bao_gia",
                              version,
                              "quyet_dinh",
                              decision))));
          adjustmentId = adjustment.getId();
          message = "Khách đồng ý báo giá mới, điều chỉnh hóa đơn đang hiệu lực";
        } else {
          message = "Khách đồng ý phạm vi miễn phí, không tạo hóa đơn thu khách";
        }
      }
    }
    ticket.setTrangThaiBaoGia(TrangThaiBaoGiaBaoHanh.valueOf(quote.get("trang_thai").toString()));
    var event =
        workflow.append(
            ticket,
            actorId,
            "SU_KIEN_BAO_GIA",
            message,
            mapper.writeValueAsString(
                fields("hanh_dong", action, "thoi_diem", iso(at), "bao_gia", quote)));
    repository.flush();
    var response = new AdminWarrantyQuoteEventResponse();
    response.putAll(
        fields(
            "phieu_bao_hanh_id",
            id,
            "phien_ban_bao_gia",
            version,
            "trang_thai_bao_gia",
            quote.get("trang_thai"),
            "trang_thai_xu_ly",
            ticket.getTrangThaiXuLy().name(),
            "hoa_don",
            invoice == null ? null : WarrantyFinanceCalculator.invoice(invoice, vouchers),
            "phieu_thu_chi_id",
            null,
            "quyet_dinh",
            quote.get("quyet_dinh"),
            "han_phan_hoi",
            iso(deadline),
            "lich_su_id",
            event.getId(),
            "hanh_dong",
            action));
    if (action.equals("GUI"))
      response.putAll(fields("ngay_gui", iso(at), "kenh", input.get("kenh")));
    else if (action.equals("THU_HOI")) response.put("ly_do_het_hieu_luc", input.get("ly_do"));
    else if ("DONG_Y".equals(input.get("quyet_dinh"))) {
      response.put("hoa_don_moi", newInvoice);
      if (invoice == null) response.put("tong_tien_khach", amount(quote.get("tong_tien_khach")));
      if (adjustmentId != null) response.put("lich_su_dieu_chinh_hoa_don_id", adjustmentId);
    } else {
      response.put("duoc_thuc_hien_phan_co_phi", false);
      if (invoice != null) {
        List<Map<String, Object>> retained = new ArrayList<>();
        for (var item : items(versions.get(invoice.getPhienBanBaoGia())))
          if (amount(item.get("thanh_tien_khach")).signum() > 0)
            retained.add(
                fields(
                    "chi_tiet_phi_id",
                    history.id(item.get("id")),
                    "noi_dung",
                    item.get("noi_dung"),
                    "so_tien",
                    amount(item.get("thanh_tien_khach"))));
        response.put("khoan_da_duyet_van_ap_dung", retained);
      }
    }
    return mutations.complete(replay, 200, message, response);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
  public void expire(Long id, int version, Long actorId) {
    var ticket = lockTicket(id);
    if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT
        || !Objects.equals(ticket.getPhienBanBaoGia(), version)
        || ticket.getTrangThaiBaoGia() == null
        || !Set.of(TrangThaiBaoGiaBaoHanh.NHAP, TrangThaiBaoGiaBaoHanh.CHO_PHAN_HOI)
            .contains(ticket.getTrangThaiBaoGia())) return;
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    var versions = WarrantyQuoteSnapshots.load(history, ticket, events, details.findFees(id));
    var quote = versions.get(version);
    var at = now();
    if (quote == null || history.object(quote.get("quyet_dinh")) != null) return;
    var deadline = history.time(quote.get("han_phan_hoi"));
    if (deadline == null) throw invalidHistory();
    if (deadline.isAfter(at)) return;
    var expired = new LinkedHashMap<>(quote);
    expired.put("trang_thai", "HET_HIEU_LUC");
    expired.put("ly_do_het_hieu_luc", "Hết thời hạn phản hồi");
    expired.put("thoi_diem_het_hieu_luc", iso(at));
    ticket.setTrangThaiBaoGia(TrangThaiBaoGiaBaoHanh.HET_HIEU_LUC);
    workflow.append(
        ticket,
        actorId,
        "BAO_GIA_HET_HAN",
        "Ghi nhận hết thời hạn phản hồi khi kiểm tra báo giá",
        mapper.writeValueAsString(fields("thoi_diem", iso(at), "bao_gia", expired)));
    repository.flush();
  }

  private PhieuBaoHanh lockTicket(Long id) {
    var origin = workflow.ticketOrigin(id);
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    var ticket = workflow.lockTicket(id);
    if (ticket.getDonHang() == null
        || ticket.getThietBi() == null
        || ticket.getThietBi().getChiTietDonHang() == null
        || !origin.orderId().equals(ticket.getDonHang().getId())
        || !origin.lineId().equals(ticket.getThietBi().getChiTietDonHang().getId())
        || ticket.getTrangThaiXuLy() == null) throw invalidHistory();
    return ticket;
  }

  private HoaDonBaoHanh activeInvoice(
      PhieuBaoHanh ticket, Map<Integer, Map<String, Object>> versions, List<LichSuBaoHanh> events) {
    var active =
        details.findInvoices(ticket.getId()).stream()
            .filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC)
            .toList();
    if (active.size() > 1) throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    if (active.isEmpty()) return null;
    var invoice = active.getFirst();
    repository.lockInvoice(invoice);
    var approved = versions.get(invoice.getPhienBanBaoGia());
    if (invoice.getTrangThai() != TrangThaiHoaDonBaoHanh.HIEU_LUC
        || approved == null
        || invoice.getPhieuBaoHanh() == null
        || !ticket.getId().equals(invoice.getPhieuBaoHanh().getId())
        || !"DONG_Y".equals(approved.get("trang_thai")))
      throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    WarrantyInvoiceAdjustments.validate(invoice, approved, events, history);
    return invoice;
  }

  private List<Map<String, Object>> items(Map<String, Object> quote) {
    return history.array(quote.get("hang_muc")).stream().map(history::object).toList();
  }

  private static OffsetDateTime now() {
    return OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
  }

  private static String iso(OffsetDateTime at) {
    return at.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
  }

  private static WarrantyReadException expired() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_QUOTE_EXPIRED, "path.version", "QUOTE_EXPIRED");
  }

  private static WarrantyReadException transition() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_QUOTE_EVENT_TRANSITION_INVALID, "path.version", "QUOTE_NOT_APPLICABLE");
  }
}
