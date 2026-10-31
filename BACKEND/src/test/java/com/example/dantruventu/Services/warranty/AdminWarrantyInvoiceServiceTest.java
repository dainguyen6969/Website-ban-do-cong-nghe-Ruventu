package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.AdminWarrantyEventServiceTest.*;
import static com.example.dantruventu.Services.warranty.AdminWarrantyQuoteServiceTest.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyInvoiceRequest;
import com.example.dantruventu.DTO.Response.warranty.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class AdminWarrantyInvoiceServiceTest {
  static class Fixture extends AdminWarrantyQuoteEventServiceTest.Fixture {
    WarrantyInvoiceTransactions invoiceTransactions =
        new WarrantyInvoiceTransactions(
            workflow,
            locks,
            histories,
            history,
            details,
            eventRepository,
            new WarrantyMutationSupport(dedup, JSON),
            JSON);
    AdminWarrantyInvoiceService invoiceService =
        new AdminWarrantyInvoiceService(invoiceTransactions);

    AdminWarrantyInvoiceResponse update(Map<String, Object> body) {
      return update(body, UUID.randomUUID().toString(), 8L);
    }

    AdminWarrantyInvoiceResponse update(Map<String, Object> body, String key, Long actor) {
      var response = invoiceService.update("501", dto(body), key, actor);
      messageWithoutNumbers(response.getMessage());
      return response.getData();
    }

    void paid(long amount) {
      approved(false);
      if (amount > 0)
        cash.add(
            SoQuyThuChi.builder()
                .id(9001L)
                .hoaDonBaoHanh(invoices.getFirst())
                .phieuBaoHanh(ticket)
                .soTien(money(amount))
                .loaiPhieu(LoaiPhieuThuChi.THU)
                .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
                .build());
    }
  }

  @BeforeEach
  void admin() {
    role("ADMIN");
  }

  @AfterEach
  void clear() {
    SecurityContextHolder.clearContext();
  }

  static void role(String role) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(
                "actor", null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
  }

  static AdminWarrantyInvoiceRequest dto(Map<String, Object> body) {
    return JSON.readValue(JSON.writeValueAsString(body), AdminWarrantyInvoiceRequest.class);
  }

  static Map<String, Object> apply(int version) {
    return m(
        "hanh_dong",
        "AP_DUNG_BAO_GIA_DA_DUYET",
        "phien_ban_bao_gia",
        version,
        "ly_do",
        "Áp dụng báo giá đã được duyệt");
  }

  static Map<String, Object> cancel() {
    return m(
        "hanh_dong",
        "HUY",
        "hoa_don_id",
        801,
        "ly_do",
        "Công việc không thực hiện",
        "can_cu",
        "Biên bản xác nhận",
        "bang_chung_urls",
        List.of("/media/bh/cancel.jpg"));
  }

  static Map<String, Object> discount(long value) {
    return m(
        "hanh_dong",
        "DUYET_MIEN_GIAM",
        "hoa_don_id",
        801,
        "so_tien_mien_giam",
        value,
        "ly_do",
        "Cửa hàng hỗ trợ",
        "can_cu",
        "Quyết định hỗ trợ");
  }

  static Map<String, Object> debt(long value) {
    return m(
        "hanh_dong",
        "DUYET_CONG_NO",
        "hoa_don_id",
        801,
        "so_tien_cong_no_toi_da",
        value,
        "han_thanh_toan",
        LocalDate.now(AdminWarrantyQuoteEventServiceTest.VN).plusDays(14).toString(),
        "ly_do",
        "Khách được duyệt trả sau");
  }

  static void finance(
      AdminWarrantyInvoiceResponse r,
      long totalBefore,
      long total,
      long received,
      long refunded,
      long due,
      long refund,
      String payment,
      String refundStatus) {
    assertEquals(801L, r.get("hoa_don_id"));
    assertEquals(money(totalBefore), r.get("tong_tien_truoc"));
    assertEquals(money(total), r.get("tong_tien"));
    assertEquals(money(received), moneyValue(r.get("da_thu")));
    assertEquals(money(refunded), moneyValue(r.get("da_hoan")));
    assertEquals(money(due), moneyValue(r.get("con_phai_thu")));
    assertEquals(money(refund), moneyValue(r.get("con_phai_hoan")));
    assertEquals(
        payment,
        r.get("trang_thai_thanh_toan") == null ? null : r.get("trang_thai_thanh_toan").toString());
    assertEquals(refundStatus, r.get("trang_thai_hoan_tien").toString());
    assertTrue(r.containsKey("phieu_thu_chi_moi_id"));
    assertNull(r.get("phieu_thu_chi_moi_id"));
    assertNotNull(r.get("lich_su_id"));
  }

  static java.math.BigDecimal moneyValue(Object raw) {
    return new java.math.BigDecimal(raw.toString()).setScale(2);
  }

  static java.math.BigDecimal money(long raw) {
    return java.math.BigDecimal.valueOf(raw).setScale(2);
  }

  @Test
  void e01F01ApplyApprovedNewVersionUpdatesSameInvoiceWithoutMoney() {
    var f = new Fixture();
    f.paid(150000);
    f.create(second());
    f.state("DONG_Y", false);
    var cash = f.cash.getFirst();
    var ledger =
        List.of(
            cash.getId(),
            cash.getSoTien(),
            cash.getHoaDonBaoHanh().getId(),
            cash.getTrangThai(),
            cash.getLoaiPhieu());
    int prior = f.events.size();
    var r = f.update(apply(2));
    finance(r, 150000, 200000, 150000, 0, 50000, 0, "THANH_TOAN_MOT_PHAN", "KHONG_CAN_HOAN");
    assertEquals("HIEU_LUC", r.get("trang_thai"));
    assertEquals(2, r.get("phien_ban_bao_gia"));
    assertEquals(true, r.get("co_thay_doi"));
    assertEquals(money(200000), r.get("khoan_phai_thu_hieu_luc"));
    assertEquals(1, f.invoices.size());
    assertEquals(prior + 1, f.events.size());
    assertEquals(
        ledger,
        List.of(
            cash.getId(),
            cash.getSoTien(),
            cash.getHoaDonBaoHanh().getId(),
            cash.getTrangThai(),
            cash.getLoaiPhieu()));
    var audit = f.history.object(f.history.payload(f.events.getLast()).get("dieu_chinh_hoa_don"));
    assertNotNull(audit.get("hoa_don_truoc"));
    assertNotNull(audit.get("hoa_don_sau"));
    verify(f.eventRepository, times(1)).insertInvoice(any(), anyLong());
    verify(f.locks, never()).lockSerial(anyLong());
  }

  @Test
  void e01F02AlreadyAppliedIsNoOpEvenWithANewIdempotencyKey() {
    var f = new Fixture();
    f.paid(150000);
    f.create(second());
    f.event(2, AdminWarrantyQuoteEventServiceTest.send());
    var accepted = f.event(2, AdminWarrantyQuoteEventServiceTest.decision("DONG_Y"));
    int before = f.events.size();
    var r = f.update(apply(2));
    finance(r, 200000, 200000, 150000, 0, 50000, 0, "THANH_TOAN_MOT_PHAN", "KHONG_CAN_HOAN");
    assertEquals(false, r.get("co_thay_doi"));
    assertEquals(before, f.events.size());
    assertEquals(accepted.get("lich_su_dieu_chinh_hoa_don_id"), r.get("lich_su_id"));
    f.update(apply(2));
    assertEquals(before, f.events.size());
  }

  @Test
  void e02F03CancelUnpaidKeepsHistoricalAmount() {
    var f = new Fixture();
    f.paid(0);
    var r = f.update(cancel());
    finance(r, 150000, 150000, 0, 0, 0, 0, null, "KHONG_CAN_HOAN");
    assertEquals("HUY", r.get("trang_thai"));
    assertEquals(money(0), moneyValue(r.get("khoan_phai_thu_hieu_luc")));
    assertEquals(TrangThaiBaoHanh.DANG_KIEM_TRA, f.ticket.getTrangThaiXuLy());
  }

  @Test
  void e02F04CancelPaidOnlyCreatesRefundObligation() {
    var f = new Fixture();
    f.paid(150000);
    var r = f.update(cancel());
    finance(r, 150000, 150000, 150000, 0, 0, 150000, null, "CHO_HOAN");
    assertEquals(1, f.cash.size());
  }

  @Test
  void e03F05DiscountPartiallyPaidKeepsLedgerAndQuote() {
    var f = new Fixture();
    f.paid(50000);
    String quote = JSON.writeValueAsString(f.fees);
    var r = f.update(discount(50000));
    finance(r, 150000, 100000, 50000, 0, 50000, 0, "THANH_TOAN_MOT_PHAN", "KHONG_CAN_HOAN");
    assertEquals(quote, JSON.writeValueAsString(f.fees));
    assertEquals(
        m("nguoi_phe_duyet_id", 8L, "so_tien", money(50000), "ly_do", "Cửa hàng hỗ trợ"),
        r.get("phe_duyet_mien_giam"));
    assertEquals(1, f.cash.size());
  }

  @Test
  void e03F06DiscountFullyPaidReturnsOverpaymentNotCashRefund() {
    var f = new Fixture();
    f.paid(150000);
    var r = f.update(discount(50000));
    finance(r, 150000, 100000, 150000, 0, 0, 50000, "DA_THANH_TOAN", "CHO_HOAN");
    assertEquals(1, f.cash.size());
  }

  @Test
  void e04F07DebtApprovalKeepsAmountDue() {
    var f = new Fixture();
    f.paid(50000);
    var r = f.update(debt(100000));
    finance(r, 150000, 150000, 50000, 0, 100000, 0, "THANH_TOAN_MOT_PHAN", "KHONG_CAN_HOAN");
    var approval = (Map<?, ?>) r.get("phe_duyet_cong_no");
    assertEquals(true, approval.get("duoc_ban_giao_khi_con_no"));
    assertEquals(8L, approval.get("nguoi_phe_duyet_id"));
    assertEquals(r.get("lich_su_id"), approval.get("lich_su_id"));
    assertEquals(money(150000), f.invoices.getFirst().getTongTien());
  }

  @Test
  void f08UnapprovedVersionRejectsWithoutInvoiceHistoryMoneyWrites() {
    var f = new Fixture();
    f.paid(150000);
    f.create(second());
    int n = f.events.size();
    var error = assertThrows(WarrantyReadException.class, () -> f.update(apply(2)));
    assertEquals("QUOTE_NOT_APPROVED", error.getErrors().getFirst().code());
    assertEquals(n, f.events.size());
    assertEquals(money(150000), f.invoices.getFirst().getTongTien());
  }

  @Test
  void f09FinancialApprovalRequiresAdminNotJustAnyAuthenticatedUser() {
    var f = new Fixture();
    f.paid(0);
    role("EMPLOYEE");
    int n = f.events.size();
    for (var body : List.of(discount(50000), debt(100000))) {
      var e = assertThrows(WarrantyReadException.class, () -> f.update(body));
      assertEquals(ErrorCode.WARRANTY_FINANCIAL_APPROVAL_FORBIDDEN, e.getErrorCode());
      assertEquals("FINANCIAL_APPROVAL_FORBIDDEN", e.getErrors().getFirst().code());
    }
    assertEquals(n, f.events.size());
    verify(f.eventRepository, never()).lockInvoice(any());
  }

  @Test
  void f10SameKeyDifferentContentOrActorRejectsAndReplayNeverDiscountsTwice() {
    var f = new Fixture();
    f.paid(0);
    var r = f.update(discount(50000), KEY, 8L);
    int n = f.events.size();
    var replay = f.update(discount(50000), KEY, 8L);
    assertEquals(
        JSON.readTree(JSON.writeValueAsString(r)), JSON.readTree(JSON.writeValueAsString(replay)));
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.update(discount(25000), KEY, 8L));
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.update(discount(50000), KEY, 9L));
    assertEquals(n, f.events.size());
    assertEquals(money(100000), f.invoices.getFirst().getTongTien());
  }

  @Test
  void repeatedAuthorizedReductionsRemainUsableByQuoteApisAndSameVersionApply() {
    var f = new Fixture();
    f.paid(150000);
    f.update(discount(50000));
    f.update(discount(25000));
    var r = f.update(apply(1));
    assertEquals(money(75000), r.get("tong_tien"));
    assertFalse((Boolean) r.get("co_thay_doi"));
    f.create(second());
    f.event(2, AdminWarrantyQuoteEventServiceTest.send());
    f.event(2, AdminWarrantyQuoteEventServiceTest.decision("DONG_Y"));
    assertEquals(money(200000), f.invoices.getFirst().getTongTien());
  }

  @Test
  void fullDiscountToZeroIsNotAnInconsistentInvoice() {
    var f = new Fixture();
    f.paid(0);
    f.update(discount(150000));
    assertEquals(money(0), f.update(apply(1)).get("tong_tien"));
    f.create(second());
  }

  @Test
  void cashOnCancelledInvoiceNeverPaysANewInvoice() {
    var f = new Fixture();
    f.paid(150000);
    f.update(cancel());
    var old = f.invoices.getFirst();
    f.create(second());
    f.event(2, AdminWarrantyQuoteEventServiceTest.send());
    var r = f.event(2, AdminWarrantyQuoteEventServiceTest.decision("DONG_Y"));
    var current = AdminWarrantyQuoteEventServiceTest.invoice(r);
    assertEquals(money(0), moneyValue(current.daThu()));
    assertEquals(money(200000), current.conPhaiThu());
    assertEquals(money(150000), WarrantyFinanceCalculator.invoice(old, f.cash).conPhaiHoan());
    assertEquals(2, f.invoices.size());
  }

  @TestFactory
  Stream<DynamicTest> invalidRequestsNeverStartTransaction() {
    var cases = new ArrayList<Map<String, Object>>();
    for (String field : List.of("nguoi_duyet_id", "tong_tien", "don_hang_id", "trang_thai")) {
      var raw = discount(50000);
      raw.put(field, 1);
      cases.add(raw);
    }
    for (Object value : List.of(0, -1, "50000", true, 0.001, 1e20)) {
      var raw = discount(50000);
      raw.put("so_tien_mien_giam", value);
      cases.add(raw);
    }
    var noReason = cancel();
    noReason.remove("ly_do");
    cases.add(noReason);
    var noEvidence = cancel();
    noEvidence.put("bang_chung_urls", List.of());
    cases.add(noEvidence);
    var noGround = discount(5);
    noGround.remove("can_cu");
    cases.add(noGround);
    var malformedDate = debt(10);
    malformedDate.put("han_thanh_toan", "2026-02-30");
    cases.add(malformedDate);
    return cases.stream()
        .map(
            raw ->
                DynamicTest.dynamicTest(
                    raw.toString(),
                    () -> {
                      var txn = mock(WarrantyInvoiceTransactions.class);
                      var service = new AdminWarrantyInvoiceService(txn);
                      error(
                          ErrorCode.INVALID_WARRANTY_INVOICE,
                          () -> service.update("501", dto(raw), KEY, 8L));
                      verifyNoInteractions(txn);
                    }));
  }

  @Test
  void excessiveAmountsCancelledInvoicesMissingInvoicesAndVersions() {
    var f = new Fixture();
    f.paid(50000);
    error(ErrorCode.WARRANTY_INVOICE_AMOUNT_EXCEEDED, () -> f.update(discount(150001)));
    error(ErrorCode.WARRANTY_INVOICE_AMOUNT_EXCEEDED, () -> f.update(debt(100001)));
    var expired = debt(100000);
    expired.put("han_thanh_toan", "2000-01-01");
    error(ErrorCode.INVALID_WARRANTY_INVOICE, () -> f.update(expired));
    error(ErrorCode.NOT_FOUND, () -> f.update(apply(99)));
    var missing = cancel();
    missing.put("hoa_don_id", 999);
    error(ErrorCode.WARRANTY_INVOICE_NOT_FOUND, () -> f.update(missing));
    f.update(cancel());
    error(ErrorCode.WARRANTY_INVOICE_INACTIVE, () -> f.update(discount(50000)));
  }

  @Test
  void noInvoiceCannotBeCreatedByApply() {
    var f = new Fixture();
    f.create(first());
    f.state("DONG_Y", false);
    error(ErrorCode.WARRANTY_INVOICE_NOT_FOUND, () -> f.update(apply(1)));
    verify(f.eventRepository, never()).insertInvoice(any(), anyLong());
  }

  @Test
  void pendingOrCancelledMoneyIsIgnoredAndExistingRefundIsRespected() {
    var f = new Fixture();
    f.paid(150000);
    f.cash.add(
        SoQuyThuChi.builder()
            .id(9002L)
            .hoaDonBaoHanh(f.invoices.getFirst())
            .soTien(money(500000))
            .loaiPhieu(LoaiPhieuThuChi.THU)
            .trangThai(TrangThaiPhieuThuChi.HUY)
            .build());
    f.cash.add(
        SoQuyThuChi.builder()
            .id(9003L)
            .hoaDonBaoHanh(f.invoices.getFirst())
            .soTien(money(20000))
            .loaiPhieu(LoaiPhieuThuChi.CHI)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build());
    var r = f.update(discount(50000));
    finance(r, 150000, 100000, 150000, 20000, 0, 30000, "DA_THANH_TOAN", "HOAN_MOT_PHAN");
    assertEquals(3, f.cash.size());
  }

  @Test
  void sameVersionApplyDoesNotBypassInvalidConsentEvidence() {
    var f = new Fixture();
    f.paid(0);
    var last = f.events.getLast();
    var data = f.history.payload(last);
    var quote = f.history.object(data.get("bao_gia"));
    var decision = f.history.object(quote.get("quyet_dinh"));
    decision.put("bang_chung_urls", List.of());
    quote.put("quyet_dinh", decision);
    data.put("bao_gia", quote);
    last.setDuLieuChiTiet(JSON.writeValueAsString(data));
    error(ErrorCode.WARRANTY_QUOTE_NOT_APPROVED, () -> f.update(apply(1)));
  }

  @Test
  void missingKeyAndAnonymousActorCannotMutate() {
    var f = new Fixture();
    f.paid(0);
    error(ErrorCode.INVALID_WARRANTY_INVOICE, () -> f.update(cancel(), null, 8L));
    error(ErrorCode.UNAUTHORIZED, () -> f.update(cancel(), KEY, null));
  }

  @Test
  void databaseFailureRollsBackHistoryInvoiceAndSuccessfulDedupTogether() {
    var f = new Fixture();
    f.paid(0);
    doThrow(new IllegalStateException("simulated persistence failure"))
        .when(f.eventRepository)
        .flush();
    var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
    var status = mock(org.springframework.transaction.TransactionStatus.class);
    when(manager.getTransaction(any())).thenReturn(status);
    var proxy = new org.springframework.aop.framework.ProxyFactory(f.invoiceTransactions);
    proxy.addAdvice(
        new org.springframework.transaction.interceptor.TransactionInterceptor(
            manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
    var service = new AdminWarrantyInvoiceService((WarrantyInvoiceTransactions) proxy.getProxy());
    clearInvocations(f.dedup);
    error(
        ErrorCode.WARRANTY_INVOICE_FAILED,
        () -> service.update("501", dto(discount(50000)), KEY, 8L));
    verify(manager).rollback(status);
    verify(manager, never()).commit(any());
    verify(f.dedup, never()).complete(any(), any());
  }
}
