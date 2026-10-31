package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.AdminWarrantyEventServiceTest.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyHandoverRequest;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyHandoverResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.*;

class AdminWarrantyHandoverServiceTest {
  static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

  static class Fixture extends AdminWarrantySupplierSettlementServiceTest.Fixture {
    WarrantyHandoverRepository handoverRepository = mock(WarrantyHandoverRepository.class);
    WarrantyDeviceResolver resolver = mock(WarrantyDeviceResolver.class);
    AdminWarrantyStatusService statusService =
        new AdminWarrantyStatusService(
            workflow, locks, histories, history, new WarrantyMutationSupport(dedup, JSON), JSON);
    WarrantyHandoverTransactions handoverTransactions =
        new WarrantyHandoverTransactions(
            workflow,
            locks,
            histories,
            history,
            details,
            handoverRepository,
            resolver,
            replacementTransactions,
            resources,
            new WarrantyHandoverChecks(history, details, statusService),
            new WarrantyMutationSupport(dedup, JSON),
            JSON);
    AdminWarrantyHandoverService handoverService =
        new AdminWarrantyHandoverService(handoverTransactions);

    Fixture() {
      serial.setDonHang(order);
      device.setMaTheoDoi("TB000700");
      when(workflow.deviceExists(anyLong()))
          .thenAnswer(
              a ->
                  a.getArgument(0).equals(700L)
                      || createdDevices.stream().anyMatch(d -> d.getId().equals(a.getArgument(0))));
      when(resolver.resolve(device))
          .thenReturn(new WarrantyDeviceResolver.DeviceState(true, device, null, List.of()));
    }

    void readyToReturn(KetQuaXuLyBaoHanh result) {
      ticket.setKetQuaXuLy(result);
      ticket.setTrangThaiXuLy(TrangThaiBaoHanh.CHO_TRA_KHACH);
      long selected = ticket.getThietBiThayThe() == null ? 700 : ticket.getThietBiThayThe().getId();
      var ready =
          m(
              "su_kien",
              "SAN_SANG_TRA",
              "thoi_diem",
              OffsetDateTime.now(VN).toString(),
              "ket_qua_sau",
              result.name(),
              "thiet_bi_se_tra_id",
              selected,
              "tinh_trang",
              "Đã kiểm tra",
              "can_cu_kiem_tra",
              "Biên bản kiểm tra",
              "phu_kien",
              BOX,
              "ly_do",
              "Đã thông báo kết quả với khách",
              "phien_ban_phuong_an",
              selected == 700 ? null : 1);
      add(
          nextId++,
          "SAN_SANG_TRA",
          m("san_sang_tra", ready, "noi_dang_giu", m("loai", "CUA_HANG", "thiet_bi_id", selected)));
    }

    void noSerial() {
      variant.setCoQuanLySerial(false);
      device.setSoSerial(null);
      ticket.setSoSerial(null);
      device.setHanBaoHanh(LocalDateTime.of(2028, 1, 1, 9, 0));
    }

    void exchange(boolean managed, boolean shop) {
      if (!managed) noSerial();
      accepted(shop ? "TON_KHO_CUA_HANG" : "DON_VI_BAO_HANH");
      if (shop) issue(managed);
      else item(AdminWarrantyReplacementItemsServiceTest.receive(managed));
      readyToReturn(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA);
    }

    AdminWarrantyHandoverResponse handover(Map<String, Object> input) {
      return handover(input, UUID.randomUUID().toString());
    }

    AdminWarrantyHandoverResponse handover(Map<String, Object> input, String key) {
      var r = handoverService.save("501", dto(input), key, 8L);
      messageWithoutNumbers(r.getMessage());
      return r.getData();
    }

    Map<String, Object> input() {
      return body(
          ticket.getThietBiThayThe() == null ? 700 : ticket.getThietBiThayThe().getId(),
          ticket.getThietBiThayThe() != null);
    }
  }

  static AdminWarrantyHandoverRequest dto(Map<String, Object> body) {
    return JSON.readValue(JSON.writeValueAsString(body), AdminWarrantyHandoverRequest.class);
  }

  static Map<String, Object> body(long device, boolean exchange) {
    var b =
        m(
            "thiet_bi_ban_giao_id",
            device,
            "ten_nguoi_nhan",
            "Nguyễn Văn An",
            "sdt_nguoi_nhan",
            "0912345678",
            "thoi_diem",
            OffsetDateTime.now(VN).toString(),
            "tinh_trang",
            "Đã kiểm tra và giao đúng thiết bị",
            "phu_kien",
            BOX,
            "xac_nhan_khach",
            true,
            "bang_chung_urls",
            List.of("/media/bh/handover.jpg"));
    if (exchange) b.put("phien_ban_phuong_an", 1);
    return b;
  }

  @BeforeEach
  void admin() {
    AdminWarrantyInvoiceServiceTest.role("ADMIN");
  }

  @AfterEach
  void clear() {
    SecurityContextHolder.clearContext();
  }

  @ParameterizedTest
  @EnumSource(
      value = KetQuaXuLyBaoHanh.class,
      names = {"SUA_THANH_CONG", "KHONG_SUA_DUOC", "KHONG_THUC_HIEN_SUA"})
  void originalSerialReturnsWithoutChangingWarrantyOrStock(KetQuaXuLyBaoHanh result) {
    var f = new Fixture();
    var expiry = f.serial.getHanBaoHanh();
    var activated = f.serial.getNgayKichHoat();
    f.readyToReturn(result);
    var data = f.handover(f.input());
    assertEquals(TrangThaiBaoHanh.HOAN_TAT, f.ticket.getTrangThaiXuLy());
    assertEquals(result, f.ticket.getKetQuaXuLy());
    assertEquals(TrangThaiSerial.DA_BAN, f.serial.getTrangThai());
    assertEquals(expiry, f.serial.getHanBaoHanh());
    assertEquals(activated, f.serial.getNgayKichHoat());
    assertNull(data.get("the_kho_moi"));
    assertEquals(true, data.get("da_giai_phong_khoa"));
    assertEquals(false, data.get("doi_soat_ncc_con_mo"));
    assertTrue(f.cash.isEmpty());
    assertTrue(f.cards.isEmpty());
    assertEquals(10, f.stock.getTonCoTheBan());
    assertEquals("HANDOVER", f.events.getLast().getLoaiSuKien());
  }

  @Test
  void noSerialKeepsTrackAndAbsoluteWarranty() {
    var f = new Fixture();
    f.noSerial();
    var expiry = f.device.getHanBaoHanh();
    f.readyToReturn(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    var data = f.handover(f.input());
    assertEquals("TB000700", data.get("ma_theo_doi_da_tra"));
    assertEquals(List.of(), data.get("serials"));
    assertEquals(true, data.get("khoa_thiet_bi_da_giai_phong"));
    assertEquals(expiry, f.device.getHanBaoHanh());
    assertTrue(f.createdSerials.isEmpty());
  }

  @ParameterizedTest
  @CsvSource({"true,true", "true,false", "false,true", "false,false"})
  void replacementSourcesTransferRightsOnlyAtHandover(boolean managed, boolean shop) {
    var f = new Fixture();
    f.exchange(managed, shop);
    var replacement = f.ticket.getThietBiThayThe();
    var oldExpiry = f.serial.getHanBaoHanh();
    int cards = f.cards.size();
    int stock = f.stock.getTonCoTheBan();
    assertNull(replacement.getNgayKichHoat());
    var data = f.handover(f.input());
    assertEquals(KetQuaXuLyBaoHanh.DOI_SAN_PHAM, f.ticket.getKetQuaXuLy());
    assertEquals(false, data.get("quyen_thiet_bi_cu_con_hieu_luc"));
    assertEquals(701L, data.get("thiet_bi_hien_hanh_id"));
    assertEquals(oldExpiry, f.serial.getHanBaoHanh());
    assertEquals(managed ? oldExpiry : f.device.getHanBaoHanh(), replacement.getHanBaoHanh());
    assertEquals(cards, f.cards.size());
    assertEquals(stock, f.stock.getTonCoTheBan());
    assertTrue(f.cash.isEmpty());
    assertEquals(shop, data.get("giao_dich_xuat_da_co_id") != null);
    if (managed) {
      assertEquals(TrangThaiSerial.DA_THAY_THE_BAO_HANH, f.serial.getTrangThai());
      assertEquals(TrangThaiSerial.DA_BAN, replacement.getSoSerial().getTrangThai());
      assertSame(f.order, replacement.getSoSerial().getDonHang());
    } else {
      assertEquals("TB000701", data.get("ma_theo_doi_thay_the"));
      assertTrue(f.createdSerials.isEmpty());
    }
    var saved = f.history.latestSection(f.events, "giao_nhan");
    assertEquals(700L, f.history.id(saved.get("thiet_bi_cu_id")));
    assertEquals(701L, f.history.id(saved.get("thiet_bi_thay_the_id")));
  }

  @Test
  void openSupplierObligationSurvivesCustomerCompletion() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.issue(true);
    f.obligation();
    f.readyToReturn(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA);
    var data = f.handover(f.input());
    assertEquals(true, data.get("doi_soat_ncc_con_mo"));
    assertFalse(
        Boolean.TRUE.equals(
            new WarrantySupplierSettlementSnapshots(f.history)
                .load(f.events)
                .values()
                .iterator()
                .next()
                .get("da_giai_quyet")));
  }

  @Test
  void outstandingPaymentBlocksWithoutWritingAndF10ContainsData() {
    var f = new Fixture();
    f.paid(50000);
    f.readyToReturn(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    int events = f.events.size();
    var e = assertThrows(WarrantyReadException.class, () -> f.handover(f.input()));
    assertEquals(ErrorCode.WARRANTY_HANDOVER_PAYMENT_REQUIRED, e.getErrorCode());
    assertEquals(
        0,
        money(100000)
            .compareTo((java.math.BigDecimal) ((Map<?, ?>) e.getData()).get("con_phai_thu")));
    assertEquals(false, ((Map<?, ?>) e.getData()).get("da_ban_giao"));
    assertEquals(events, f.events.size());
    assertEquals(TrangThaiBaoHanh.CHO_TRA_KHACH, f.ticket.getTrangThaiXuLy());
    assertEquals(TrangThaiSerial.DANG_BAO_HANH, f.serial.getTrangThai());
  }

  @Test
  void approvedDebtKeepsUnpaidBalanceAndPaymentStatus() {
    var f = new Fixture();
    f.paid(0);
    var debt = AdminWarrantyInvoiceServiceTest.debt(150000);
    var approval = f.update(debt);
    f.readyToReturn(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    var b = f.input();
    b.put("phe_duyet_cong_no_lich_su_id", approval.get("lich_su_id"));
    var data = f.handover(b);
    assertEquals(0, money(150000).compareTo((java.math.BigDecimal) data.get("con_phai_thu")));
    assertEquals(TrangThaiThanhToanBaoHanh.CHUA_THANH_TOAN, data.get("trang_thai_thanh_toan"));
    assertTrue(f.cash.isEmpty());
    assertNotNull(data.get("phe_duyet_cong_no"));
  }

  @Test
  void partiallyPaidDebtMatchesF08WithoutClearingOutstanding() {
    var f = new Fixture();
    f.paid(50000);
    var approved = f.update(AdminWarrantyInvoiceServiceTest.debt(100000));
    f.readyToReturn(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    var body = f.input();
    body.put("phe_duyet_cong_no_lich_su_id", approved.get("lich_su_id"));
    var data = f.handover(body);
    assertEquals(0, money(100000).compareTo((java.math.BigDecimal) data.get("con_phai_thu")));
    assertEquals(TrangThaiThanhToanBaoHanh.THANH_TOAN_MOT_PHAN, data.get("trang_thai_thanh_toan"));
    assertEquals(1, f.cash.size());
  }

  @Test
  void olderDebtApprovalCannotOverrideLaterDecision() {
    var f = new Fixture();
    f.paid(0);
    var earlier = f.update(AdminWarrantyInvoiceServiceTest.debt(150000));
    f.update(AdminWarrantyInvoiceServiceTest.debt(100000));
    f.readyToReturn(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    var body = f.input();
    body.put("phe_duyet_cong_no_lich_su_id", earlier.get("lich_su_id"));
    error(ErrorCode.WARRANTY_HANDOVER_PAYMENT_REQUIRED, () -> f.handover(body));
    assertEquals(TrangThaiSerial.DANG_BAO_HANH, f.serial.getTrangThai());
  }

  @Test
  void supplierReplacementWithoutReceiptProofIsNotDeliverable() {
    var f = new Fixture();
    f.exchange(true, false);
    for (var event : f.events) {
      var payload = f.history.payload(event);
      if (payload.containsKey("nhan_hang_don_vi")) {
        payload.remove("nhan_hang_don_vi");
        event.setDuLieuChiTiet(JSON.writeValueAsString(payload));
      }
    }
    error(ErrorCode.WARRANTY_HANDOVER_NOT_READY, () -> f.handover(f.input()));
    assertNull(f.ticket.getThietBiThayThe().getSoSerial().getDonHang());
  }

  @Test
  void unresolvedDiscrepancyAndUnverifiedRightsBlockWithoutWrites() {
    var f = new Fixture();
    f.readyToReturn(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    f.add(
        f.nextId++,
        "NHAN_LAI",
        m("giao_nhan", m("thiet_bi_id", 700, "sai_lech", List.of(m("id", 42, "da_xu_ly", false)))));
    error(ErrorCode.WARRANTY_HANDOVER_NOT_READY, () -> f.handover(f.input()));
    f.events.removeLast();
    when(f.resolver.resolve(f.device))
        .thenReturn(
            new WarrantyDeviceResolver.DeviceState(
                true,
                f.device,
                null,
                List.of(
                    new com.example.dantruventu.DTO.Response.warranty
                        .AdminWarrantyLookupResponse
                        .BlockReason("MISSING_HANDOVER_EVIDENCE", "Chưa xác minh quyền"))));
    error(ErrorCode.WARRANTY_HANDOVER_NOT_READY, () -> f.handover(f.input()));
    assertEquals(TrangThaiSerial.DANG_BAO_HANH, f.serial.getTrangThai());
    assertFalse(f.events.stream().anyMatch(e -> "HANDOVER".equals(e.getLoaiSuKien())));
  }

  @Test
  void refundDoesNotBlockAndDoesNotCreateFinancialRecords() {
    var f = new Fixture();
    f.paid(150000);
    f.update(AdminWarrantyInvoiceServiceTest.cancel());
    f.readyToReturn(KetQuaXuLyBaoHanh.KHONG_THUC_HIEN_SUA);
    var data = f.handover(f.input());
    assertEquals(0, money(150000).compareTo((java.math.BigDecimal) data.get("con_phai_hoan")));
    assertEquals(TrangThaiHoanTienBaoHanh.CHO_HOAN, data.get("trang_thai_hoan_tien"));
    assertEquals(1, f.cash.size());
    assertEquals(TrangThaiHoaDonBaoHanh.HUY, f.invoices.getFirst().getTrangThai());
  }

  @Test
  void exactRetryReturnsSavedResponseButAnotherBodyActorOrNewKeyCannotRepeat() {
    var f = new Fixture();
    f.readyToReturn(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    var b = f.input();
    String key = UUID.randomUUID().toString();
    var first = f.handover(b, key);
    int count = f.events.size();
    var again = f.handover(b, key);
    assertEquals(JSON.writeValueAsString(first), JSON.writeValueAsString(again));
    assertEquals(count, f.events.size());
    b.put("ghi_chu", "Khác");
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.handover(b, key));
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.handoverService.save("501", dto(b), key, 9L));
    error(ErrorCode.WARRANTY_HANDOVER_ALREADY_COMPLETED, () -> f.handover(f.input()));
  }

  @Test
  void readinessMissingWrongDeviceAccessoriesOrAnotherOpenTicketBlocks() {
    var f = new Fixture();
    error(ErrorCode.WARRANTY_HANDOVER_NOT_READY, () -> f.handover(f.input()));
    f.readyToReturn(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    var b = f.input();
    b.put("phu_kien", List.of());
    error(ErrorCode.WARRANTY_HANDOVER_NOT_READY, () -> f.handover(b));
    var wrong = f.input();
    wrong.put("thiet_bi_ban_giao_id", 999);
    error(ErrorCode.WARRANTY_DEVICE_NOT_FOUND, () -> f.handover(wrong));
    when(f.handoverRepository.usedByAnotherOpenTicket(anyLong(), anyList())).thenReturn(true);
    error(ErrorCode.WARRANTY_HANDOVER_NOT_READY, () -> f.handover(f.input()));
    assertEquals(TrangThaiSerial.DANG_BAO_HANH, f.serial.getTrangThai());
  }

  @Test
  void replacementWrongPlanAndMissingSourceProofCannotTransferRights() {
    var f = new Fixture();
    f.exchange(true, true);
    var b = f.input();
    b.put("phien_ban_phuong_an", 2);
    error(ErrorCode.NOT_FOUND, () -> f.handover(b));
    f.replacementSerial.setTrangThai(TrangThaiSerial.DA_BAN);
    error(ErrorCode.WARRANTY_HANDOVER_NOT_READY, () -> f.handover(f.input()));
    assertEquals(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA, f.ticket.getKetQuaXuLy());
  }

  @ParameterizedTest
  @ValueSource(strings = {"nguoi_tao_id", "so_serial", "han_bao_hanh", "trang_thai_xu_ly"})
  void backendFieldsAreRejected(String field) {
    var f = new Fixture();
    var b = f.input();
    b.put(field, "client");
    error(ErrorCode.INVALID_WARRANTY_HANDOVER, () -> f.handover(b));
    verify(f.workflow, never()).lockTicket(anyLong());
  }

  @Test
  void commitFailureIsServerErrorAndTransactionCoversWholeOperation() throws Exception {
    var tx = mock(WarrantyHandoverTransactions.class);
    when(tx.apply(any(), any(), any(), any())).thenThrow(new IllegalStateException("commit"));
    error(
        ErrorCode.WARRANTY_HANDOVER_FAILED,
        () ->
            new AdminWarrantyHandoverService(tx)
                .save("501", dto(body(700, false)), UUID.randomUUID().toString(), 8L));
    var boundary =
        WarrantyHandoverTransactions.class
            .getMethod("apply", Long.class, Map.class, String.class, Long.class)
            .getAnnotation(Transactional.class);
    assertNotNull(boundary);
    assertEquals(Isolation.READ_COMMITTED, boundary.isolation());
  }
}
