package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.AdminWarrantyEventServiceTest.*;
import static com.example.dantruventu.Services.warranty.AdminWarrantyReplacementPlanServiceTest.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyReplacementItemsRequest;
import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyReplacementItemsResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

class AdminWarrantyReplacementItemsServiceTest {
  static class Fixture extends AdminWarrantyReplacementPlanServiceTest.Fixture {
    WarrantyReplacementItemsRepository itemsRepository =
        mock(WarrantyReplacementItemsRepository.class);
    WarrantyReplacementItemsTransactions itemsTransactions;
    AdminWarrantyReplacementItemsService itemsService;
    List<ThietBiBaoHanh> createdDevices = new ArrayList<>();
    List<SoSerialSanPham> createdSerials = new ArrayList<>();
    List<TheKho> cards = new ArrayList<>();

    Fixture() {
      replacementSerial.setTrangThai(TrangThaiSerial.TRONG_KHO);
      replacementSerial.setSoSerial("REPL-001");
      when(itemsRepository.stockForVariant(101L)).thenReturn(stock);
      when(itemsRepository.selectedSerial(601L)).thenReturn(replacementSerial);
      when(itemsRepository.receivedVariant(101L)).thenReturn(variant);
      when(itemsRepository.receivedVariant(103L))
          .thenReturn(PhienBanSanPham.builder().id(103L).coQuanLySerial(false).build());
      when(replacementRepository.activeHolds(901L))
          .thenAnswer(
              a -> {
                var hold = history.latestSection(events, "giu_cho_hang_doi");
                return hold != null && Boolean.TRUE.equals(hold.get("dang_giu"))
                    ? List.of(
                        new WarrantyReplacementRepository.HoldOwner(
                            501L,
                            history.id(hold.get("phien_ban_phuong_an")),
                            history.id(hold.get("so_serial_id")),
                            1))
                    : List.of();
              });
      when(itemsRepository.createSerial(any(), anyString()))
          .thenAnswer(
              a -> {
                var s =
                    SoSerialSanPham.builder()
                        .id(602L + (long) createdSerials.size())
                        .phienBan(a.getArgument(0))
                        .soSerial(a.getArgument(1))
                        .trangThai(TrangThaiSerial.GIU_CHO_BAO_HANH)
                        .build();
                createdSerials.add(s);
                when(itemsRepository.selectedSerial(s.getId())).thenReturn(s);
                when(replacementRepository.serial(s.getId())).thenReturn(s);
                return s;
              });
      when(itemsRepository.createDevice(
              any(), any(), nullable(SoSerialSanPham.class), nullable(String.class)))
          .thenAnswer(
              a -> {
                var d =
                    ThietBiBaoHanh.builder()
                        .id(701L + (long) createdDevices.size())
                        .maTheoDoi("TB000701")
                        .chiTietDonHang(line)
                        .phienBan(a.getArgument(1))
                        .soSerial(a.getArgument(2))
                        .dauHieuNhanDang(a.getArgument(3))
                        .build();
                createdDevices.add(d);
                when(locks.lockDevice(d.getId())).thenReturn(d);
                if (d.getSoSerial() != null)
                  when(locks.lockSerial(d.getSoSerial().getId())).thenReturn(d.getSoSerial());
                return d;
              });
      when(itemsRepository.ledger(any(), any(), any(), anyInt(), any()))
          .thenAnswer(
              a -> {
                TonKho s = a.getArgument(1);
                var card =
                    TheKho.builder()
                        .id(12001L + (long) cards.size())
                        .phieuBaoHanh(ticket)
                        .maChungTuGoc(501L)
                        .khoHang(s.getKhoHang())
                        .phienBan(s.getPhienBan())
                        .loaiGiaoDich(a.getArgument(2))
                        .soLuongThayDoi(a.getArgument(3))
                        .tonCuoi(s.getTonThucTe())
                        .build();
                cards.add(card);
                if (card.getLoaiGiaoDich() == LoaiGiaoDichKho.XUAT_DOI_BAO_HANH) issues.add(card);
                return card;
              });
      itemsTransactions =
          new WarrantyReplacementItemsTransactions(
              workflow,
              locks,
              histories,
              history,
              replacementRepository,
              itemsRepository,
              resources,
              replacementTransactions,
              new WarrantyMutationSupport(dedup, JSON),
              details,
              JSON);
      itemsService = new AdminWarrantyReplacementItemsService(itemsTransactions);
    }

    ApiResponse<AdminWarrantyReplacementItemsResponse> item(Map<String, Object> body) {
      return item(body, UUID.randomUUID().toString());
    }

    ApiResponse<AdminWarrantyReplacementItemsResponse> item(Map<String, Object> body, String key) {
      var r =
          itemsService.save(
              "501",
              JSON.readValue(
                  JSON.writeValueAsString(body), AdminWarrantyReplacementItemsRequest.class),
              key,
              8L);
      messageWithoutNumbers(r.getMessage());
      return r;
    }

    Map<String, Object> hold(boolean serial) {
      variant.setCoQuanLySerial(serial);
      return item(serial
              ? m(
                  "hanh_dong",
                  "GIU_CHO_HANG_CUA_HANG",
                  "phien_ban_phuong_an",
                  1,
                  "so_serial_id",
                  601)
              : m(
                  "hanh_dong",
                  "GIU_CHO_HANG_CUA_HANG",
                  "phien_ban_phuong_an",
                  1,
                  "phien_ban_id",
                  101,
                  "so_luong",
                  1))
          .getData();
    }

    Map<String, Object> issue(boolean serial) {
      var h = hold(serial);
      var b = timed("XUAT_HANG_DOI");
      b.put("phien_ban_phuong_an", 1);
      b.put("giu_cho_lich_su_id", h.get("giu_cho_lich_su_id"));
      if (!serial) b.put("dau_hieu_nhan_dang", "Tem REPL-01");
      return item(b).getData();
    }
  }

  @BeforeEach
  void admin() {
    AdminWarrantyInvoiceServiceTest.role("ADMIN");
  }

  @AfterEach
  void cleanup() {
    SecurityContextHolder.clearContext();
  }

  static Map<String, Object> timed(String action) {
    return m(
        "hanh_dong",
        action,
        "thoi_diem",
        OffsetDateTime.now(VN).toString(),
        "chung_tu_urls",
        List.of("/media/bh/actual.jpg"));
  }

  static Map<String, Object> receive(boolean serial) {
    var b = timed("NHAN_HANG_DON_VI");
    b.putAll(
        m(
            "phien_ban_phuong_an",
            1,
            "nha_cung_cap_id",
            3,
            "phien_ban_thuc_nhan_id",
            101,
            "so_serial_thuc_nhan",
            serial ? "REPL-SUPPLIER" : null,
            "tinh_trang",
            "Mới",
            "phu_kien",
            BOX));
    if (!serial) b.put("dau_hieu_nhan_dang", "Tem REPL-01");
    return b;
  }

  static Map<String, Object> inverse(boolean serial, boolean good) {
    var b = timed("HOAN_XUAT_HANG_DOI");
    b.putAll(
        m(
            "giao_dich_xuat_the_kho_id",
            12001,
            "so_serial_thuc_nhan",
            serial ? "REPL-001" : null,
            "so_luong_ban_lai",
            good ? 1 : 0,
            "so_luong_can_xu_ly",
            good ? 0 : 1,
            "ket_qua_kiem_tra",
            "Đã kiểm tra hàng thực nhận"));
    if (!serial) b.put("dau_hieu_nhan_dang", "Tem REPL-01");
    return b;
  }

  static Map<String, Object> supplierReturn(long device) {
    var b = timed("TRA_HANG_CAP_RIENG_DON_VI");
    b.putAll(m("thiet_bi_id", device, "nha_cung_cap_id", 3, "ly_do", "Phương án đã hủy"));
    return b;
  }

  static void numbers(
      Map<String, Object> data, String key, int actual, int sellable, int damaged, int held) {
    var m = (Map<?, ?>) data.get(key);
    assertEquals(actual, ((Number) m.get("ton_thuc_te")).intValue());
    assertEquals(sellable, ((Number) m.get("ton_co_the_ban")).intValue());
    assertEquals(damaged, ((Number) m.get("hang_loi")).intValue());
    assertEquals(held, ((Number) m.get("so_luong_giu_cho_bao_hanh")).intValue());
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void reserveIssueAndReplayHaveExactDeltasAndOneUnit(boolean managed) {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.variant.setCoQuanLySerial(managed);
    var h = f.hold(managed);
    numbers(h, "bien_dong_ton", 0, -1, 0, 1);
    numbers(h, "ton_sau", 10, 9, 0, 1);
    assertNull(h.get("thiet_bi_thay_the_id"));
    assertNull(h.get("the_kho"));
    assertEquals(managed ? 601L : null, h.get("so_serial_id"));
    assertTrue(f.createdDevices.isEmpty());
    var body = timed("XUAT_HANG_DOI");
    body.putAll(m("phien_ban_phuong_an", 1, "giu_cho_lich_su_id", h.get("giu_cho_lich_su_id")));
    if (!managed) body.put("dau_hieu_nhan_dang", "Tem REPL-01");
    var key = UUID.randomUUID().toString();
    var data = f.item(body, key).getData();
    numbers(data, "bien_dong_ton", -1, 0, 0, -1);
    numbers(data, "ton_sau", 9, 9, 0, 0);
    assertEquals(1, f.cards.size());
    assertEquals(1, f.createdDevices.size());
    var device = f.ticket.getThietBiThayThe();
    assertSame(f.line, device.getChiTietDonHang());
    assertSame(f.variant, device.getPhienBan());
    assertNull(device.getHanBaoHanh());
    assertNull(device.getNgayKichHoat());
    assertEquals(TrangThaiBaoHanh.CHO_DOI_SAN_PHAM, f.ticket.getTrangThaiXuLy());
    assertEquals(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA, f.ticket.getKetQuaXuLy());
    assertEquals(false, data.get("co_the_ban_giao"));
    var replay = f.item(body, key).getData();
    assertEquals(
        JSON.readTree(JSON.writeValueAsString(data)),
        JSON.readTree(JSON.writeValueAsString(replay)));
    assertEquals(1, f.cards.size());
    verify(f.itemsRepository, never()).createSerial(any(), anyString());
    assertTrue(f.cash.isEmpty());
    assertTrue(f.invoices.isEmpty());
  }

  @ParameterizedTest
  @CsvSource({"true,true", "true,false", "false,true", "false,false"})
  void canceledIssuedItemRequiresActualIdentityAndReturnsOnlyOnce(boolean managed, boolean good) {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.issue(managed);
    f.save(cancel(1));
    assertEquals(9, f.stock.getTonThucTe());
    var data = f.item(inverse(managed, good)).getData();
    numbers(data, "bien_dong_ton", 1, good ? 1 : 0, good ? 0 : 1, 0);
    numbers(data, "ton_sau", 10, good ? 10 : 9, good ? 0 : 1, 0);
    assertEquals(2, f.cards.size());
    assertEquals(LoaiGiaoDichKho.HOAN_XUAT_DOI_BAO_HANH, f.cards.getLast().getLoaiGiaoDich());
    assertEquals(501L, f.cards.getLast().getPhieuBaoHanh().getId());
    assertNull(f.ticket.getThietBiThayThe());
    assertEquals(true, data.get("da_hoan_xuat"));
    assertEquals(false, data.get("dang_ap_dung_cho_phuong_an"));
    assertEquals(TrangThaiBaoHanh.DANG_KIEM_TRA, f.ticket.getTrangThaiXuLy());
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.item(inverse(managed, good)));
    assertEquals(2, f.cards.size());
    var revised = make();
    revised.put("thay_the_phien_ban", 1);
    f.save(revised);
    assertEquals(2L, f.history.id(f.plan().get("phien_ban")));
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void wrongReturnedPhysicalItemIsRecordedWithoutStockOrCard(boolean managed) {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.issue(managed);
    f.save(cancel(1));
    var b = inverse(managed, true);
    b.put(managed ? "so_serial_thuc_nhan" : "dau_hieu_nhan_dang", "Không đúng thiết bị");
    var data = f.item(b).getData();
    assertEquals(200, f.item(b, UUID.randomUUID().toString()).getStatus());
    assertEquals(false, data.get("da_hoan_xuat"));
    numbers(data, "bien_dong_ton", 0, 0, 0, 0);
    assertEquals(9, f.stock.getTonThucTe());
    assertEquals(1, f.cards.size());
    assertNotNull(f.ticket.getThietBiThayThe());
    assertNotNull(data.get("lich_su_nhan_id"));
    assertFalse(((List<?>) data.get("sai_lech")).isEmpty());
    assertNull(((Map<?, ?>) data.get("hang_thuc_nhan")).get("thiet_bi_id"));
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void supplierAllocationAndReturnNeverTouchShopInventory(boolean managed) {
    var f = new Fixture();
    f.variant.setCoQuanLySerial(managed);
    f.accepted("DON_VI_BAO_HANH");
    var data = f.item(receive(managed)).getData();
    numbers(data, "bien_dong_ton", 0, 0, 0, 0);
    assertEquals(TrangThaiBaoHanh.DA_NHAN_LAI, f.ticket.getTrangThaiXuLy());
    assertEquals(false, data.get("da_nhan_lai_thiet_bi_cu"));
    var child = f.ticket.getThietBiThayThe();
    assertNotNull(child);
    assertEquals(managed ? 1 : 0, f.createdSerials.size());
    assertNull(child.getHanBaoHanh());
    assertNull(child.getNgayKichHoat());
    f.save(cancel(1));
    var returned = f.item(supplierReturn(child.getId())).getData();
    assertEquals(true, returned.get("da_tra_nguon"));
    assertEquals(false, returned.get("dang_ap_dung_cho_phuong_an"));
    assertNull(f.ticket.getThietBiThayThe());
    assertEquals(
        "DANG_VAN_CHUYEN",
        f.history.latestSection(f.events, "noi_dang_giu_replacement").get("loai"));
    assertEquals("CUA_HANG", f.history.latestSection(f.events, "noi_dang_giu").get("loai"));
    assertEquals(
        "CUA_HANG", f.history.latestSection(f.events, "noi_dang_giu_thiet_bi_cu").get("loai"));
    assertTrue(f.cards.isEmpty());
    assertEquals(10, f.stock.getTonThucTe());
    error(
        ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.item(supplierReturn(child.getId())));
    var revision = make();
    revision.put("thay_the_phien_ban", 1);
    f.save(revision);
  }

  @Test
  void wrongSupplierVariantIsSavedWithoutAllocationAndNoClientAdmissionRequired() {
    var f = new Fixture();
    f.accepted("DON_VI_BAO_HANH");
    var b = receive(true);
    b.put("phien_ban_thuc_nhan_id", 103);
    var r = f.item(b);
    assertEquals(200, r.getStatus());
    assertNull(r.getData().get("thiet_bi_thay_the_id"));
    assertNull(r.getData().get("so_serial_id"));
    assertEquals(TrangThaiBaoHanh.CHO_DOI_SAN_PHAM, f.ticket.getTrangThaiXuLy());
    assertTrue(f.createdDevices.isEmpty());
    assertTrue(f.createdSerials.isEmpty());
    assertEquals(103L, ((Map<?, ?>) r.getData().get("hang_thuc_nhan")).get("phien_ban_id"));
    assertNotNull(r.getData().get("canh_bao"));
  }

  @Test
  void missingAccessoriesPersistIdsAndBlockReadinessUntilExplicitResolution() {
    var f = new Fixture();
    f.accepted("DON_VI_BAO_HANH");
    var b = receive(true);
    b.put("phu_kien", List.of());
    var r = f.item(b).getData();
    var difference = (Map<?, ?>) ((List<?>) r.get("sai_lech")).getFirst();
    assertEquals("THIEU_PHU_KIEN", difference.get("loai"));
    assertNotNull(difference.get("id"));
    var status =
        new AdminWarrantyStatusService(
            f.workflow,
            f.locks,
            f.histories,
            f.history,
            new WarrantyMutationSupport(f.dedup, JSON),
            JSON);
    var ready =
        m(
            "su_kien",
            "SAN_SANG_TRA",
            "thiet_bi_se_tra_id",
            701,
            "ket_qua_xu_ly",
            "CHUA_CO_KET_QUA",
            "tinh_trang",
            "Đã kiểm tra",
            "phu_kien",
            BOX,
            "can_cu_kiem_tra",
            "Đã đối chiếu phụ kiện",
            "sai_lech_da_xu_ly",
            List.of(),
            "phien_ban_phuong_an",
            1);
    error(
        ErrorCode.WARRANTY_HANDOVER_DEVICE_NOT_READY,
        () ->
            status.update(
                "501",
                JSON.readValue(JSON.writeValueAsString(ready), AdminWarrantyStatusRequest.class),
                UUID.randomUUID().toString(),
                8L));
    ready.put("sai_lech_da_xu_ly", List.of(difference.get("id")));
    assertEquals(
        200,
        status
            .update(
                "501",
                JSON.readValue(JSON.writeValueAsString(ready), AdminWarrantyStatusRequest.class),
                UUID.randomUUID().toString(),
                8L)
            .getStatus());
    assertEquals(TrangThaiSerial.GIU_CHO_BAO_HANH, f.createdSerials.getFirst().getTrangThai());
    assertTrue(f.cards.isEmpty());
  }

  @Test
  void cancellationReleasesActualReservationAndDoesNotCreateLedger() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.hold(true);
    f.save(cancel(1));
    assertEquals(10, f.stock.getTonCoTheBan());
    assertEquals(0, f.stock.getSoLuongGiuChoBaoHanh());
    assertEquals(TrangThaiSerial.TRONG_KHO, f.replacementSerial.getTrangThai());
    assertTrue(f.cards.isEmpty());
  }

  @Test
  void unknownPlanIsNotFoundWhileExistingSupersededPlanIsConflict() {
    var f = new Fixture();
    f.save(make());
    var body =
        m("hanh_dong", "GIU_CHO_HANG_CUA_HANG", "phien_ban_phuong_an", 999, "so_serial_id", 601);
    error(ErrorCode.NOT_FOUND, () -> f.item(body));
    var revised = make();
    revised.put("thay_the_phien_ban", 1);
    f.save(revised);
    body.put("phien_ban_phuong_an", 1);
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.item(body));
    assertEquals(10, f.stock.getTonCoTheBan());
    assertTrue(f.cards.isEmpty());
  }

  @Test
  void supplierResponseKeepsActualIdentityAndWithdrawnDeviceNeverBecomesCustomerRight() {
    var f = new Fixture();
    f.variant.setCoQuanLySerial(false);
    f.accepted("DON_VI_BAO_HANH");
    var data = f.item(receive(false)).getData();
    var actual = (Map<?, ?>) data.get("hang_thuc_nhan");
    assertEquals(701L, actual.get("thiet_bi_id"));
    assertEquals("TB000701", actual.get("ma_theo_doi"));
    assertEquals("Tem REPL-01", actual.get("dau_hieu_nhan_dang"));
    assertTrue(actual.containsKey("so_serial"));
    assertNull(actual.get("so_serial"));
    var device = f.ticket.getThietBiThayThe();
    f.save(cancel(1));
    var returned = f.item(supplierReturn(701)).getData();
    assertEquals(
        "DANG_VAN_CHUYEN", ((Map<?, ?>) returned.get("noi_dang_giu_replacement")).get("loai"));
    var lookup = mock(WarrantyLookupRepository.class);
    when(lookup.findIncomingReplacementTickets(701L)).thenReturn(List.of(f.ticket));
    var resolved = new WarrantyDeviceResolver(lookup, f.histories, f.history).resolve(device);
    assertFalse(resolved.hienHanh());
    assertNull(resolved.thietBiHienHanh());
    assertEquals("DEVICE_NOT_HANDED_OVER", resolved.lyDoChan().getFirst().code());
  }

  @Test
  void onlyDuplicateSerialIsConflictWhileInvalidDatabaseEnumRemainsServerFailure() {
    var tx = mock(WarrantyReplacementItemsTransactions.class);
    var service = new AdminWarrantyReplacementItemsService(tx);
    var body =
        JSON.readValue(
            JSON.writeValueAsString(
                m(
                    "hanh_dong",
                    "GIU_CHO_HANG_CUA_HANG",
                    "phien_ban_phuong_an",
                    1,
                    "so_serial_id",
                    601)),
            AdminWarrantyReplacementItemsRequest.class);
    when(tx.apply(any(), any(), any(), any()))
        .thenThrow(
            new org.springframework.dao.DataIntegrityViolationException(
                "duplicate",
                new java.sql.SQLException(
                    "Duplicate entry for key so_serial_san_pham.uk_serial", "23000", 1062)));
    error(
        ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT,
        () -> service.save("501", body, UUID.randomUUID().toString(), 8L));
    doThrow(
            new org.springframework.dao.DataIntegrityViolationException(
                "enum", new java.sql.SQLException("Invalid enum value", "01000", 1265)))
        .when(tx)
        .apply(any(), any(), any(), any());
    error(
        ErrorCode.WARRANTY_REPLACEMENT_ITEMS_FAILED,
        () -> service.save("501", body, UUID.randomUUID().toString(), 8L));
  }

  @ParameterizedTest
  @ValueSource(strings = {"LOI", "DA_BAN", "GIU_CHO_BAO_HANH", "DANG_BAO_HANH"})
  void unavailableSerialCannotBeHeld(String state) {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.replacementSerial.setTrangThai(TrangThaiSerial.valueOf(state));
    int size = f.events.size();
    error(ErrorCode.WARRANTY_REPLACEMENT_STOCK_UNAVAILABLE, () -> f.hold(true));
    assertEquals(size, f.events.size());
    assertEquals(10, f.stock.getTonCoTheBan());
  }

  @Test
  void noStockAndAnotherOwnerNeverConsumeStock() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.stock.setTonCoTheBan(0);
    error(ErrorCode.WARRANTY_REPLACEMENT_STOCK_UNAVAILABLE, () -> f.hold(false));
    assertTrue(f.cards.isEmpty());
    f.stock.setTonCoTheBan(10);
    when(f.replacementRepository.serialHeldByAnotherPlan(601L, 501L, 1L)).thenReturn(true);
    error(ErrorCode.WARRANTY_REPLACEMENT_STOCK_UNAVAILABLE, () -> f.hold(true));
  }

  @Test
  void wrongReservationWrongSourceDuplicateAndMissingConsentAreRejected() {
    var f = new Fixture();
    f.save(make());
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.hold(true));
    f.save(approve(1));
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.hold(true));
    f.save(decision(1, "DONG_Y"));
    f.hold(true);
    var issue = timed("XUAT_HANG_DOI");
    issue.putAll(m("phien_ban_phuong_an", 1, "giu_cho_lich_su_id", 999));
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.item(issue));
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.hold(true));
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.item(receive(true)));
    assertTrue(f.cards.isEmpty());
  }

  @Test
  void issuedAllocationCannotBeReturnedBeforeCancellationOrToWrongSupplier() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.issue(true);
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> f.item(inverse(true, true)));
    var supplier = new Fixture();
    supplier.accepted("DON_VI_BAO_HANH");
    supplier.item(receive(true));
    supplier.save(cancel(1));
    var b = supplierReturn(701);
    b.put("nha_cung_cap_id", 4);
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, () -> supplier.item(b));
    assertNotNull(supplier.ticket.getThietBiThayThe());
  }

  @Test
  void reusedKeyWithDifferentContentOrActorIsRejectedAndHandoverBlocksEverything() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    var b = m("hanh_dong", "GIU_CHO_HANG_CUA_HANG", "phien_ban_phuong_an", 1, "so_serial_id", 601);
    var key = UUID.randomUUID().toString();
    f.item(b, key);
    b.put("so_serial_id", 602);
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.item(b, key));
    f.ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
    error(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_HANDED_OVER, () -> f.item(b));
  }

  static Stream<Map<String, Object>> invalidBodies() {
    return Stream.of(
        m(),
        m("hanh_dong", "KHAC"),
        m(
            "hanh_dong",
            "GIU_CHO_HANG_CUA_HANG",
            "phien_ban_phuong_an",
            1,
            "so_serial_id",
            601,
            "nguoi_tao_id",
            8),
        m(
            "hanh_dong",
            "GIU_CHO_HANG_CUA_HANG",
            "phien_ban_phuong_an",
            1,
            "phien_ban_id",
            101,
            "so_luong",
            2),
        m(
            "hanh_dong",
            "GIU_CHO_HANG_CUA_HANG",
            "phien_ban_phuong_an",
            1,
            "phien_ban_id",
            101,
            "so_luong",
            1.0),
        m("hanh_dong", "GIU_CHO_HANG_CUA_HANG", "phien_ban_phuong_an", 0, "so_serial_id", 601),
        m("hanh_dong", "GIU_CHO_HANG_CUA_HANG", "phien_ban_phuong_an", 1, "so_serial_id", "601"));
  }

  @ParameterizedTest
  @MethodSource("invalidBodies")
  void strictDtoRejectsBackendFieldsAndNonIntegerQuantity(Map<String, Object> b) {
    var f = new Fixture();
    error(ErrorCode.INVALID_WARRANTY_REPLACEMENT_ITEMS, () -> f.item(b));
    verify(f.workflow, never()).lockTicket(any());
  }

  @Test
  void requestAndTransactionFailuresCannotBeReportedAsSuccess() throws Exception {
    var f = new Fixture();
    error(
        ErrorCode.INVALID_WARRANTY_REPLACEMENT_ITEMS,
        () ->
            f.item(
                m(
                    "hanh_dong",
                    "GIU_CHO_HANG_CUA_HANG",
                    "phien_ban_phuong_an",
                    1,
                    "so_serial_id",
                    601),
                null));
    var tx = mock(WarrantyReplacementItemsTransactions.class);
    when(tx.apply(any(), any(), any(), any()))
        .thenThrow(new IllegalStateException("commit failed"));
    var service = new AdminWarrantyReplacementItemsService(tx);
    var body =
        JSON.readValue(
            JSON.writeValueAsString(
                m(
                    "hanh_dong",
                    "GIU_CHO_HANG_CUA_HANG",
                    "phien_ban_phuong_an",
                    1,
                    "so_serial_id",
                    601)),
            AdminWarrantyReplacementItemsRequest.class);
    error(
        ErrorCode.WARRANTY_REPLACEMENT_ITEMS_FAILED,
        () -> service.save("501", body, UUID.randomUUID().toString(), 8L));
    var boundary =
        WarrantyReplacementItemsTransactions.class
            .getMethod("apply", Long.class, Map.class, String.class, Long.class)
            .getAnnotation(Transactional.class);
    assertNotNull(boundary);
    assertEquals(
        org.springframework.transaction.annotation.Isolation.READ_COMMITTED, boundary.isolation());
  }
}
