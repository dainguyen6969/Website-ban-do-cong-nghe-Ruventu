package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyQuoteRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyQuoteResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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
public class AdminWarrantyQuoteService {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;
  private final WarrantyQuoteRepository repository;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyQuoteResponse> create(
      String rawId, AdminWarrantyQuoteRequest request, String key, Long actorId) {
    try {
      Long id = WarrantyReadValidation.id(rawId, ErrorCode.INVALID_WARRANTY_QUOTE);
      return execute(id, WarrantyQuoteValidation.validate(request), key, actorId);
    } catch (AppException | PessimisticLockingFailureException failure) {
      throw failure;
    } catch (RuntimeException failure) {
      log.error("Creating warranty quote failed", failure);
      throw new AppException(ErrorCode.WARRANTY_QUOTE_FAILED);
    }
  }

  private ApiResponse<AdminWarrantyQuoteResponse> execute(
      Long id, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-QUOTE-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/" + id + "/quotes",
            input,
            AdminWarrantyQuoteResponse.class,
            ErrorCode.INVALID_WARRANTY_QUOTE);
    if (replay.previous() != null) return replay.previous();
    var origin = workflow.ticketOrigin(id);
    // Same lock order as status/events/returns; source-version checks run after the ticket lock.
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    PhieuBaoHanh ticket = workflow.lockTicket(id);
    if (ticket.getDonHang() == null
        || ticket.getThietBi() == null
        || ticket.getThietBi().getChiTietDonHang() == null
        || !origin.orderId().equals(ticket.getDonHang().getId())
        || !origin.lineId().equals(ticket.getThietBi().getChiTietDonHang().getId())
        || ticket.getTrangThaiXuLy() == null) throw invalidHistory();
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT
        || events.stream().anyMatch(e -> "HANDOVER".equals(e.getLoaiSuKien())))
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_ALREADY_COMPLETED, "path.id", "WARRANTY_ALREADY_COMPLETED");
    var deadline = (OffsetDateTime) input.get("han_phan_hoi");
    if (!deadline.isAfter(OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))))
      throw WarrantyQuoteValidation.invalid();
    var items = items(input);
    validateConclusion(events, (Long) input.get("ket_luan_lich_su_id"), items);
    var versions = versions(ticket, events, details.findFees(id));
    Integer replaces = (Integer) input.get("thay_the_phien_ban");
    Map<String, Object> previous = replaces == null ? null : versions.get(replaces);
    if (replaces != null && previous == null)
      throw WarrantyReadException.notFound(
          ErrorCode.NOT_FOUND, "thay_the_phien_ban", "QUOTE_VERSION_NOT_FOUND");
    if (versions.isEmpty()) {
      if (ticket.getTrangThaiBaoGia() != null || !Objects.equals(ticket.getPhienBanBaoGia(), 1))
        throw invalidHistory();
    } else if (!Objects.equals(replaces, versions.lastKey())) {
      throw sourceInvalid();
    } else if (!Objects.equals(ticket.getPhienBanBaoGia(), replaces)
        || ticket.getTrangThaiBaoGia() == null
        || !ticket.getTrangThaiBaoGia().name().equals(previous.get("trang_thai"))) {
      throw invalidHistory();
    }
    if (!versions.isEmpty() && versions.lastKey() == Integer.MAX_VALUE) throw sourceInvalid();
    int version = versions.isEmpty() ? 1 : versions.lastKey() + 1;
    preserveApprovedFees(versions, items);
    HoaDonBaoHanh invoice = activeInvoice(ticket, versions, events);
    BigDecimal total = (BigDecimal) input.get("tong_tien_khach");

    // All validation precedes inserting immutable fee rows or appending either history entry.
    List<Map<String, Object>> savedItems = new ArrayList<>();
    for (var item : items) {
      var fee =
          ChiTietPhiBaoHanh.builder()
              .phieuBaoHanh(ticket)
              .phienBanBaoGia(version)
              .noiDung(item.get("noi_dung").toString())
              .soLuong((Integer) item.get("so_luong"))
              .donGiaKhach((BigDecimal) item.get("don_gia_khach"))
              .thanhTienKhach((BigDecimal) item.get("thanh_tien_khach"))
              .chiPhiNccDuKien((BigDecimal) item.get("chi_phi_ncc_du_kien"))
              .dieuKienBaoHanh(item.get("dieu_kien_bao_hanh").toString())
              .build();
      repository.insert(fee);
      var saved = new LinkedHashMap<>(item);
      saved.put("id", fee.getId());
      if (fee.getId() == null) throw new IllegalStateException("Quote fee identity missing");
      savedItems.add(saved);
    }
    Map<String, Object> previousLink = null;
    if (previous != null) {
      // Append a replacement link; never UPDATE old fee rows or old decision history.
      var replaced = new LinkedHashMap<>(previous);
      String oldStatus = previous.get("trang_thai").toString();
      if (Set.of("NHAP", "CHO_PHAN_HOI").contains(oldStatus))
        replaced.put("trang_thai", "HET_HIEU_LUC");
      replaced.put("duoc_thay_bang_phien_ban", version);
      workflow.append(
          ticket,
          actorId,
          "THAY_THE_BAO_GIA",
          input.get("ly_do").toString(),
          mapper.writeValueAsString(fields("bao_gia", replaced)));
      previousLink =
          fields(
              "phien_ban",
              replaces,
              "trang_thai",
              replaced.get("trang_thai"),
              "duoc_thay_bang_phien_ban",
              version);
    }
    var quote = new LinkedHashMap<>(input);
    quote.put("phien_ban", version);
    quote.put("trang_thai", "NHAP");
    quote.put("hang_muc", savedItems);
    quote.put("han_phan_hoi", deadline.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
    quote.put("quyet_dinh", null);
    workflow.append(
        ticket,
        actorId,
        "LAP_BAO_GIA",
        input.get("ly_do").toString(),
        mapper.writeValueAsString(fields("bao_gia", quote)));
    ticket.setPhienBanBaoGia(version);
    ticket.setTrangThaiBaoGia(TrangThaiBaoGiaBaoHanh.NHAP);
    repository.flush();
    var result = new AdminWarrantyQuoteResponse();
    result.putAll(
        fields(
            "phieu_bao_hanh_id",
            id,
            "phien_ban_bao_gia",
            version,
            "trang_thai_bao_gia",
            "NHAP",
            "hang_muc",
            savedItems,
            "tong_tien_khach",
            total,
            "han_phan_hoi",
            deadline.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
            "thay_the_phien_ban",
            replaces,
            "hoa_don_id",
            invoice == null ? null : invoice.getId(),
            "thoi_gian_du_kien",
            input.get("thoi_gian_du_kien"),
            "dieu_kien_dat_coc",
            input.get("dieu_kien_dat_coc"),
            "dieu_kien_thanh_toan",
            input.get("dieu_kien_thanh_toan"),
            "quyet_dinh_khach",
            null,
            "da_tao_giao_dich_tien",
            false));
    if (previousLink != null) result.put("bao_gia_truoc", previousLink);
    if (invoice != null) {
      result.put(
          "hoa_don_hien_hanh_chua_doi",
          fields(
              "id",
              invoice.getId(),
              "phien_ban_bao_gia",
              invoice.getPhienBanBaoGia(),
              "tong_tien",
              invoice.getTongTien()));
      result.put(
          "phan_tang_them_chua_duoc_duyet",
          total.subtract(invoice.getTongTien()).max(BigDecimal.ZERO));
    }
    String message;
    if (previous != null && "DONG_Y".equals(previous.get("trang_thai")))
      message = "Tạo báo giá mới, giữ nguyên chấp thuận và hóa đơn đã duyệt";
    else if (previous != null && "CHO_PHAN_HOI".equals(previous.get("trang_thai")))
      message = "Thay báo giá đang chờ chưa có quyết định";
    else if (total.signum() == 0) message = "Lưu báo giá không thu tiền khách thành công";
    else if (items.stream().anyMatch(i -> ((BigDecimal) i.get("thanh_tien_khach")).signum() == 0))
      message = "Tạo báo giá có cả miễn phí và có phí";
    else message = "Tạo báo giá nháp thành công";
    return mutations.complete(replay, 201, message, result);
  }

  private void validateConclusion(
      List<LichSuBaoHanh> events, Long id, List<Map<String, Object>> items) {
    var event =
        events.stream()
            .filter(e -> id.equals(e.getId()))
            .findFirst()
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.NOT_FOUND, "ket_luan_lich_su_id", "CONCLUSION_NOT_FOUND"));
    var selected = history.object(history.payload(event).get("ket_luan"));
    if (!"GHI_KET_LUAN".equals(event.getLoaiSuKien()) || selected == null)
      throw conclusionInvalid();
    Map<String, Long> latest = new HashMap<>();
    Map<String, Map<String, Object>> scope = new HashMap<>();
    for (var candidate : events) {
      var section = history.object(history.payload(candidate).get("ket_luan"));
      Set<String> unique = new HashSet<>();
      for (Object raw : history.array(section == null ? null : section.get("hang_muc"))) {
        var item = history.object(raw);
        String code = item == null ? null : history.text(item.get("ma_hang_muc"));
        if (code == null || !unique.add(code)) throw invalidHistory();
        latest.put(code, candidate.getId());
        if (id.equals(candidate.getId())) scope.put(code, item);
      }
    }
    for (var item : items) {
      var conclusion = scope.get(item.get("ma_hang_muc"));
      if (conclusion == null
          || !id.equals(latest.get(item.get("ma_hang_muc")))
          || !Objects.equals(item.get("dieu_kien_bao_hanh"), conclusion.get("dieu_kien_bao_hanh"))
          || !Objects.equals(item.get("ben_chiu_phi"), conclusion.get("ben_chiu_phi"))
          || history.text(conclusion.get("can_cu")) == null
          || history.text(conclusion.get("can_cu")).isBlank()) throw conclusionInvalid();
    }
  }

  private TreeMap<Integer, Map<String, Object>> versions(
      PhieuBaoHanh ticket, List<LichSuBaoHanh> events, List<ChiTietPhiBaoHanh> fees) {
    return WarrantyQuoteSnapshots.load(history, ticket, events, fees);
  }

  private void preserveApprovedFees(
      TreeMap<Integer, Map<String, Object>> versions, List<Map<String, Object>> items) {
    WarrantyQuoteSnapshots.preserveApprovedFees(history, versions, items);
  }

  private HoaDonBaoHanh activeInvoice(
      PhieuBaoHanh ticket, Map<Integer, Map<String, Object>> versions, List<LichSuBaoHanh> events) {
    var invoices =
        details.findInvoices(ticket.getId()).stream()
            .filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC)
            .toList();
    if (invoices.size() > 1) throw invalidHistory();
    if (invoices.isEmpty()) return null;
    var invoice = invoices.getFirst();
    var approved = versions.get(invoice.getPhienBanBaoGia());
    if (invoice.getId() == null
        || invoice.getPhieuBaoHanh() == null
        || !ticket.getId().equals(invoice.getPhieuBaoHanh().getId())
        || approved == null
        || !"DONG_Y".equals(approved.get("trang_thai")))
      throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    WarrantyInvoiceAdjustments.validate(invoice, approved, events, history);
    return invoice;
  }

  @SuppressWarnings("unchecked")
  private List<Map<String, Object>> items(Map<String, Object> input) {
    return (List<Map<String, Object>>) input.get("hang_muc");
  }

  private static BigDecimal amount(Object raw) {
    try {
      return WarrantyQuoteValidation.money(raw);
    } catch (AppException e) {
      throw invalidHistory();
    }
  }

  private static AppException invalidHistory() {
    return new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
  }

  private static WarrantyReadException sourceInvalid() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_QUOTE_SOURCE_INVALID, "thay_the_phien_ban", "QUOTE_SOURCE_INVALID");
  }

  private static WarrantyReadException conclusionInvalid() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_QUOTE_SOURCE_INVALID,
        "ket_luan_lich_su_id",
        "CONCLUSION_SCOPE_MISMATCH");
  }
}
