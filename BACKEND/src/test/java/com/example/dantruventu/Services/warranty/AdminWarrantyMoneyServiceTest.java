package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.AdminWarrantyEventServiceTest.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyMoneyRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.cashbook.*;
import com.example.dantruventu.Repository.warranty.*;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.order.OrderEvents;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class AdminWarrantyMoneyServiceTest {
  static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

  static class Fixture extends AdminWarrantyInvoiceServiceTest.Fixture {
    WarrantyMoneyRepository moneyRepository = mock(WarrantyMoneyRepository.class);
    SoQuyThuChiRepository cashRepository = mock(SoQuyThuChiRepository.class);
    LoaiThuChiRepository types = mock(LoaiThuChiRepository.class);
    WarrantyMoneySources sources = new WarrantyMoneySources(history);
    CashbookService cashbook =
        new CashbookService(cashRepository, types, dedup, JSON, mock(OrderEvents.class));
    WarrantyMoneyTransactions moneyTransactions;
    AdminWarrantyMoneyService moneyService;
    long nextCashId = 10000;

    Fixture() {
      when(types.findByMaLoaiForUpdate(anyString()))
          .thenAnswer(
              a ->
                  Optional.of(
                      LoaiThuChi.builder()
                          .id(12L)
                          .maLoai(a.getArgument(0))
                          .tenLoai("Loại bảo hành")
                          .loaiPhieu(
                              a.<String>getArgument(0).startsWith("CHI_")
                                  ? LoaiPhieuThuChi.CHI
                                  : LoaiPhieuThuChi.THU)
                          .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
                          .build()));
      when(moneyRepository.actor(anyLong()))
          .thenAnswer(a -> NguoiDung.builder().id(a.getArgument(0)).build());
      when(moneyRepository.referenceExists(anyString()))
          .thenAnswer(
              a ->
                  cash.stream()
                      .anyMatch(
                          v ->
                              a.<String>getArgument(0)
                                  .equalsIgnoreCase(v.getMaChungTuThamChieu())));
      when(cashRepository.saveAndFlush(any()))
          .thenAnswer(
              a -> {
                SoQuyThuChi voucher = a.getArgument(0);
                voucher.setId(nextCashId++);
                cash.add(voucher);
                return voucher;
              });
      moneyTransactions =
          new WarrantyMoneyTransactions(
              workflow,
              locks,
              histories,
              history,
              details,
              repository,
              moneyRepository,
              sources,
              cashbook,
              new WarrantyMutationSupport(dedup, JSON),
              JSON);
      moneyService = new AdminWarrantyMoneyService(moneyTransactions);
    }

    ApiResponse<AdminWarrantyMoneyResponse> receive(Map<String, Object> body) {
      return receive(body, UUID.randomUUID().toString(), 8L);
    }

    ApiResponse<AdminWarrantyMoneyResponse> receive(
        Map<String, Object> body, String key, Long actor) {
      var result = moneyService.save("501", moneyDto(body), key, actor);
      messageWithoutNumbers(result.getMessage());
      return result;
    }

    void cost(long source, long value) {
      ticket.setChiPhiNccXacNhan(money(value));
      add(
          source,
          "GHI_CHI_PHI_DON_VI",
          m(
              "bao_phi_don_vi",
              m(
                  "nha_cung_cap_id",
                  3,
                  "da_xac_nhan",
                  true,
                  "can_cu",
                  "Biên bản xác nhận chi phí",
                  "hang_muc",
                  List.of(
                      m("ma_hang_muc", "HM01", "chi_phi", value, "ben_chiu_phi", "CUA_HANG")))));
    }

    void obligation(long goods) {
      add(
          1040,
          "XAC_NHAN_NGHIA_VU",
          m(
              "doi_soat_nha_cung_cap",
              m(
                  "nha_cung_cap_id",
                  3,
                  "da_xac_nhan",
                  true,
                  "so_luong_can_bu",
                  goods,
                  "so_luong_da_bu",
                  0,
                  "so_luong_con_bu",
                  goods,
                  "so_tien_nghia_vu",
                  100000,
                  "so_tien_da_nhan",
                  0,
                  "so_tien_con_doi_soat",
                  100000)));
    }
  }

  @BeforeEach
  void setup() {
    TransactionSynchronizationManager.setActualTransactionActive(true);
    AdminWarrantyInvoiceServiceTest.role("ADMIN");
  }

  @AfterEach
  void cleanup() {
    TransactionSynchronizationManager.clear();
    SecurityContextHolder.clearContext();
  }

  static AdminWarrantyMoneyRequest moneyDto(Map<String, Object> body) {
    return JSON.readValue(JSON.writeValueAsString(body), AdminWarrantyMoneyRequest.class);
  }

  static Map<String, Object> input(String kind, long value) {
    var body =
        m(
            "loai",
            kind,
            "so_tien",
            value,
            "phuong_thuc_thanh_toan",
            "CHUYEN_KHOAN",
            "ten_nguoi_nop_nhan",
            "Nguyễn Văn An",
            "ngay_ghi_nhan",
            OffsetDateTime.now(VN).toString(),
            "ma_chung_tu_tham_chieu",
            "BH-TEST-" + UUID.randomUUID(),
            "chung_tu_urls",
            List.of("/media/bh/money.jpg"));
    switch (kind) {
      case "THU_KHACH", "HOAN_KHACH" -> body.put("hoa_don_bao_hanh_id", 801);
      case "CHI_DON_VI" -> {
        body.put("nha_cung_cap_id", 3);
        body.put("chi_phi_lich_su_id", 1003);
      }
      case "THU_HOAN_DON_VI" -> {
        body.put("nha_cung_cap_id", 3);
        body.put("giao_dich_chi_goc_id", 10000);
      }
      case "THU_DOI_SOAT_DON_VI" -> {
        body.put("nha_cung_cap_id", 3);
        body.put("nghia_vu_lich_su_id", 1040);
      }
    }
    return body;
  }

  static Map<?, ?> part(AdminWarrantyMoneyResponse data, String key) {
    return (Map<?, ?>) data.get(key);
  }

  static BigDecimal decimal(Object raw) {
    return new BigDecimal(raw.toString()).setScale(2);
  }

  static void amountEquals(long expected, Object actual) {
    assertEquals(BigDecimal.valueOf(expected).setScale(2), decimal(actual));
  }

  @Test
  void e01F01F02CollectDepositAndRemainderUsingCurrentInvoice() {
    var f = new Fixture();
    f.approved(false);
    var one = f.receive(input("THU_KHACH", 50000)).getData();
    var finance = (AdminWarrantyDetailResponse.Invoice) one.get("hoa_don");
    amountEquals(50000, finance.daThu());
    amountEquals(100000, finance.conPhaiThu());
    assertEquals(TrangThaiThanhToanBaoHanh.THANH_TOAN_MOT_PHAN, finance.trangThaiThanhToan());
    var two = f.receive(input("THU_KHACH", 100000)).getData();
    var after = (AdminWarrantyDetailResponse.Invoice) two.get("hoa_don");
    amountEquals(150000, after.daThu());
    amountEquals(0, after.conPhaiThu());
    assertEquals(TrangThaiThanhToanBaoHanh.DA_THANH_TOAN, after.trangThaiThanhToan());
    var cash = f.cash.getFirst();
    assertEquals("PT-BH-10000", cash.getMaPhieu());
    assertSame(f.ticket, cash.getPhieuBaoHanh());
    assertSame(f.invoices.getFirst(), cash.getHoaDonBaoHanh());
    assertNull(cash.getNhaCungCap());
    assertEquals(NhomNguoiNopNhanEnum.KHACH_HANG, cash.getNhomNguoiNopNhan());
    assertEquals(NguonTaoPhieuThuChi.TU_DONG, cash.getNguonTao());
    assertEquals(8L, cash.getNguoiTao().getId());
    assertNull(one.get("chi_phi_don_vi"));
    assertNull(one.get("doi_soat_ncc"));
    assertEquals(4, part(one, "lien_ket_nguon").size());
    assertEquals(801L, part(one, "lien_ket_nguon").get("hoa_don_bao_hanh_id"));
    assertNull(part(one, "lien_ket_nguon").get("chi_phi_lich_su_id"));
    verify(f.locks, never()).lockSerial(anyLong());
    assertEquals(TrangThaiSerial.DANG_BAO_HANH, f.serial.getTrangThai());
    assertEquals(TrangThaiBaoHanh.DANG_KIEM_TRA, f.ticket.getTrangThaiXuLy());
    assertEquals(1, f.invoices.size());
    var ordered = inOrder(f.locks, f.workflow, f.moneyRepository, f.cashRepository);
    ordered.verify(f.workflow, atLeastOnce()).ticketOrigin(501L);
    ordered.verify(f.locks, atLeastOnce()).lockOrder(1001L);
    ordered.verify(f.locks, atLeastOnce()).lockLine(2001L);
    ordered.verify(f.workflow, atLeastOnce()).lockTicket(501L);
    ordered.verify(f.moneyRepository, atLeastOnce()).lockReferenceRegistry("THU_BAO_HANH");
    ordered.verify(f.moneyRepository, atLeastOnce()).referenceExists(anyString());
    ordered.verify(f.cashRepository, atLeastOnce()).saveAndFlush(any());
  }

  @TestFactory
  Stream<DynamicTest> e02F03F04F05RefundFullPartialAndCancelledAfterCompletion() {
    return Stream.of(50000L, 100000L, 150000L)
        .map(
            discount ->
                DynamicTest.dynamicTest(
                    "refund-" + discount,
                    () -> {
                      var f = new Fixture();
                      f.paid(150000);
                      if (discount == 150000) {
                        f.update(AdminWarrantyInvoiceServiceTest.cancel());
                        f.ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
                      } else f.update(AdminWarrantyInvoiceServiceTest.discount(discount));
                      var r = f.receive(input("HOAN_KHACH", 50000)).getData();
                      var invoice = (AdminWarrantyDetailResponse.Invoice) r.get("hoa_don");
                      amountEquals(150000, invoice.daThu());
                      amountEquals(50000, invoice.daHoan());
                      amountEquals(discount - 50000, invoice.conPhaiHoan());
                      assertEquals(
                          discount == 50000
                              ? TrangThaiHoanTienBaoHanh.DA_HOAN
                              : TrangThaiHoanTienBaoHanh.HOAN_MOT_PHAN,
                          invoice.trangThaiHoanTien());
                      if (discount == 150000) {
                        assertNull(invoice.trangThaiThanhToan());
                        amountEquals(0, invoice.khoanPhaiThuHieuLuc());
                        amountEquals(150000, invoice.tongTien());
                      }
                      assertEquals(LoaiPhieuThuChi.CHI, f.cash.getLast().getLoaiPhieu());
                    }));
  }

  @TestFactory
  Stream<DynamicTest> e03E06F06F07F08ProviderExpenseIndependentOfCustomer() {
    return Stream.of(50000L, 100000L)
        .flatMap(
            value ->
                Stream.of(false, true)
                    .map(
                        invoiceExists ->
                            DynamicTest.dynamicTest(
                                "cost-" + value + "-" + invoiceExists,
                                () -> {
                                  var f = new Fixture();
                                  if (invoiceExists) f.paid(150000);
                                  f.cost(1003, 100000);
                                  var result = f.receive(input("CHI_DON_VI", value)).getData();
                                  amountEquals(value, part(result, "chi_phi_don_vi").get("da_chi"));
                                  amountEquals(
                                      100000 - value,
                                      part(result, "chi_phi_don_vi").get("con_phai_chi"));
                                  if (invoiceExists)
                                    amountEquals(
                                        150000,
                                        ((AdminWarrantyDetailResponse.Invoice)
                                                result.get("hoa_don"))
                                            .daThu());
                                  else assertNull(result.get("hoa_don"));
                                  var voucher = f.cash.getLast();
                                  assertNull(voucher.getHoaDonBaoHanh());
                                  assertEquals(3L, voucher.getNhaCungCap().getId());
                                  assertEquals("Trung tâm A", voucher.getTenNguoiNopNhan());
                                  assertEquals("PC-BH-10000", voucher.getMaPhieu());
                                  assertEquals(
                                      NhomNguoiNopNhanEnum.NHA_CUNG_CAP,
                                      voucher.getNhomNguoiNopNhan());
                                  assertNull(
                                      part(result, "lien_ket_nguon").get("hoa_don_bao_hanh_id"));
                                  assertNull(result.get("doi_soat_ncc"));
                                })));
  }

  @TestFactory
  Stream<DynamicTest> e04E07F09F10ProviderRefundCappedByOriginalPaymentAndReducedCost() {
    return Stream.of(10000L, 20000L)
        .map(
            value ->
                DynamicTest.dynamicTest(
                    "provider-refund-" + value,
                    () -> {
                      var f = new Fixture();
                      f.cost(1003, 100000);
                      f.receive(input("CHI_DON_VI", 100000));
                      f.cost(1100, 80000);
                      var result = f.receive(input("THU_HOAN_DON_VI", value)).getData();
                      amountEquals(100000, part(result, "chi_phi_don_vi").get("da_chi"));
                      amountEquals(value, part(result, "chi_phi_don_vi").get("da_nhan_hoan"));
                      amountEquals(
                          20000 - value, part(result, "chi_phi_don_vi").get("con_phai_nhan_hoan"));
                      assertNull(f.cash.getLast().getHoaDonBaoHanh());
                      assertNull(result.get("hoa_don"));
                      assertEquals(LoaiPhieuThuChi.THU, f.cash.getLast().getLoaiPhieu());
                      int before = f.cash.size();
                      error(
                          ErrorCode.WARRANTY_MONEY_EXCEEDS_OUTSTANDING,
                          () -> f.receive(input("THU_HOAN_DON_VI", 20001 - value)));
                      assertEquals(before, f.cash.size());
                    }));
  }

  @TestFactory
  Stream<DynamicTest> e05E08F11F12SettlementIsNotExpenseRefundAndRequiresMoneyAndGoodsFinished() {
    return Stream.of(0L, 1L)
        .flatMap(
            goods ->
                Stream.of(40000L, 100000L)
                    .map(
                        value ->
                            DynamicTest.dynamicTest(
                                "settlement-" + goods + "-" + value,
                                () -> {
                                  var f = new Fixture();
                                  f.obligation(goods);
                                  f.ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
                                  var result =
                                      f.receive(input("THU_DOI_SOAT_DON_VI", value)).getData();
                                  var state = part(result, "doi_soat_ncc");
                                  amountEquals(value, state.get("so_tien_da_nhan"));
                                  amountEquals(100000 - value, state.get("so_tien_con_doi_soat"));
                                  assertEquals(
                                      goods == 0 && value == 100000, state.get("da_giai_quyet"));
                                  assertNull(result.get("chi_phi_don_vi"));
                                  assertNull(result.get("hoa_don"));
                                  assertTrue(
                                      WarrantyFinanceCalculator.isSupplierSettlement(
                                          f.cash.getFirst()));
                                  if (value == 40000) {
                                    var next =
                                        f.receive(input("THU_DOI_SOAT_DON_VI", 60000)).getData();
                                    amountEquals(
                                        0, part(next, "doi_soat_ncc").get("so_tien_con_doi_soat"));
                                    assertEquals(
                                        goods == 0,
                                        part(next, "doi_soat_ncc").get("da_giai_quyet"));
                                  }
                                  error(
                                      ErrorCode.WARRANTY_MONEY_EXCEEDS_OUTSTANDING,
                                      () -> f.receive(input("THU_DOI_SOAT_DON_VI", 1)));
                                  var alias = input("THU_DOI_SOAT_DON_VI", 1);
                                  alias.put("nghia_vu_lich_su_id", f.events.getLast().getId());
                                  error(
                                      ErrorCode.WARRANTY_MONEY_SOURCE_INVALID,
                                      () -> f.receive(alias));
                                })));
  }

  @Test
  void f13ExceededAmountHasExactStructuredErrorAndDoesNotWrite() {
    var f = new Fixture();
    f.approved(false);
    int n = f.events.size();
    var error =
        assertThrows(WarrantyReadException.class, () -> f.receive(input("THU_KHACH", 150001)));
    assertEquals("so_tien", error.getErrors().getFirst().field());
    assertEquals("MONEY_EXCEEDS_OUTSTANDING", error.getErrors().getFirst().code());
    assertEquals("Khoản tiền vượt nghĩa vụ còn lại", error.getMessage());
    assertEquals(n, f.events.size());
    assertTrue(f.cash.isEmpty());
  }

  @Test
  void f14IdempotencyReplaysOriginalWithoutWritesAndRejectsChangedContentActorOrPath() {
    var f = new Fixture();
    f.approved(false);
    var body = input("THU_KHACH", 50000);
    var first = f.receive(body, KEY, 8L);
    int n = f.events.size();
    assertEquals(
        JSON.readTree(JSON.writeValueAsString(first)),
        JSON.readTree(JSON.writeValueAsString(f.receive(body, KEY, 8L))));
    assertEquals(n, f.events.size());
    assertEquals(1, f.cash.size());
    var other = new LinkedHashMap<>(body);
    other.put("so_tien", 10000);
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.receive(other, KEY, 8L));
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.receive(body, KEY, 9L));
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.moneyService.save("502", moneyDto(body), KEY, 8L));
    verify(f.cashRepository, times(1)).saveAndFlush(any());
  }

  @Test
  void duplicateBankReferenceWithDifferentKeysIsBlockedEvenIfPreviousVoucherCancelled() {
    var f = new Fixture();
    f.approved(false);
    var body = input("THU_KHACH", 50000);
    f.receive(body);
    int before = f.events.size();
    error(ErrorCode.WARRANTY_MONEY_REFERENCE_DUPLICATED, () -> f.receive(body));
    f.cash.getFirst().setTrangThai(TrangThaiPhieuThuChi.HUY);
    error(ErrorCode.WARRANTY_MONEY_REFERENCE_DUPLICATED, () -> f.receive(body));
    assertEquals(before, f.events.size());
    assertEquals(1, f.cash.size());
  }

  @Test
  void missingSourcesWrongSupplierUnconfirmedOrStaleCostsDoNotWrite() {
    var f = new Fixture();
    error(ErrorCode.WARRANTY_INVOICE_NOT_FOUND, () -> f.receive(input("THU_KHACH", 1)));
    error(ErrorCode.NOT_FOUND, () -> f.receive(input("CHI_DON_VI", 1)));
    error(ErrorCode.NOT_FOUND, () -> f.receive(input("THU_HOAN_DON_VI", 1)));
    error(ErrorCode.NOT_FOUND, () -> f.receive(input("THU_DOI_SOAT_DON_VI", 1)));
    f.cost(1003, 100000);
    f.cost(1004, 80000);
    error(ErrorCode.WARRANTY_MONEY_SOURCE_INVALID, () -> f.receive(input("CHI_DON_VI", 1)));
    var raw = input("CHI_DON_VI", 1);
    raw.put("chi_phi_lich_su_id", 1004);
    raw.put("nha_cung_cap_id", 4);
    when(f.repository.supplier(eq(4L), anyBoolean()))
        .thenReturn(NhaCungCap.builder().id(4L).build());
    error(ErrorCode.WARRANTY_MONEY_SOURCE_INVALID, () -> f.receive(raw));
    assertTrue(f.cash.isEmpty());
    verify(f.cashRepository, never()).saveAndFlush(any());
  }

  @Test
  void customerReceiptCannotBeUsedAsAnOriginalSupplierPayment() {
    var f = new Fixture();
    f.paid(50000);
    var body = input("THU_HOAN_DON_VI", 10000);
    body.put("giao_dich_chi_goc_id", 9001);
    error(ErrorCode.WARRANTY_MONEY_SOURCE_INVALID, () -> f.receive(body));
    verify(f.cashRepository, never()).saveAndFlush(any());
  }

  @Test
  void collectingWithoutValidConsentInactiveInvoiceOrBeforeApprovalIsForbidden() {
    var f = new Fixture();
    f.approved(false);
    var old = input("THU_KHACH", 1);
    old.put("ngay_ghi_nhan", "2026-10-12T09:00:00+07:00");
    error(ErrorCode.WARRANTY_QUOTE_NOT_APPROVED, () -> f.receive(old));
    var event = f.events.getLast();
    var payload = f.history.payload(event);
    var quote = f.history.object(payload.get("bao_gia"));
    var consent = f.history.object(quote.get("quyet_dinh"));
    consent.put("bang_chung_urls", List.of());
    quote.put("quyet_dinh", consent);
    payload.put("bao_gia", quote);
    event.setDuLieuChiTiet(JSON.writeValueAsString(payload));
    error(ErrorCode.WARRANTY_QUOTE_NOT_APPROVED, () -> f.receive(input("THU_KHACH", 1)));
    f.invoices.getFirst().setTrangThai(TrangThaiHoaDonBaoHanh.HUY);
    error(ErrorCode.WARRANTY_INVOICE_INACTIVE, () -> f.receive(input("THU_KHACH", 1)));
    assertTrue(f.cash.isEmpty());
  }

  @TestFactory
  Stream<DynamicTest> invalidDtoIsRejectedBeforeTransaction() {
    var cases = new ArrayList<Map<String, Object>>();
    for (Object amount : List.of(0, -1, "100", true, 0.001, 1e20)) {
      var body = input("THU_KHACH", 1);
      body.put("so_tien", amount);
      cases.add(body);
    }
    for (String field :
        List.of(
            "hoa_don_bao_hanh_id",
            "loai",
            "chung_tu_urls",
            "ngay_ghi_nhan",
            "ma_chung_tu_tham_chieu",
            "ten_nguoi_nop_nhan")) {
      var body = input("THU_KHACH", 1);
      body.remove(field);
      cases.add(body);
    }
    for (String field : List.of("nguoi_tao_id", "don_hang_id", "trang_thai", "nha_cung_cap_id")) {
      var body = input("THU_KHACH", 1);
      body.put(field, null);
      cases.add(body);
    }
    var empty = input("THU_KHACH", 1);
    empty.put("chung_tu_urls", List.of());
    cases.add(empty);
    var future = input("THU_KHACH", 1);
    future.put("ngay_ghi_nhan", OffsetDateTime.now(VN).plusDays(1).toString());
    cases.add(future);
    var decimalId = input("THU_KHACH", 1);
    decimalId.put("hoa_don_bao_hanh_id", 801.5);
    cases.add(decimalId);
    var method = input("THU_KHACH", 1);
    method.put("phuong_thuc_thanh_toan", "COD");
    cases.add(method);
    return cases.stream()
        .map(
            body ->
                DynamicTest.dynamicTest(
                    body.toString(),
                    () -> {
                      var txn = mock(WarrantyMoneyTransactions.class);
                      var service = new AdminWarrantyMoneyService(txn);
                      error(
                          ErrorCode.INVALID_WARRANTY_MONEY,
                          () -> service.save("501", moneyDto(body), KEY, 8L));
                      verifyNoInteractions(txn);
                    }));
  }

  @Test
  void missingKeyActorAndConfigurationDoNotCreateMoney() {
    var f = new Fixture();
    f.approved(false);
    error(ErrorCode.INVALID_WARRANTY_MONEY, () -> f.receive(input("THU_KHACH", 1), null, 8L));
    error(ErrorCode.UNAUTHORIZED, () -> f.receive(input("THU_KHACH", 1), KEY, null));
    doThrow(new AppException(ErrorCode.WARRANTY_MONEY_CONFIGURATION))
        .when(f.moneyRepository)
        .lockReferenceRegistry(anyString());
    error(ErrorCode.WARRANTY_MONEY_CONFIGURATION, () -> f.receive(input("THU_KHACH", 1)));
    assertTrue(f.cash.isEmpty());
  }

  @Test
  void persistenceFailureRollsBackLedgerHistoryAndDedupAndWarnsToReconcileRealMoney() {
    var f = new Fixture();
    f.approved(false);
    doThrow(new IllegalStateException("test persistence failure")).when(f.moneyRepository).flush();
    var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
    var status = mock(org.springframework.transaction.TransactionStatus.class);
    when(manager.getTransaction(any())).thenReturn(status);
    var proxy = new org.springframework.aop.framework.ProxyFactory(f.moneyTransactions);
    proxy.addAdvice(
        new org.springframework.transaction.interceptor.TransactionInterceptor(
            manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
    var service = new AdminWarrantyMoneyService((WarrantyMoneyTransactions) proxy.getProxy());
    clearInvocations(f.dedup);
    var failure =
        assertThrows(
            AppException.class,
            () -> service.save("501", moneyDto(input("THU_KHACH", 1)), KEY, 8L));
    assertEquals(ErrorCode.WARRANTY_MONEY_FAILED, failure.getErrorCode());
    assertTrue(failure.getMessage().contains("đối soát tiền thực tế"));
    verify(manager).rollback(status);
    verify(manager, never()).commit(any());
    verify(f.dedup, never()).complete(any(), any());
  }

  @Test
  void cancelledLedgerDoesNotReduceInvoiceOutstandingAndAccountNameIsServerOwned() {
    var f = new Fixture();
    f.paid(50000);
    f.cash.getFirst().setTrangThai(TrangThaiPhieuThuChi.HUY);
    f.ticket.setKhachHang(NguoiDung.builder().id(41L).hoTen("Tên khách từ hệ thống").build());
    var data = f.receive(input("THU_KHACH", 150000)).getData();
    amountEquals(150000, ((AdminWarrantyDetailResponse.Invoice) data.get("hoa_don")).daThu());
    assertEquals("Tên khách từ hệ thống", part(data, "phieu_thu_chi").get("ten_nguoi_nop_nhan"));
    assertEquals(41L, f.cash.getLast().getNguoiNopNhan().getId());
  }

  @Test
  void originalPaymentCannotBeRefundedBeyondItsOwnAmountOrFromAnotherSupplier() {
    var f = new Fixture();
    f.cost(1003, 100000);
    f.receive(input("CHI_DON_VI", 50000));
    f.receive(input("CHI_DON_VI", 50000));
    f.cost(1100, 0);
    error(
        ErrorCode.WARRANTY_MONEY_EXCEEDS_OUTSTANDING,
        () -> f.receive(input("THU_HOAN_DON_VI", 50001)));
    f.receive(input("THU_HOAN_DON_VI", 50000));
    error(
        ErrorCode.WARRANTY_MONEY_EXCEEDS_OUTSTANDING, () -> f.receive(input("THU_HOAN_DON_VI", 1)));
    var second = input("THU_HOAN_DON_VI", 50000);
    second.put("giao_dich_chi_goc_id", 10001);
    var r = f.receive(second).getData();
    amountEquals(100000, part(r, "chi_phi_don_vi").get("da_nhan_hoan"));
    assertEquals(4, f.cash.size());
  }

  @Test
  void unrelatedSupplierCostAndSettlementNeverPayAnotherSupplierExpense() {
    var f = new Fixture();
    f.cost(1003, 100000);
    f.add(
        1004,
        "GHI_CHI_PHI_DON_VI",
        m(
            "bao_phi_don_vi",
            m(
                "nha_cung_cap_id",
                4,
                "da_xac_nhan",
                true,
                "can_cu",
                "Biên bản đơn vị khác",
                "hang_muc",
                List.of(m("ma_hang_muc", "HM01", "chi_phi", 200000)))));
    f.ticket.setChiPhiNccXacNhan(money(300000));
    f.obligation(0);
    f.receive(input("THU_DOI_SOAT_DON_VI", 100000));
    var result = f.receive(input("CHI_DON_VI", 100000)).getData();
    amountEquals(100000, part(result, "chi_phi_don_vi").get("chi_phi_ncc_xac_nhan"));
    amountEquals(0, part(result, "chi_phi_don_vi").get("con_phai_chi"));
    amountEquals(0, part(result, "chi_phi_don_vi").get("da_nhan_hoan"));
    error(ErrorCode.WARRANTY_MONEY_EXCEEDS_OUTSTANDING, () -> f.receive(input("CHI_DON_VI", 1)));
    assertEquals(2, f.cash.size());
  }

  @Test
  void expenseUpdateAndDetailExcludeSettlementFromRefundTotal() throws Exception {
    var f = new Fixture();
    f.obligation(0);
    f.receive(input("THU_DOI_SOAT_DON_VI", 100000));
    var update =
        m(
            "su_kien",
            "GHI_CHI_PHI_DON_VI",
            "nha_cung_cap_id",
            3,
            "hang_muc",
            List.of(m("ma_hang_muc", "HM01", "chi_phi", 100000, "ben_chiu_phi", "CUA_HANG")),
            "xac_nhan_nghia_vu",
            true,
            "can_cu",
            "Biên bản chi phí",
            "chung_tu_urls",
            List.of("/media/bh/cost.jpg"));
    var response = f.call(update);
    amountEquals(0, ((Map<?, ?>) response.get("chi_phi_don_vi")).get("da_nhan_hoan"));
    amountEquals(100000, ((Map<?, ?>) response.get("chi_phi_don_vi")).get("con_phai_chi"));
    var detail =
        new AdminWarrantyDetailService(
            f.details, f.histories, f.history, mock(WarrantyDeviceResolver.class));
    var method =
        AdminWarrantyDetailService.class.getDeclaredMethod(
            "supplierCost", PhieuBaoHanh.class, List.class);
    method.setAccessible(true);
    var cost = (AdminWarrantyDetailResponse.SupplierCost) method.invoke(detail, f.ticket, f.cash);
    amountEquals(0, cost.daNhanHoan());
    amountEquals(100000, cost.conPhaiChi());
    var moneyMethod =
        AdminWarrantyDetailService.class.getDeclaredMethod(
            "money", Long.class, Set.class, List.class);
    moneyMethod.setAccessible(true);
    var json =
        JSON.readTree(JSON.writeValueAsString(moneyMethod.invoke(detail, 501L, Set.of(), f.cash)));
    assertEquals("THU_DOI_SOAT_DON_VI", json.get(0).get("loai").asString());
  }

  @Test
  void inconsistentHistoricProviderMoneyIsNotGuessedOrConvertedToZero() {
    var f = new Fixture();
    f.cost(1003, 100000);
    f.cash.add(
        SoQuyThuChi.builder()
            .id(9003L)
            .phieuBaoHanh(f.ticket)
            .nhaCungCap(NhaCungCap.builder().id(3L).build())
            .loaiPhieu(LoaiPhieuThuChi.CHI)
            .soTien(money(50000))
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build());
    error(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA, () -> f.receive(input("CHI_DON_VI", 1)));
    verify(f.cashRepository, never()).saveAndFlush(any());
  }

  @Test
  void unconfirmedWrongSupplierAndUnbackedSettlementSourcesAreRejected() {
    for (String field :
        List.of("da_xac_nhan", "nha_cung_cap_id", "so_tien_da_nhan", "so_luong_con_bu")) {
      var f = new Fixture();
      f.obligation(0);
      var event = f.events.getLast();
      var payload = f.history.payload(event);
      var state = f.history.object(payload.get("doi_soat_nha_cung_cap"));
      state.put(field, field.equals("da_xac_nhan") ? false : 1);
      payload.put("doi_soat_nha_cung_cap", state);
      event.setDuLieuChiTiet(JSON.writeValueAsString(payload));
      assertThrows(AppException.class, () -> f.receive(input("THU_DOI_SOAT_DON_VI", 100)));
      assertTrue(f.cash.isEmpty());
    }
  }

  @Test
  void referenceRegistryLocksSameSharedTypeBeforeEveryMoneyKind() {
    var types = mock(LoaiThuChiRepository.class);
    var em = mock(jakarta.persistence.EntityManager.class);
    when(types.findByMaLoaiForUpdate(anyString()))
        .thenAnswer(
            a ->
                Optional.of(
                    LoaiThuChi.builder()
                        .maLoai(a.getArgument(0))
                        .loaiPhieu(
                            a.<String>getArgument(0).startsWith("CHI_")
                                ? LoaiPhieuThuChi.CHI
                                : LoaiPhieuThuChi.THU)
                        .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
                        .build()));
    var repo = new WarrantyMoneyRepository(em, types);
    for (String code :
        List.of(
            "THU_BAO_HANH",
            "CHI_HOAN_BAO_HANH",
            "CHI_DON_VI_BAO_HANH",
            "THU_HOAN_DON_VI_BAO_HANH",
            "THU_DOI_SOAT_BAO_HANH")) {
      clearInvocations(types);
      repo.lockReferenceRegistry(code);
      var order = inOrder(types);
      if (code.equals("THU_BAO_HANH")) order.verify(types, times(2)).findByMaLoaiForUpdate(code);
      else {
        order.verify(types).findByMaLoaiForUpdate("THU_BAO_HANH");
        order.verify(types).findByMaLoaiForUpdate(code);
      }
      assertTrue(CashbookService.SYSTEM_RESERVED_TYPE_CODES.contains(code));
    }
    when(types.findByMaLoaiForUpdate("THU_BAO_HANH")).thenReturn(Optional.empty());
    error(
        ErrorCode.WARRANTY_MONEY_CONFIGURATION,
        () -> repo.lockReferenceRegistry("CHI_HOAN_BAO_HANH"));
    verifyNoInteractions(em);
  }

  @Test
  void moneyAndIdempotencyCompletionUseSameWriteTransactionAndCommitFailureIsNotSuccess() {
    var f = new Fixture();
    f.approved(false);
    var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
    var status = mock(org.springframework.transaction.TransactionStatus.class);
    when(manager.getTransaction(any())).thenReturn(status);
    doThrow(new org.springframework.transaction.TransactionSystemException("test commit failure"))
        .when(manager)
        .commit(status);
    var proxy = new org.springframework.aop.framework.ProxyFactory(f.moneyTransactions);
    proxy.addAdvice(
        new org.springframework.transaction.interceptor.TransactionInterceptor(
            manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
    var service = new AdminWarrantyMoneyService((WarrantyMoneyTransactions) proxy.getProxy());
    error(
        ErrorCode.WARRANTY_MONEY_FAILED,
        () -> service.save("501", moneyDto(input("THU_KHACH", 1)), KEY, 8L));
    var annotation = WarrantyMoneyTransactions.class.getDeclaredMethods();
    var apply =
        Arrays.stream(annotation)
            .filter(m -> m.getName().equals("apply"))
            .findFirst()
            .orElseThrow();
    var tx = apply.getAnnotation(org.springframework.transaction.annotation.Transactional.class);
    assertFalse(tx.readOnly());
    assertEquals(
        org.springframework.transaction.annotation.Isolation.READ_COMMITTED, tx.isolation());
  }
}
