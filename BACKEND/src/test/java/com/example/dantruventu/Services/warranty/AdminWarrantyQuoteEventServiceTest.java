package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.AdminWarrantyEventServiceTest.*;
import static com.example.dantruventu.Services.warranty.AdminWarrantyQuoteServiceTest.body;
import static com.example.dantruventu.Services.warranty.AdminWarrantyQuoteServiceTest.first;
import static com.example.dantruventu.Services.warranty.AdminWarrantyQuoteServiceTest.item;
import static com.example.dantruventu.Services.warranty.AdminWarrantyQuoteServiceTest.second;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyQuoteEventRequest;
import com.example.dantruventu.DTO.Response.warranty.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.WarrantyQuoteEventRepository;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;

class AdminWarrantyQuoteEventServiceTest {
  static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

  static class Fixture extends AdminWarrantyQuoteServiceTest.Fixture {
    WarrantyQuoteEventRepository eventRepository = mock(WarrantyQuoteEventRepository.class);
    WarrantyQuoteEventTransactions transactions;
    AdminWarrantyQuoteEventService quoteEvents;

    Fixture() {
      doAnswer(
              a -> {
                HoaDonBaoHanh invoice = a.getArgument(0);
                invoice.setId(801L + invoices.size());
                invoice.setMaHoaDon("HDBH-" + invoice.getId());
                invoice.setNguoiLap(NguoiDung.builder().id(a.getArgument(1)).build());
                invoices.add(invoice);
                return null;
              })
          .when(eventRepository)
          .insertInvoice(any(), anyLong());
      transactions =
          new WarrantyQuoteEventTransactions(
              workflow,
              locks,
              histories,
              history,
              details,
              eventRepository,
              new WarrantyMutationSupport(dedup, JSON),
              JSON);
      quoteEvents = new AdminWarrantyQuoteEventService(transactions);
    }

    AdminWarrantyQuoteEventResponse event(int version, Map<String, Object> input) {
      var response =
          quoteEvents.save("501", "" + version, dto(input), UUID.randomUUID().toString(), 8L);
      messageWithoutNumbers(response.getMessage());
      return response.getData();
    }

    void approved(boolean paidDeposit) {
      create(first());
      event(1, send());
      event(1, decision("DONG_Y"));
      if (paidDeposit)
        cash.add(
            SoQuyThuChi.builder()
                .id(9001L)
                .hoaDonBaoHanh(invoices.getFirst())
                .phieuBaoHanh(ticket)
                .soTien(money(50000))
                .loaiPhieu(LoaiPhieuThuChi.THU)
                .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
                .build());
    }

    void overdue() {
      var event = events.getLast();
      var payload = history.payload(event);
      var quote = history.object(payload.get("bao_gia"));
      quote.put("han_phan_hoi", "2000-01-01T00:00:00+07:00");
      payload.put("bao_gia", quote);
      event.setDuLieuChiTiet(JSON.writeValueAsString(payload));
    }
  }

  static AdminWarrantyQuoteEventRequest dto(Map<String, Object> input) {
    return JSON.readValue(JSON.writeValueAsString(input), AdminWarrantyQuoteEventRequest.class);
  }

  static Map<String, Object> send() {
    return m(
        "hanh_dong",
        "GUI",
        "kenh",
        "TAI_QUAY",
        "thoi_diem",
        OffsetDateTime.now(VN).toString(),
        "bang_chung_urls",
        List.of("/media/bh/quote.jpg"));
  }

  static Map<String, Object> decision(String choice) {
    return m(
        "hanh_dong",
        "QUYET_DINH_KHACH",
        "quyet_dinh",
        choice,
        "kenh",
        choice.equals("DONG_Y") ? "TAI_QUAY" : "DIEN_THOAI",
        "thoi_diem",
        OffsetDateTime.now(VN).toString(),
        "bang_chung_urls",
        List.of("/media/bh/consent.jpg"),
        "ly_do",
        choice.equals("DONG_Y") ? null : "Khách không tiếp tục phần sửa");
  }

  static Map<String, Object> withdraw() {
    return m(
        "hanh_dong",
        "THU_HOI",
        "ly_do",
        "Cần gửi phiên bản khác",
        "thoi_diem",
        OffsetDateTime.now(VN).toString());
  }

  static AdminWarrantyDetailResponse.Invoice invoice(AdminWarrantyQuoteEventResponse response) {
    return (AdminWarrantyDetailResponse.Invoice) response.get("hoa_don");
  }

  static void common(
      Fixture f,
      AdminWarrantyQuoteEventResponse response,
      int version,
      String status,
      String action) {
    assertEquals(
        Set.of(
            "phieu_bao_hanh_id",
            "phien_ban_bao_gia",
            "trang_thai_bao_gia",
            "trang_thai_xu_ly",
            "hoa_don",
            "phieu_thu_chi_id",
            "quyet_dinh",
            "han_phan_hoi",
            "lich_su_id",
            "hanh_dong"),
        response.keySet().stream()
            .filter(
                k ->
                    Set.of(
                            "phieu_bao_hanh_id",
                            "phien_ban_bao_gia",
                            "trang_thai_bao_gia",
                            "trang_thai_xu_ly",
                            "hoa_don",
                            "phieu_thu_chi_id",
                            "quyet_dinh",
                            "han_phan_hoi",
                            "lich_su_id",
                            "hanh_dong")
                        .contains(k))
            .collect(java.util.stream.Collectors.toSet()));
    assertEquals(501L, response.get("phieu_bao_hanh_id"));
    assertEquals(version, response.get("phien_ban_bao_gia"));
    assertEquals(status, response.get("trang_thai_bao_gia"));
    assertEquals(action, response.get("hanh_dong"));
    assertEquals("DANG_KIEM_TRA", response.get("trang_thai_xu_ly"));
    assertNull(response.get("phieu_thu_chi_id"));
    assertNotNull(response.get("lich_su_id"));
    assertEquals(TrangThaiSerial.DANG_BAO_HANH, f.serial.getTrangThai());
    assertEquals(TrangThaiBaoHanh.DANG_KIEM_TRA, f.ticket.getTrangThaiXuLy());
  }

  @Test
  void e01F01SendDraftOnlyChangesQuote() {
    var f = new Fixture();
    f.create(first());
    var input = send();
    var response = f.event(1, input);
    common(f, response, 1, "CHO_PHAN_HOI", "GUI");
    assertNull(response.get("hoa_don"));
    assertNull(response.get("quyet_dinh"));
    assertEquals(input.get("kenh"), response.get("kenh"));
    assertEquals(
        OffsetDateTime.parse(input.get("thoi_diem").toString()),
        OffsetDateTime.parse(response.get("ngay_gui").toString()));
    assertTrue(f.cash.isEmpty());
    assertTrue(f.invoices.isEmpty());
    verify(f.eventRepository, never()).insertInvoice(any(), anyLong());
  }

  @Test
  void e02F02AcceptCreatesExactlyOneUnpaidInvoiceAndImmutableConsent() {
    var f = new Fixture();
    f.create(first());
    f.event(1, send());
    var response = f.event(1, decision("DONG_Y"));
    common(f, response, 1, "DONG_Y", "QUYET_DINH_KHACH");
    var inv = invoice(response);
    assertEquals(801L, inv.id());
    assertEquals("HDBH-801", inv.maHoaDon());
    assertEquals(150000, inv.tongTien().intValueExact());
    assertEquals(150000, inv.conPhaiThu().intValueExact());
    assertEquals(0, inv.daThu().signum());
    assertEquals(0, inv.daHoan().signum());
    assertEquals(TrangThaiThanhToanBaoHanh.CHUA_THANH_TOAN, inv.trangThaiThanhToan());
    assertEquals(TrangThaiHoanTienBaoHanh.KHONG_CAN_HOAN, inv.trangThaiHoanTien());
    assertEquals(true, response.get("hoa_don_moi"));
    assertEquals(1, f.invoices.size());
    assertEquals(8L, f.invoices.getFirst().getNguoiLap().getId());
    assertTrue(f.cash.isEmpty());
    var original = f.history.latestSection(f.events, "bao_gia").get("quyet_dinh");
    error(ErrorCode.WARRANTY_QUOTE_ALREADY_DECIDED, () -> f.event(1, decision("TU_CHOI")));
    assertEquals(original, f.history.latestSection(f.events, "bao_gia").get("quyet_dinh"));
    verify(f.eventRepository, times(1)).insertInvoice(any(), anyLong());
  }

  @Test
  void e05F03AcceptedVersion2AdjustsSameInvoiceWithoutDuplicatingDepositOrTotals() {
    var f = new Fixture();
    f.approved(true);
    var beforeInvoice = f.invoices.getFirst();
    var oldFee = f.fees.getFirst();
    var oldDecisionHistory = f.events.getLast().getDuLieuChiTiet();
    f.create(second());
    f.event(2, send());
    var response = f.event(2, decision("DONG_Y"));
    common(f, response, 2, "DONG_Y", "QUYET_DINH_KHACH");
    var inv = invoice(response);
    assertEquals(801L, inv.id());
    assertEquals(2, inv.phienBanBaoGia());
    assertEquals(200000, inv.tongTien().intValueExact());
    assertEquals(50000, inv.daThu().intValueExact());
    assertEquals(150000, inv.conPhaiThu().intValueExact());
    assertEquals(TrangThaiThanhToanBaoHanh.THANH_TOAN_MOT_PHAN, inv.trangThaiThanhToan());
    assertEquals(false, response.get("hoa_don_moi"));
    assertNotNull(response.get("lich_su_dieu_chinh_hoa_don_id"));
    assertSame(beforeInvoice, f.invoices.getFirst());
    assertEquals(1, f.invoices.size());
    assertEquals(1, f.cash.size());
    assertEquals(150000, oldFee.getThanhTienKhach().intValueExact());
    assertTrue(f.events.stream().anyMatch(e -> oldDecisionHistory.equals(e.getDuLieuChiTiet())));
    var audit =
        f.events.stream()
            .filter(e -> "DIEU_CHINH_HOA_DON_BAO_HANH".equals(e.getLoaiSuKien()))
            .findFirst()
            .orElseThrow();
    var adjustment = f.history.object(f.history.payload(audit).get("dieu_chinh_hoa_don"));
    assertEquals(
        150000,
        ((Number) f.history.object(adjustment.get("hoa_don_truoc")).get("tong_tien")).intValue());
    assertEquals(
        200000,
        ((Number) f.history.object(adjustment.get("hoa_don_sau")).get("tong_tien")).intValue());
  }

  @Test
  void adjustingInvoiceDoesNotInvalidateAlreadyStartedRetainedWork() {
    var f = new Fixture();
    f.approved(true);
    f.add(
        9002,
        "BAT_DAU_CONG_VIEC",
        m(
            "cong_viec_da_bat_dau",
            m("phien_ban_bao_gia", 1, "chi_tiet_phi_ids", List.of(1101), "noi_xu_ly", "CUA_HANG")));
    f.create(second());
    f.event(2, send());
    f.event(2, decision("DONG_Y"));
    var work = new WarrantyEventWorkAuthorization(f.history, f.details);
    assertDoesNotThrow(
        () ->
            work.progress(f.ticket, f.events, List.of(1101L), OffsetDateTime.now(VN), "CUA_HANG"));
    error(
        ErrorCode.WARRANTY_PAID_WORK_NOT_AUTHORIZED,
        () ->
            work.progress(f.ticket, f.events, List.of(1102L), OffsetDateTime.now(VN), "CUA_HANG"));
  }

  @Test
  void e02F04ZeroPriceScopeNeverCreatesInvoiceOrCash() {
    var f = new Fixture();
    f.create(body(null, List.of(item("HM_FREE", 0, true)), 0));
    f.event(1, send());
    var response = f.event(1, decision("DONG_Y"));
    common(f, response, 1, "DONG_Y", "QUYET_DINH_KHACH");
    assertNull(response.get("hoa_don"));
    assertEquals(false, response.get("hoa_don_moi"));
    assertEquals(0, ((BigDecimal) response.get("tong_tien_khach")).signum());
    assertTrue(f.invoices.isEmpty());
    assertTrue(f.cash.isEmpty());
  }

  @Test
  void e03F05RejectDoesNotCreateInvoiceOrFinishDevice() {
    var f = new Fixture();
    f.create(first());
    f.event(1, send());
    var response = f.event(1, decision("TU_CHOI"));
    common(f, response, 1, "TU_CHOI", "QUYET_DINH_KHACH");
    assertNull(response.get("hoa_don"));
    assertEquals(false, response.get("duoc_thuc_hien_phan_co_phi"));
    assertFalse(response.containsKey("hoa_don_moi"));
    assertEquals(
        "Khách không tiếp tục phần sửa", f.history.object(response.get("quyet_dinh")).get("ly_do"));
    assertTrue(f.invoices.isEmpty());
    assertTrue(f.cash.isEmpty());
  }

  @Test
  void e06F06RejectVersion2KeepsEarlierApprovedInspectionFee() {
    var f = new Fixture();
    var inspection = item("HM01", 50000, false);
    inspection.put("noi_dung", "Phí kiểm tra đã chấp thuận trước");
    inspection.put("van_phat_sinh_khi_khong_sua", true);
    f.create(body(null, List.of(inspection), 0));
    f.event(1, send());
    f.event(1, decision("DONG_Y"));
    var increased = new LinkedHashMap<>(inspection);
    increased.put("don_gia_khach", 200000);
    f.create(body(1, List.of(increased), 0));
    f.event(2, send());
    var response = f.event(2, decision("TU_CHOI"));
    common(f, response, 2, "TU_CHOI", "QUYET_DINH_KHACH");
    assertEquals(50000, invoice(response).tongTien().intValueExact());
    assertEquals(1, invoice(response).phienBanBaoGia());
    assertEquals(1, f.invoices.size());
    assertEquals(
        List.of(
            m(
                "chi_tiet_phi_id",
                1101L,
                "noi_dung",
                "Phí kiểm tra đã chấp thuận trước",
                "so_tien",
                new BigDecimal("50000.00"))),
        response.get("khoan_da_duyet_van_ap_dung"));
    assertTrue(f.cash.isEmpty());
  }

  @Test
  void e04F07WithdrawOnlyPendingQuote() {
    var f = new Fixture();
    f.create(first());
    f.event(1, send());
    var response = f.event(1, withdraw());
    common(f, response, 1, "HET_HIEU_LUC", "THU_HOI");
    assertEquals("Cần gửi phiên bản khác", response.get("ly_do_het_hieu_luc"));
    assertNull(response.get("hoa_don"));
    assertNull(response.get("quyet_dinh"));
    error(ErrorCode.WARRANTY_QUOTE_EXPIRED, () -> f.event(1, decision("DONG_Y")));
  }

  @Test
  void e07F08SendVersion2KeepsOriginalInvoiceAndNoInheritedConsent() {
    var f = new Fixture();
    f.approved(true);
    f.create(second());
    var response = f.event(2, send());
    common(f, response, 2, "CHO_PHAN_HOI", "GUI");
    assertEquals(1, invoice(response).phienBanBaoGia());
    assertEquals(150000, invoice(response).tongTien().intValueExact());
    assertEquals(100000, invoice(response).conPhaiThu().intValueExact());
    assertEquals(50000, invoice(response).daThu().intValueExact());
    assertNull(response.get("quyet_dinh"));
    assertEquals(1, f.invoices.size());
    assertEquals(1, f.cash.size());
  }

  @Test
  void e08F09WithdrawVersion2DoesNotCancelOrRefundOriginalInvoice() {
    var f = new Fixture();
    f.approved(true);
    f.create(second());
    f.event(2, send());
    var response = f.event(2, withdraw());
    common(f, response, 2, "HET_HIEU_LUC", "THU_HOI");
    assertEquals(TrangThaiHoaDonBaoHanh.HIEU_LUC, invoice(response).trangThai());
    assertEquals(1, invoice(response).phienBanBaoGia());
    assertEquals(100000, invoice(response).conPhaiThu().intValueExact());
    assertEquals(0, invoice(response).conPhaiHoan().signum());
    assertEquals(1, f.cash.size());
  }

  @Test
  void f10ExpiredQuoteBlocksBackdatedConsentAndRecordsOnlyOneFactualExpiry() {
    var f = new Fixture();
    f.create(first());
    f.event(1, send());
    f.overdue();
    int before = f.events.size();
    var late = decision("DONG_Y");
    late.put("thoi_diem", "1999-12-31T00:00:00+07:00");
    var failure = assertThrows(WarrantyReadException.class, () -> f.event(1, late));
    assertEquals(ErrorCode.WARRANTY_QUOTE_EXPIRED, failure.getErrorCode());
    assertEquals("QUOTE_EXPIRED", failure.getErrors().getFirst().code());
    assertEquals(TrangThaiBaoGiaBaoHanh.HET_HIEU_LUC, f.ticket.getTrangThaiBaoGia());
    assertEquals(before + 1, f.events.size());
    assertTrue(f.invoices.isEmpty());
    assertTrue(f.cash.isEmpty());
    error(ErrorCode.WARRANTY_QUOTE_EXPIRED, () -> f.event(1, decision("DONG_Y")));
    assertEquals(before + 1, f.events.size());
  }

  @Test
  void expiryAuditCommitsSeparatelyAfterRejectedRequestTransactionHasRolledBack() {
    var f = new Fixture();
    f.create(first());
    f.overdue();
    var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
    var rejected = mock(org.springframework.transaction.TransactionStatus.class);
    var expiry = mock(org.springframework.transaction.TransactionStatus.class);
    when(manager.getTransaction(any())).thenReturn(rejected, expiry);
    var factory = new org.springframework.aop.framework.ProxyFactory(f.transactions);
    factory.addAdvice(
        new org.springframework.transaction.interceptor.TransactionInterceptor(
            manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
    var facade =
        new AdminWarrantyQuoteEventService((WarrantyQuoteEventTransactions) factory.getProxy());
    clearInvocations(f.dedup);
    error(ErrorCode.WARRANTY_QUOTE_EXPIRED, () -> facade.save("501", "1", dto(send()), KEY, 8L));
    var ordered = inOrder(manager);
    ordered.verify(manager).getTransaction(any());
    ordered.verify(manager).rollback(rejected);
    ordered.verify(manager).getTransaction(any());
    ordered.verify(manager).commit(expiry);
    assertEquals(TrangThaiBaoGiaBaoHanh.HET_HIEU_LUC, f.ticket.getTrangThaiBaoGia());
    assertTrue(f.invoices.isEmpty());
    assertTrue(f.cash.isEmpty());
    verify(f.dedup, never()).complete(anyString(), anyString());
  }

  @TestFactory
  Stream<DynamicTest> f11CannotOverwriteAcceptedOrRejectedDecisionEvenAfterNewVersion() {
    return Stream.of("DONG_Y", "TU_CHOI")
        .map(
            choice ->
                DynamicTest.dynamicTest(
                    choice,
                    () -> {
                      var f = new Fixture();
                      f.create(first());
                      f.event(1, send());
                      f.event(1, decision(choice));
                      f.create(second());
                      var saved = f.events.stream().map(LichSuBaoHanh::getDuLieuChiTiet).toList();
                      var failure =
                          assertThrows(WarrantyReadException.class, () -> f.event(1, withdraw()));
                      assertEquals(
                          ErrorCode.WARRANTY_QUOTE_ALREADY_DECIDED, failure.getErrorCode());
                      assertEquals("QUOTE_ALREADY_DECIDED", failure.getErrors().getFirst().code());
                      assertEquals(
                          saved, f.events.stream().map(LichSuBaoHanh::getDuLieuChiTiet).toList());
                    }));
  }

  @Test
  void f12ReplayDoesNotRepeatInvoiceHistoryAndScopesActorPathBody() {
    var f = new Fixture();
    f.create(first());
    f.event(1, send());
    var request = dto(decision("DONG_Y"));
    var result = f.quoteEvents.save("501", "1", request, KEY, 8L);
    var eventCount = f.events.size();
    assertEquals(
        JSON.writeValueAsString(result),
        JSON.writeValueAsString(f.quoteEvents.save("501", "1", request, KEY, 8L)));
    assertEquals(eventCount, f.events.size());
    assertEquals(1, f.invoices.size());
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.quoteEvents.save("501", "1", dto(withdraw()), KEY, 8L));
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.quoteEvents.save("501", "1", request, KEY, 9L));
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.quoteEvents.save("501", "2", request, KEY, 8L));
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.quoteEvents.save("502", "1", request, KEY, 8L));
    verify(f.eventRepository, times(1)).insertInvoice(any(), anyLong());
  }

  @TestFactory
  Stream<DynamicTest> strictBodyValidation() {
    var invalid = new ArrayList<Map<String, Object>>();
    for (String field : List.of("thoi_diem", "kenh", "bang_chung_urls")) {
      var b = send();
      b.remove(field);
      invalid.add(b);
    }
    for (Object value : List.of("", 1, true)) {
      var b = send();
      b.put("kenh", value);
      invalid.add(b);
    }
    var extra = send();
    extra.put("tong_tien", null);
    invalid.add(extra);
    var noEvidence = send();
    noEvidence.put("bang_chung_urls", List.of());
    invalid.add(noEvidence);
    var noOffset = send();
    noOffset.put("thoi_diem", "2026-10-12T09:30:00");
    invalid.add(noOffset);
    var future = send();
    future.put("thoi_diem", "2100-01-01T00:00:00+07:00");
    invalid.add(future);
    var wrongChoice = decision("DONG_Y");
    wrongChoice.put("quyet_dinh", "NHAP");
    invalid.add(wrongChoice);
    var noReason = withdraw();
    noReason.put("ly_do", " ");
    invalid.add(noReason);
    var wrongWithdrawal = withdraw();
    wrongWithdrawal.put("kenh", null);
    invalid.add(wrongWithdrawal);
    return invalid.stream()
        .map(
            input ->
                DynamicTest.dynamicTest(
                    JSON.writeValueAsString(input),
                    () -> {
                      var f = new Fixture();
                      error(ErrorCode.INVALID_WARRANTY_QUOTE_EVENT, () -> f.event(1, input));
                      verify(f.dedup, never()).acquire(anyString(), anyLong(), anyString());
                      verify(f.eventRepository, never()).insertInvoice(any(), anyLong());
                    }));
  }

  @Test
  void invalidPathMissingVersionWrongStateAndMissingKeyNeverWriteInvoice() {
    var f = new Fixture();
    f.create(first());
    error(
        ErrorCode.INVALID_WARRANTY_QUOTE_EVENT,
        () -> f.quoteEvents.save("501", "0", dto(send()), KEY, 8L));
    error(
        ErrorCode.INVALID_WARRANTY_QUOTE_EVENT,
        () -> f.quoteEvents.save("501", "1", dto(send()), null, 8L));
    error(ErrorCode.NOT_FOUND, () -> f.event(2, send()));
    error(ErrorCode.WARRANTY_QUOTE_EVENT_TRANSITION_INVALID, () -> f.event(1, decision("DONG_Y")));
    error(ErrorCode.WARRANTY_QUOTE_EVENT_TRANSITION_INVALID, () -> f.event(1, withdraw()));
    verify(f.eventRepository, never()).insertInvoice(any(), anyLong());
  }

  @Test
  void alreadyCompletedMultipleInvoicesAndTamperedSnapshotFailClosed() {
    var complete = new Fixture();
    complete.create(first());
    complete.ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
    error(ErrorCode.WARRANTY_ALREADY_COMPLETED, () -> complete.event(1, send()));
    var multiple = new Fixture();
    multiple.approved(false);
    multiple.create(second());
    multiple.invoices.add(
        HoaDonBaoHanh.builder().id(999L).trangThai(TrangThaiHoaDonBaoHanh.HIEU_LUC).build());
    error(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA, () -> multiple.event(2, send()));
    var tampered = new Fixture();
    tampered.create(first());
    tampered.fees.getFirst().setThanhTienKhach(money(1));
    error(ErrorCode.INVALID_WARRANTY_HISTORY, () -> tampered.event(1, send()));
  }

  @Test
  void updatingInvoiceFailureRollsBackEntireTransactionAndDoesNotCompleteKey() {
    var f = new Fixture();
    f.approved(true);
    f.create(second());
    f.event(2, send());
    doThrow(new IllegalStateException("simulated invoice flush failure"))
        .when(f.eventRepository)
        .flush();
    var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
    var status = mock(org.springframework.transaction.TransactionStatus.class);
    when(manager.getTransaction(any())).thenReturn(status);
    var factory = new org.springframework.aop.framework.ProxyFactory(f.transactions);
    factory.addAdvice(
        new org.springframework.transaction.interceptor.TransactionInterceptor(
            manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
    var facade =
        new AdminWarrantyQuoteEventService((WarrantyQuoteEventTransactions) factory.getProxy());
    clearInvocations(f.dedup);
    error(
        ErrorCode.WARRANTY_QUOTE_EVENT_FAILED,
        () -> facade.save("501", "2", dto(decision("DONG_Y")), KEY, 8L));
    verify(manager).rollback(status);
    verify(manager, never()).commit(any());
    verify(f.dedup, never()).complete(anyString(), anyString());
  }

  @TestFactory
  Stream<DynamicTest> oldReplayMessagesAreTranslatedWithoutNumbers() {
    var cases =
        Map.ofEntries(
            Map.entry(
                "Lưu quyết định từ chối của yêu cầu 880",
                "Lưu quyết định từ chối của yêu cầu tiếp nhận"),
            Map.entry("Xác nhận chi phí đơn vị100000", "Xác nhận chi phí đơn vị thành công"),
            Map.entry("Xác nhận chi phí đơn vị150000.50", "Xác nhận chi phí đơn vị thành công"),
            Map.entry("Tạo báo giá nháp phiên bản12", "Tạo báo giá nháp thành công"),
            Map.entry(
                "Tạo bản mới, giữ nguyên consent và invoice bản đã duyệt",
                "Tạo báo giá mới, giữ nguyên chấp thuận và hóa đơn đã duyệt"),
            Map.entry("Lưu phiên bản phạm vi0đ", "Lưu báo giá không thu tiền khách thành công"),
            Map.entry(
                "Gửi phiên bản2, chưa tăng khoản phải thu",
                "Gửi báo giá mới, giữ nguyên khoản phải thu đã được duyệt"),
            Map.entry(
                "Thu hồi bản2 đang chờ, invoice bản1 vẫn hiệu lực",
                "Thu hồi báo giá đang chờ, giữ nguyên hóa đơn đã được duyệt"),
            Map.entry(
                "Khách đồng ý, lập invoice từ khoản150000",
                "Khách đồng ý báo giá, lập hóa đơn bảo hành thành công"),
            Map.entry(
                "Khách đồng ý bản2, điều chỉnh cùng invoice hiệu lực",
                "Khách đồng ý báo giá mới, điều chỉnh hóa đơn đang hiệu lực"),
            Map.entry(
                "Khách đồng ý phạm vi0đ, không invoice thu khách",
                "Khách đồng ý phạm vi miễn phí, không tạo hóa đơn thu khách"));
    return cases.entrySet().stream()
        .map(
            e ->
                DynamicTest.dynamicTest(
                    e.getKey(),
                    () -> {
                      assertEquals(
                          e.getValue(), WarrantyMutationSupport.normalizeLegacyMessage(e.getKey()));
                      messageWithoutNumbers(
                          WarrantyMutationSupport.normalizeLegacyMessage(e.getKey()));
                      assertEquals(
                          e.getValue(),
                          WarrantyMutationSupport.normalizeLegacyMessage(e.getValue()));
                    }));
  }

  @Test
  void oldSuccessfulReplayOnlyChangesPublicMessageNotStoredDataOrIdempotency() {
    var dedup = mock(com.example.dantruventu.Repository.order.SalesIdempotencyRepository.class);
    var data = new AdminWarrantyQuoteEventResponse();
    data.putAll(
        m(
            "phieu_bao_hanh_id",
            501,
            "phien_ban_bao_gia",
            2,
            "hoa_don",
            m("id", 801, "tong_tien", new BigDecimal("150000.00"))));
    var old =
        com.example.dantruventu.DTO.Response.ApiResponse.<AdminWarrantyQuoteEventResponse>builder()
            .status(200)
            .message("Khách đồng ý, lập invoice từ khoản150000")
            .data(data)
            .build();
    String storedJson = JSON.writeValueAsString(old);
    when(dedup.acquire(anyString(), anyLong(), anyString()))
        .thenAnswer(
            a ->
                new com.example.dantruventu.Repository.order.SalesIdempotencyRepository.Entry(
                    8L, a.getArgument(2), storedJson));
    var replay =
        new WarrantyMutationSupport(dedup, JSON)
            .begin(
                "BH-QEV-",
                KEY,
                8L,
                "POST:/api/v1/admin/warranties/501/quotes/2/events",
                m("hanh_dong", "QUYET_DINH_KHACH"),
                AdminWarrantyQuoteEventResponse.class,
                ErrorCode.INVALID_WARRANTY_QUOTE_EVENT)
            .previous();
    assertEquals("Khách đồng ý báo giá, lập hóa đơn bảo hành thành công", replay.getMessage());
    assertEquals(
        JSON.readTree(storedJson).get("data"),
        JSON.readTree(JSON.writeValueAsString(replay.getData())));
    assertEquals(200, replay.getStatus());
    verify(dedup, never()).complete(anyString(), anyString());
  }

  @Test
  void auditEveryFixedWarrantySuccessAndErrorMessageWithoutAddingAProjectFile() throws Exception {
    Path root = Path.of("src/main/java/com/example/dantruventu");
    List<Path> sources = new ArrayList<>();
    for (String directory : List.of("Services/warranty", "Repository/warranty")) {
      try (var paths = Files.list(root.resolve(directory))) {
        sources.addAll(paths.filter(p -> p.toString().endsWith(".java")).toList());
      }
    }
    sources.add(root.resolve("Controller/warranty/AdminWarrantyController.java"));
    Set<String> successMessages = new TreeSet<>();
    var assignment = Pattern.compile("\\bmessage\\s*=\\s*([^;]+);");
    var quoted = Pattern.compile("\"([^\"]*)\"");
    for (var path : sources) {
      String source = Files.readString(path);
      var matches = assignment.matcher(source);
      while (matches.find()) {
        String expression = matches.group(1);
        assertFalse(
            quoted.matcher(expression).replaceAll("\"\"").contains("+"),
            () -> "Dynamic warranty message: " + path);
        var literals = quoted.matcher(expression);
        while (literals.find())
          if (literals.group(1).contains(" ")) successMessages.add(literals.group(1));
      }
      var builder = Pattern.compile("\\.message\\(\"([^\"]+)\"\\)").matcher(source);
      while (builder.find()) successMessages.add(builder.group(1));
      var completion =
          Pattern.compile("mutations\\.complete\\(\\s*replay,\\s*\\d+,\\s*\"([^\"]+)\"")
              .matcher(source);
      while (completion.find()) successMessages.add(completion.group(1));
      var returnedMessage =
          Pattern.compile("case \"[^\"]+\" -> \"([^\"]* [^\"]*)\";").matcher(source);
      while (returnedMessage.find()) successMessages.add(returnedMessage.group(1));
      var customErrors =
          Pattern.compile("(?:invalid\\(|new AppException\\([^,]+,\\s*)\"([^\"]+)\"")
              .matcher(source);
      while (customErrors.find()) messageWithoutNumbers(customErrors.group(1));
    }
    assertEquals(91, successMessages.size(), successMessages.toString());
    successMessages.forEach(AdminWarrantyEventServiceTest::messageWithoutNumbers);
    for (ErrorCode code : ErrorCode.values())
      if (code.name().contains("WARRANTY")
          || code.name().equals("INTAKE_REQUEST_NOT_FOUND")
          || code.name().equals("APPROVED_FEE_REMOVAL_UNJUSTIFIED"))
        messageWithoutNumbers(code.getMessage());
    assertFalse(Files.exists(root.resolve("Services/warranty/WarrantyMessages.java")));
    System.out.println("WARRANTY_SUCCESS_MESSAGES=" + JSON.writeValueAsString(successMessages));
  }
}
