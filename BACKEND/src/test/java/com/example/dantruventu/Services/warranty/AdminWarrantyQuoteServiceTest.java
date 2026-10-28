package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.AdminWarrantyEventServiceTest.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyQuoteRequest;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyQuoteResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.WarrantyQuoteRepository;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;

class AdminWarrantyQuoteServiceTest {
  static class Fixture extends AdminWarrantyEventServiceTest.Fixture {
    WarrantyQuoteRepository quotes = mock(WarrantyQuoteRepository.class);
    AdminWarrantyQuoteService quoteService;
    long feeId = 1101;

    Fixture() {
      add(1002, "GHI_KET_LUAN", m("ket_luan", m("hang_muc", conclusion(true).get("hang_muc"))));
      doAnswer(
              a -> {
                ChiTietPhiBaoHanh fee = a.getArgument(0);
                fee.setId(feeId++);
                fees.add(fee);
                return null;
              })
          .when(quotes)
          .insert(any());
      quoteService =
          new AdminWarrantyQuoteService(
              workflow,
              locks,
              histories,
              history,
              details,
              quotes,
              new WarrantyMutationSupport(dedup, JSON),
              JSON);
    }

    AdminWarrantyQuoteResponse create(Map<String, Object> body) {
      var response = quoteService.create("501", dto(body), UUID.randomUUID().toString(), 8L);
      messageWithoutNumbers(response.getMessage());
      return response.getData();
    }

    void state(String state, boolean invoice) {
      int version = ticket.getPhienBanBaoGia();
      var quote = new LinkedHashMap<>(history.latestSection(events, "bao_gia"));
      quote.put("trang_thai", state);
      if (Set.of("DONG_Y", "TU_CHOI").contains(state))
        quote.put(
            "quyet_dinh",
            m(
                "quyet_dinh",
                state,
                "thoi_diem",
                "2026-10-20T09:00:00+07:00",
                "kenh",
                "TAI_QUAY",
                "bang_chung_urls",
                List.of("/consent.jpg")));
      add(nextId++, "QUYET_DINH_BAO_GIA", m("bao_gia", quote));
      ticket.setTrangThaiBaoGia(TrangThaiBaoGiaBaoHanh.valueOf(state));
      if (invoice)
        invoices.add(
            HoaDonBaoHanh.builder()
                .id(801L)
                .phieuBaoHanh(ticket)
                .phienBanBaoGia(version)
                .tongTien(new BigDecimal(quote.get("tong_tien_khach").toString()))
                .trangThai(TrangThaiHoaDonBaoHanh.HIEU_LUC)
                .build());
    }
  }

  static AdminWarrantyQuoteRequest dto(Map<String, Object> body) {
    return JSON.readValue(JSON.writeValueAsString(body), AdminWarrantyQuoteRequest.class);
  }

  static Map<String, Object> item(String code, long price, boolean free) {
    return m(
        "ma_hang_muc",
        code,
        "noi_dung",
        free ? "Kiểm tra lỗi trong chính sách" : "Sửa chân tiếp xúc",
        "so_luong",
        1,
        "don_gia_khach",
        price,
        "chi_phi_ncc_du_kien",
        free ? 0 : 100000,
        "dieu_kien_bao_hanh",
        free ? "DU_DIEU_KIEN" : "KHONG_DU_DIEU_KIEN",
        "ben_chiu_phi",
        free ? "DON_VI_BAO_HANH" : "KHACH_HANG",
        "van_phat_sinh_khi_khong_sua",
        false);
  }

  static Map<String, Object> body(Integer replaces, List<Map<String, Object>> items, long deposit) {
    return m(
        "thay_the_phien_ban",
        replaces,
        "ket_luan_lich_su_id",
        1002,
        "hang_muc",
        items,
        "thoi_gian_du_kien",
        "Trong ngày",
        "han_phan_hoi",
        "2100-10-21T18:00:00+07:00",
        "dieu_kien_dat_coc",
        m("so_tien_toi_thieu", deposit),
        "dieu_kien_thanh_toan",
        "Đủ tiền trước bàn giao",
        "ly_do",
        "Báo phí sau kiểm tra");
  }

  static Map<String, Object> first() {
    return body(null, List.of(item("HM01", 150000, false)), 50000);
  }

  static Map<String, Object> second() {
    return body(1, List.of(item("HM01", 200000, false)), 50000);
  }

  @Test
  void e01F01DraftHasExactShapeAndNoFinancialOrPhysicalWrites() {
    var f = new Fixture();
    var before = f.ticket.getTrangThaiXuLy();
    var response = f.quoteService.create("501", dto(first()), KEY, 8L);
    assertEquals(201, response.getStatus());
    assertEquals("Tạo báo giá nháp thành công", response.getMessage());
    assertEquals(expectedFirst(), response.getData());
    assertEquals(before, f.ticket.getTrangThaiXuLy());
    assertEquals(TrangThaiSerial.DANG_BAO_HANH, f.serial.getTrangThai());
    assertTrue(f.invoices.isEmpty());
    assertTrue(f.cash.isEmpty());
    assertEquals(1, f.fees.size());
    assertEquals(1, f.ticket.getPhienBanBaoGia());
    assertEquals(TrangThaiBaoGiaBaoHanh.NHAP, f.ticket.getTrangThaiBaoGia());
    verify(f.locks, never()).lockSerial(anyLong());
    verify(f.details, never()).findPostedMoney(anyLong());
  }

  static Map<String, Object> expectedFirst() {
    var line = new LinkedHashMap<>(item("HM01", 150000, false));
    line.put("id", 1101L);
    line.put("so_luong", 1);
    line.put("don_gia_khach", new BigDecimal("150000.00"));
    line.put("chi_phi_ncc_du_kien", new BigDecimal("100000.00"));
    line.put("thanh_tien_khach", new BigDecimal("150000.00"));
    return m(
        "phieu_bao_hanh_id",
        501L,
        "phien_ban_bao_gia",
        1,
        "trang_thai_bao_gia",
        "NHAP",
        "hang_muc",
        List.of(line),
        "tong_tien_khach",
        new BigDecimal("150000.00"),
        "han_phan_hoi",
        "2100-10-21T18:00:00+07:00",
        "thay_the_phien_ban",
        null,
        "hoa_don_id",
        null,
        "thoi_gian_du_kien",
        "Trong ngày",
        "dieu_kien_dat_coc",
        m("so_tien_toi_thieu", new BigDecimal("50000.00")),
        "dieu_kien_thanh_toan",
        "Đủ tiền trước bàn giao",
        "quyet_dinh_khach",
        null,
        "da_tao_giao_dich_tien",
        false);
  }

  @Test
  void e02F02ApprovedDecisionAndInvoiceRemainImmutable() {
    var f = new Fixture();
    f.create(first());
    f.state("DONG_Y", true);
    var oldJson = f.events.stream().map(LichSuBaoHanh::getDuLieuChiTiet).toList();
    var oldFee = f.fees.getFirst();
    var response = f.quoteService.create("501", dto(second()), KEY, 8L);
    var result = response.getData();
    assertEquals(
        "Tạo báo giá mới, giữ nguyên chấp thuận và hóa đơn đã duyệt", response.getMessage());
    assertEquals(2, result.get("phien_ban_bao_gia"));
    assertEquals(
        m("phien_ban", 1, "trang_thai", "DONG_Y", "duoc_thay_bang_phien_ban", 2),
        result.get("bao_gia_truoc"));
    assertEquals(801L, result.get("hoa_don_id"));
    assertEquals(new BigDecimal("50000.00"), result.get("phan_tang_them_chua_duoc_duyet"));
    assertEquals(150000, f.invoices.getFirst().getTongTien().intValueExact());
    assertEquals(1, f.invoices.getFirst().getPhienBanBaoGia());
    assertNull(result.get("quyet_dinh_khach"));
    assertEquals(
        oldJson,
        f.events.subList(0, oldJson.size()).stream().map(LichSuBaoHanh::getDuLieuChiTiet).toList());
    assertEquals(150000, oldFee.getThanhTienKhach().intValueExact());
    assertEquals(1, oldFee.getPhienBanBaoGia());
    var newSnapshot = f.history.latestSection(f.events, "bao_gia");
    assertNull(newSnapshot.get("quyet_dinh"));
    assertEquals(200000, ((Number) result.get("tong_tien_khach")).intValue());
    assertEquals(TrangThaiBaoHanh.DANG_KIEM_TRA, f.ticket.getTrangThaiXuLy());
    assertTrue(f.cash.isEmpty());
  }

  @TestFactory
  Stream<DynamicTest> e02ReplacesDraftPendingOrRejectedWithoutRewritingOldDecision() {
    return Stream.of("NHAP", "CHO_PHAN_HOI", "TU_CHOI")
        .map(
            state ->
                DynamicTest.dynamicTest(
                    state,
                    () -> {
                      var f = new Fixture();
                      f.create(first());
                      if (!state.equals("NHAP")) f.state(state, false);
                      var before = f.events.stream().map(LichSuBaoHanh::getDuLieuChiTiet).toList();
                      var result = f.create(second());
                      @SuppressWarnings("unchecked")
                      var previous = (Map<String, Object>) result.get("bao_gia_truoc");
                      assertEquals(
                          state.equals("TU_CHOI") ? "TU_CHOI" : "HET_HIEU_LUC",
                          previous.get("trang_thai"));
                      assertEquals(
                          before,
                          f.events.subList(0, before.size()).stream()
                              .map(LichSuBaoHanh::getDuLieuChiTiet)
                              .toList());
                      assertNull(result.get("hoa_don_id"));
                      assertNull(result.get("quyet_dinh_khach"));
                      assertEquals(2, f.fees.size());
                      assertTrue(f.invoices.isEmpty());
                    }));
  }

  @Test
  void e03F04MixedPaidAndFreeTotalsOnlyCustomerFees() {
    var f = new Fixture();
    var result =
        f.create(body(null, List.of(item("HM01", 150000, false), item("HM_FREE", 0, true)), 50000));
    assertEquals(new BigDecimal("150000.00"), result.get("tong_tien_khach"));
    assertEquals(2, f.fees.size());
    assertEquals(0, f.fees.getLast().getThanhTienKhach().signum());
    assertNull(result.get("hoa_don_id"));
    assertFalse((Boolean) result.get("da_tao_giao_dich_tien"));
  }

  @Test
  void e04F05ZeroQuoteDoesNotCreateFakeInvoiceOrConsent() {
    var f = new Fixture();
    var result = f.create(body(null, List.of(item("HM_FREE", 0, true)), 0));
    assertEquals(new BigDecimal("0.00"), result.get("tong_tien_khach"));
    assertNull(result.get("hoa_don_id"));
    assertNull(result.get("quyet_dinh_khach"));
    assertTrue(f.invoices.isEmpty());
    assertTrue(f.cash.isEmpty());
    assertEquals(TrangThaiBaoGiaBaoHanh.NHAP, f.ticket.getTrangThaiBaoGia());
  }

  @Test
  void f06CannotRemoveOrReduceEarlierApprovedFeeEvenAfterLaterRejection() {
    var f = new Fixture();
    var charge = item("HM01", 150000, false);
    charge.put("van_phat_sinh_khi_khong_sua", true);
    f.create(body(null, List.of(charge), 0));
    f.state("DONG_Y", true);
    var kept = item("HM01", 200000, false);
    kept.put("van_phat_sinh_khi_khong_sua", true);
    f.create(body(1, List.of(kept), 0));
    f.state("TU_CHOI", false);
    clearInvocations(f.quotes, f.workflow);
    var failure =
        assertThrows(
            WarrantyReadException.class,
            () -> f.create(body(2, List.of(item("HM_FREE", 0, true)), 0)));
    assertEquals(ErrorCode.APPROVED_FEE_REMOVAL_UNJUSTIFIED, failure.getErrorCode());
    assertEquals("hang_muc", failure.getErrors().getFirst().field());
    assertEquals("APPROVED_FEE_REMOVAL_UNJUSTIFIED", failure.getErrors().getFirst().code());
    error(
        ErrorCode.APPROVED_FEE_REMOVAL_UNJUSTIFIED,
        () -> f.create(body(2, List.of(item("HM01", 100000, false)), 0)));
    verify(f.quotes, never()).insert(any());
    verify(f.workflow, never()).append(any(), anyLong(), anyString(), anyString(), anyString());
  }

  @Test
  void replayReturnsPrior201AndRejectsChangedBodyActorOrPath() {
    var f = new Fixture();
    var first = f.quoteService.create("501", dto(first()), KEY, 8L);
    var saved = f.events.size();
    var repeated = f.quoteService.create("501", dto(first()), KEY, 8L);
    assertEquals(JSON.writeValueAsString(first), JSON.writeValueAsString(repeated));
    assertEquals(saved, f.events.size());
    assertEquals(1, f.fees.size());
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.quoteService.create("501", dto(second()), KEY, 8L));
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.quoteService.create("501", dto(first()), KEY, 9L));
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.quoteService.create("502", dto(first()), KEY, 8L));
  }

  @Test
  void newDraftDoesNotRevokeConsentForWorkAlreadyStartedButCannotAuthorizeNewScope() {
    var f = new Fixture();
    f.create(first());
    f.state("DONG_Y", true);
    f.cash.add(
        SoQuyThuChi.builder()
            .id(9001L)
            .hoaDonBaoHanh(f.invoices.getFirst())
            .phieuBaoHanh(f.ticket)
            .loaiPhieu(LoaiPhieuThuChi.THU)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .soTien(money(50000))
            .build());
    f.add(
        3000,
        "BAT_DAU_CONG_VIEC",
        m(
            "cong_viec_da_bat_dau",
            m("phien_ban_bao_gia", 1, "chi_tiet_phi_ids", List.of(1101), "noi_xu_ly", "CUA_HANG")));
    f.create(second());
    var authorization = new WarrantyEventWorkAuthorization(f.history, f.details);
    var at = java.time.OffsetDateTime.parse("2026-10-20T10:00:00+07:00");
    assertDoesNotThrow(
        () -> authorization.progress(f.ticket, f.events, List.of(1101L), at, "CUA_HANG"));
    error(
        ErrorCode.WARRANTY_PAID_WORK_NOT_AUTHORIZED,
        () -> authorization.paid(f.ticket, f.events, 2, List.of(1102L), at, true));
    error(
        ErrorCode.WARRANTY_PAID_WORK_NOT_AUTHORIZED,
        () -> authorization.progress(f.ticket, f.events, List.of(1102L), at, "CUA_HANG"));
  }

  @Test
  void missingOrStaleVersionConclusionAndCompletedTicketFailBeforeFeeWrites() {
    var missing = new Fixture();
    error(ErrorCode.NOT_FOUND, () -> missing.create(second()));
    var invalid = first();
    invalid.put("ket_luan_lich_su_id", 9999);
    error(ErrorCode.NOT_FOUND, () -> missing.create(invalid));
    var stale = new Fixture();
    stale.create(first());
    error(ErrorCode.WARRANTY_QUOTE_SOURCE_INVALID, () -> stale.create(first()));
    stale.create(second());
    error(ErrorCode.WARRANTY_QUOTE_SOURCE_INVALID, () -> stale.create(second()));
    var closed = new Fixture();
    closed.ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
    error(ErrorCode.WARRANTY_ALREADY_COMPLETED, () -> closed.create(first()));
    verify(closed.quotes, never()).insert(any());
    var superseded = new Fixture();
    superseded.add(
        1050, "GHI_KET_LUAN", m("ket_luan", m("hang_muc", conclusion(false).get("hang_muc"))));
    error(ErrorCode.WARRANTY_QUOTE_SOURCE_INVALID, () -> superseded.create(first()));
    verify(superseded.quotes, never()).insert(any());
  }

  @TestFactory
  Stream<DynamicTest> strictRequestValidationRejectsInvalidData() {
    var bodies = new ArrayList<Map<String, Object>>();
    for (Object value : List.of(-1, 0, 1.1, "1", true)) {
      var line = item("HM01", 150000, false);
      line.put("so_luong", value);
      bodies.add(body(null, List.of(line), 0));
    }
    for (Object value :
        List.of(-1, "1000", true, new BigDecimal("0.001"), new BigDecimal("10000000000000"))) {
      var line = item("HM01", 150000, false);
      line.put("don_gia_khach", value);
      bodies.add(body(null, List.of(line), 0));
    }
    var extra = first();
    extra.put("tong_tien", null);
    bodies.add(extra);
    var lineExtra = item("HM01", 1, false);
    lineExtra.put("id", 1);
    bodies.add(body(null, List.of(lineExtra), 0));
    bodies.add(body(null, List.of(), 0));
    bodies.add(body(null, List.of(item("HM01", 1, false), item("HM01", 2, false)), 0));
    bodies.add(body(null, Collections.nCopies(101, item("HM01", 1, false)), 0));
    bodies.add(body(null, List.of(item("HM_FREE", 1, true)), 0));
    bodies.add(body(null, List.of(item("HM01", 1, false)), 2));
    var expiry = first();
    expiry.put("han_phan_hoi", "2026-10-21T18:00:00");
    bodies.add(expiry);
    var fractional = item("HM01", 1, false);
    fractional.put("van_phat_sinh_khi_khong_sua", 1);
    bodies.add(body(null, List.of(fractional), 0));
    var overflow = item("HM01", 1, false);
    overflow.put("so_luong", Integer.MAX_VALUE);
    overflow.put("don_gia_khach", new BigDecimal("9999999999999.99"));
    bodies.add(body(null, List.of(overflow), 0));
    return bodies.stream()
        .map(
            b ->
                DynamicTest.dynamicTest(
                    JSON.writeValueAsString(b),
                    () -> {
                      var f = new Fixture();
                      error(ErrorCode.INVALID_WARRANTY_QUOTE, () -> f.create(b));
                      verify(f.quotes, never()).insert(any());
                      verify(f.dedup, never()).acquire(anyString(), anyLong(), anyString());
                    }));
  }

  @Test
  void expiryAndMissingKeyFailWithoutBusinessWrites() {
    var f = new Fixture();
    var expired = first();
    expired.put("han_phan_hoi", "2000-01-01T00:00:00+07:00");
    error(ErrorCode.INVALID_WARRANTY_QUOTE, () -> f.create(expired));
    error(
        ErrorCode.INVALID_WARRANTY_QUOTE,
        () -> f.quoteService.create("501", dto(first()), null, 8L));
    error(ErrorCode.UNAUTHORIZED, () -> f.quoteService.create("501", dto(first()), KEY, null));
    verify(f.quotes, never()).insert(any());
  }

  @Test
  void quantityMultiplicationAndCurrencyFractionsUseServerTotals() {
    var f = new Fixture();
    var line = item("HM01", 0, false);
    line.put("so_luong", 3);
    line.put("don_gia_khach", new BigDecimal("1234.56"));
    var result = f.create(body(null, List.of(line), 0));
    assertEquals(new BigDecimal("3703.68"), result.get("tong_tien_khach"));
    assertEquals(new BigDecimal("3703.68"), f.fees.getFirst().getThanhTienKhach());
  }

  @Test
  void failedAppendRollsBackTransactionAndNeverCompletesIdempotency() {
    var f = new Fixture();
    when(f.workflow.append(any(), anyLong(), anyString(), anyString(), anyString()))
        .thenThrow(new IllegalStateException("simulated persistence failure"));
    var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
    var status = mock(org.springframework.transaction.TransactionStatus.class);
    when(manager.getTransaction(any())).thenReturn(status);
    var factory = new org.springframework.aop.framework.ProxyFactory(f.quoteService);
    factory.addAdvice(
        new org.springframework.transaction.interceptor.TransactionInterceptor(
            manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
    var service = (AdminWarrantyQuoteService) factory.getProxy();
    error(ErrorCode.WARRANTY_QUOTE_FAILED, () -> service.create("501", dto(first()), KEY, 8L));
    verify(manager).rollback(status);
    verify(manager, never()).commit(any());
    verify(f.dedup, never()).complete(anyString(), anyString());
  }
}
