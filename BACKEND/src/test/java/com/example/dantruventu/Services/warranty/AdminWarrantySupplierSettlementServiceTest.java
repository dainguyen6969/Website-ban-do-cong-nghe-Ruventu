package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.AdminWarrantyEventServiceTest.*;
import static com.example.dantruventu.Services.warranty.AdminWarrantyReplacementItemsServiceTest.timed;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantySupplierSettlementRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantySupplierSettlementResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class AdminWarrantySupplierSettlementServiceTest {
  static class Fixture extends AdminWarrantyReplacementItemsServiceTest.Fixture {
    WarrantySupplierSettlementRepository settlementsRepository =
        mock(WarrantySupplierSettlementRepository.class);
    WarrantySupplierSettlementTransactions settlementsTransactions;
    AdminWarrantySupplierSettlementService settlementsService;

    Fixture() {
      when(itemsRepository.selectedSerial(51L)).thenReturn(serial);
      when(settlementsRepository.issue(anyLong()))
          .thenAnswer(
              a ->
                  issues.stream()
                      .filter(i -> i.getId().equals(a.getArgument(0)))
                      .findFirst()
                      .orElseThrow(
                          () ->
                              WarrantyReadException.notFound(
                                  ErrorCode.NOT_FOUND,
                                  "giao_dich_xuat_the_kho_id",
                                  "REPLACEMENT_ISSUE_NOT_FOUND")));
      when(settlementsRepository.receipt(any(), any(), anyInt(), any()))
          .thenAnswer(
              a -> {
                TonKho s = a.getArgument(1);
                var card =
                    TheKho.builder()
                        .id(13001L + cards.size())
                        .phieuBaoHanh(ticket)
                        .khoHang(s.getKhoHang())
                        .phienBan(s.getPhienBan())
                        .loaiGiaoDich(LoaiGiaoDichKho.NHAP_BU_BAO_HANH)
                        .soLuongThayDoi(a.getArgument(2))
                        .tonCuoi(s.getTonThucTe())
                        .build();
                cards.add(card);
                return card;
              });
      settlementsTransactions =
          new WarrantySupplierSettlementTransactions(
              workflow,
              locks,
              histories,
              history,
              details,
              replacementRepository,
              itemsRepository,
              settlementsRepository,
              replacementTransactions,
              resources,
              new WarrantyMutationSupport(dedup, JSON),
              JSON);
      settlementsService = new AdminWarrantySupplierSettlementService(settlementsTransactions);
    }

    ApiResponse<AdminWarrantySupplierSettlementResponse> settlement(Map<String, Object> body) {
      return settlement(body, UUID.randomUUID().toString());
    }

    ApiResponse<AdminWarrantySupplierSettlementResponse> settlement(
        Map<String, Object> body, String key) {
      var result = settlementsService.save("501", request(body), key, 8L);
      messageWithoutNumbers(result.getMessage());
      return result;
    }

    Map<String, Object> ready(boolean serialManaged) {
      accepted("TON_KHO_CUA_HANG");
      return issue(serialManaged);
    }

    long obligation() {
      var r =
          settlement(
              m(
                  "hanh_dong",
                  "GHI_NGHIA_VU",
                  "nha_cung_cap_id",
                  3,
                  "giao_dich_xuat_the_kho_id",
                  issues.getFirst().getId(),
                  "so_luong_can_bu",
                  1,
                  "can_cu",
                  "NCC xác nhận bù đúng hàng cửa hàng đã đổi trước",
                  "chung_tu_urls",
                  List.of("/media/bh/nghia-vu.jpg")));
      return ((Number) r.getData().get("nghia_vu_lich_su_id")).longValue();
    }

    long send(long obligation) {
      var r =
          settlement(
              body(
                  "GUI_THIET_BI_CU",
                  obligation,
                  "thiet_bi_cu_id",
                  700,
                  "nha_cung_cap_id",
                  3,
                  "ten_don_vi",
                  "Trung tâm A",
                  "phu_kien",
                  BOX));
      return ((Number) r.getData().get("lan_gui_lich_su_id")).longValue();
    }

    Map<String, Object> supplierReceives(long obligation, long send) {
      return settlement(
              body(
                  "DON_VI_NHAN_THIET_BI_CU",
                  obligation,
                  "lan_gui_lich_su_id",
                  send,
                  "nguoi_nhan",
                  "Nhân viên A"))
          .getData();
    }

    long oldReturns(long obligation) {
      var r =
          settlement(
              body(
                  "NHAN_THIET_BI_CU",
                  obligation,
                  "thiet_bi_id",
                  700,
                  "tinh_trang",
                  "Đã sửa",
                  "quyen_so_huu",
                  "CHUA_XAC_DINH"));
      return ((Number) r.getData().get("nhan_thiet_bi_cu_lich_su_id")).longValue();
    }

    void completeCustomer() {
      var snapshot = new LinkedHashMap<>(plan());
      snapshot.put("da_ban_giao", true);
      add(
          nextId++,
          "HANDOVER",
          m(
              "phuong_an_doi",
              snapshot,
              "giao_nhan",
              m("thiet_bi_cu_id", 700, "thiet_bi_id", ticket.getThietBiThayThe().getId()),
              "noi_dang_giu_thiet_bi_cu",
              m("loai", "CUA_HANG", "thiet_bi_id", 700)));
      ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
      ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.DOI_SAN_PHAM);
      serial.setTrangThai(TrangThaiSerial.DA_THAY_THE_BAO_HANH);
      replacementSerial.setTrangThai(TrangThaiSerial.DA_BAN);
    }
  }

  static AdminWarrantySupplierSettlementRequest request(Map<String, Object> body) {
    return JSON.readValue(
        JSON.writeValueAsString(body), AdminWarrantySupplierSettlementRequest.class);
  }

  static Map<String, Object> body(String action, long obligation, Object... pairs) {
    var result =
        m(
            "hanh_dong",
            action,
            "nghia_vu_lich_su_id",
            obligation,
            "chung_tu_urls",
            List.of("/media/bh/chung-tu.jpg"));
    if (Set.of("GUI_THIET_BI_CU", "DON_VI_NHAN_THIET_BI_CU", "NHAN_HANG_BU", "NHAN_THIET_BI_CU")
        .contains(action)) result.put("thoi_diem", OffsetDateTime.now().toString());
    result.putAll(m(pairs));
    return result;
  }

  static Map<String, Object> goods(long id, boolean managed, boolean bad) {
    return body(
        "NHAN_HANG_BU",
        id,
        "phien_ban_id",
        101,
        "so_luong",
        1,
        "serials",
        managed ? List.of("COMP-001") : List.of(),
        "quyen_so_huu",
        "CUA_HANG",
        "tinh_trang",
        bad ? "Hàng lỗi" : "Đạt kiểm tra",
        "can_cu_so_huu",
        "Biên bản xác nhận bù thuộc cửa hàng",
        "so_luong_ban_lai",
        bad ? 0 : 1,
        "so_luong_can_xu_ly",
        bad ? 1 : 0);
  }

  @BeforeEach
  void setup() {
    AdminWarrantyInvoiceServiceTest.role("ADMIN");
    TransactionSynchronizationManager.setActualTransactionActive(true);
  }

  @AfterEach
  void cleanup() {
    SecurityContextHolder.clearContext();
    TransactionSynchronizationManager.clear();
  }

  @Test
  void e01RecordsOnlyExplicitObligationAfterActualApprovedIssue() {
    var f = new Fixture();
    f.ready(true);
    int count = f.cards.size();
    long id = f.obligation();
    var value = new WarrantySupplierSettlementSnapshots(f.history).require(f.events, id);
    assertEquals(1, ((Number) value.get("so_luong_con_bu")).intValue());
    assertEquals(count, f.cards.size());
    assertTrue(f.cash.isEmpty());
    assertTrue(f.invoices.isEmpty());
    assertEquals(false, value.get("da_giai_quyet"));
    error(ErrorCode.SUPPLIER_SETTLEMENT_ALREADY_RESOLVED, f::obligation);
  }

  @Test
  void e02e03CompletedTicketShipsOldWithoutReopeningCustomerOrStock() {
    var f = new Fixture();
    f.ready(true);
    f.completeCustomer();
    long id = f.obligation();
    int before = f.stock.getTonThucTe();
    long sent = f.send(id);
    var result = f.supplierReceives(id, sent);
    assertEquals(TrangThaiBaoHanh.HOAN_TAT, f.ticket.getTrangThaiXuLy());
    assertEquals(TrangThaiSerial.DA_THAY_THE_BAO_HANH, f.serial.getTrangThai());
    assertEquals(before, f.stock.getTonThucTe());
    assertEquals(false, result.get("nghia_vu_gui_thiet_bi_cu_con_mo"));
    assertEquals(false, result.get("da_giai_quyet"));
    assertEquals(1, ((Number) result.get("so_luong_con_bu")).intValue());
    error(ErrorCode.SUPPLIER_SETTLEMENT_ALREADY_RESOLVED, () -> f.supplierReceives(id, sent));
  }

  @Test
  void f04SupplierSourceCanTrackOldOnlyWithoutInventingShopIssue() {
    var f = new Fixture();
    f.accepted("DON_VI_BAO_HANH");
    f.received(false);
    f.completeCustomer();
    var r =
        f.settlement(
            m(
                "hanh_dong",
                "GHI_NGHIA_VU",
                "nha_cung_cap_id",
                3,
                "so_luong_can_bu",
                0,
                "can_cu",
                "Nghĩa vụ gửi thiết bị cũ theo phương án hãng",
                "chung_tu_urls",
                List.of("/media/bh/old.jpg")));
    long id = ((Number) r.getData().get("nghia_vu_lich_su_id")).longValue();
    var d = f.supplierReceives(id, f.send(id));
    assertEquals(true, d.get("da_giai_quyet"));
    assertEquals("GUI_THIET_BI_CU", d.get("loai_nghia_vu"));
    assertTrue(f.cards.isEmpty());
  }

  @Test
  void e04CreatesStoreSerialAndOneReceiptButKeepsOldDutyOpen() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    int before = f.stock.getTonThucTe();
    var r = f.settlement(goods(id, true, false)).getData();
    assertEquals(before + 1, f.stock.getTonThucTe());
    assertEquals(TrangThaiSerial.TRONG_KHO, f.createdSerials.getFirst().getTrangThai());
    assertNull(f.createdSerials.getFirst().getDonHang());
    assertEquals(false, r.get("da_giai_quyet"));
    assertEquals(LoaiGiaoDichKho.NHAP_BU_BAO_HANH, f.cards.getLast().getLoaiGiaoDich());
    error(
        ErrorCode.SUPPLIER_SETTLEMENT_ALREADY_RESOLVED, () -> f.settlement(goods(id, true, false)));
  }

  @Test
  void e04ResolvesOnlyWhenGoodsAndOldDeliveryBothComplete() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    f.supplierReceives(id, f.send(id));
    assertEquals(true, f.settlement(goods(id, true, false)).getData().get("da_giai_quyet"));
  }

  @Test
  void e05OldReturnDoesNotCountAsCompensationOrStock() {
    var f = new Fixture();
    f.ready(true);
    f.completeCustomer();
    long id = f.obligation();
    f.supplierReceives(id, f.send(id));
    int stock = f.stock.getTonThucTe();
    long received = f.oldReturns(id);
    assertTrue(received > 0);
    var v = new WarrantySupplierSettlementSnapshots(f.history).require(f.events, id);
    assertEquals(1, ((Number) v.get("so_luong_con_bu")).intValue());
    assertEquals(stock, f.stock.getTonThucTe());
    assertEquals(TrangThaiSerial.DA_THAY_THE_BAO_HANH, f.serial.getTrangThai());
  }

  @Test
  void e06MoneyConversionDoesNotCreateCashAndReceiptCannotCloseOldDuty() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    var convert =
        body(
            "CHOT_PHUONG_AN_KHAC",
            id,
            "noi_dung",
            "Bù tiền thay hàng",
            "can_cu",
            "NCC xác nhận",
            "so_luong_quy_doi_duoc_chot",
            1,
            "so_tien_nghia_vu",
            100000);
    var d = f.settlement(convert).getData();
    assertEquals(false, d.get("da_giai_quyet"));
    assertEquals(0, ((Number) d.get("so_luong_con_bu")).intValue());
    assertTrue(f.cash.isEmpty());
    var payment = AdminWarrantyMoneyServiceTest.input("THU_DOI_SOAT_DON_VI", 100000);
    payment.put("nghia_vu_lich_su_id", id);
    f.receive(payment);
    var v = new WarrantySupplierSettlementSnapshots(f.history).require(f.events, id);
    assertEquals(false, v.get("da_giai_quyet"));
    var closed = f.supplierReceives(id, f.send(id));
    assertEquals(true, closed.get("da_giai_quyet"));
    error(ErrorCode.SUPPLIER_SETTLEMENT_ALREADY_RESOLVED, () -> f.settlement(convert));
  }

  @Test
  void e07RefusalClosesApprovedLossWithoutTouchingCustomer() {
    var f = new Fixture();
    f.ready(true);
    f.completeCustomer();
    long id = f.obligation();
    var r =
        f.settlement(
                body(
                    "GHI_NCC_TU_CHOI",
                    id,
                    "ly_do",
                    "NCC từ chối",
                    "quyet_dinh_xu_ly",
                    "Cửa hàng chịu, không thu khách",
                    "can_cu",
                    "Quyết định có quyền"))
            .getData();
    assertEquals(true, r.get("da_giai_quyet"));
    assertEquals(0, ((Number) r.get("so_luong_da_bu")).intValue());
    assertTrue(f.cash.isEmpty());
    assertEquals(TrangThaiBaoHanh.HOAN_TAT, f.ticket.getTrangThaiXuLy());
  }

  @Test
  void e08F14StoresFaultyCustodyWithoutStockSerialOrSettlement() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    int stock = f.stock.getTonThucTe(), serials = f.createdSerials.size(), cards = f.cards.size();
    var r = f.settlement(goods(id, true, true)).getData();
    assertEquals("CHUA_XAC_DINH", r.get("quyen_so_huu"));
    assertEquals(false, r.get("co_the_chot_bu"));
    assertEquals(1, ((Number) r.get("so_luong_con_bu")).intValue());
    assertEquals(stock, f.stock.getTonThucTe());
    assertEquals(serials, f.createdSerials.size());
    assertEquals(cards, f.cards.size());
    error(
        ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_CONFLICT, () -> f.settlement(goods(id, true, true)));
    error(
        ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_CONFLICT,
        () ->
            f.save(
                m(
                    "hanh_dong",
                    "HUY",
                    "phien_ban_phuong_an",
                    1,
                    "ly_do",
                    "Không được bỏ vật đang chờ xác minh")));
  }

  @Test
  void e09OldConversionRequiresPhysicalReceiptAndOnlyRestoresStoreStockOnce() {
    var f = new Fixture();
    f.ready(true);
    f.completeCustomer();
    long id = f.obligation();
    f.supplierReceives(id, f.send(id));
    long received = f.oldReturns(id);
    int stock = f.stock.getTonThucTe();
    var b =
        body(
            "CHOT_PHUONG_AN_KHAC",
            id,
            "noi_dung",
            "Dùng thiết bị cũ làm bù",
            "can_cu",
            "Quyết định đối soát",
            "so_luong_quy_doi_duoc_chot",
            1,
            "so_tien_nghia_vu",
            0,
            "hinh_thuc_doi_soat",
            "THIET_BI_CU_LAM_HANG_BU",
            "thiet_bi_id",
            700,
            "nhan_thiet_bi_cu_lich_su_id",
            received,
            "quyen_so_huu",
            "CUA_HANG",
            "can_cu_so_huu",
            "NCC xác nhận chuyển sở hữu",
            "phien_ban_id",
            101,
            "so_luong",
            1,
            "so_luong_ban_lai",
            1,
            "so_luong_can_xu_ly",
            0,
            "ket_qua_kiem_tra",
            "Đã sửa đạt");
    var r = f.settlement(b).getData();
    assertEquals(true, r.get("da_giai_quyet"));
    assertEquals(stock + 1, f.stock.getTonThucTe());
    assertEquals(TrangThaiSerial.TRONG_KHO, f.serial.getTrangThai());
    assertNull(f.serial.getDonHang());
    assertNull(f.serial.getHanBaoHanh());
    error(ErrorCode.SUPPLIER_SETTLEMENT_ALREADY_RESOLVED, () -> f.settlement(b));
    error(
        ErrorCode.SUPPLIER_SETTLEMENT_ALREADY_RESOLVED, () -> f.settlement(goods(id, true, false)));
  }

  @Test
  void e10NonSerialReceiptNeverCreatesManufacturerSerial() {
    var f = new Fixture();
    f.ready(false);
    long id = f.obligation();
    var r = f.settlement(goods(id, false, false)).getData();
    assertTrue(f.createdSerials.isEmpty());
    assertEquals(List.of(), r.get("serials"));
  }

  @Test
  void exactIdempotencyReplayCreatesNothingElseAndChangedBodyConflicts() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    var b = goods(id, true, false);
    String key = UUID.randomUUID().toString();
    var r = f.settlement(b, key);
    int events = f.events.size(), stock = f.stock.getTonThucTe();
    assertEquals(
        JSON.writeValueAsString(r.getData()),
        JSON.writeValueAsString(f.settlement(b, key).getData()));
    assertEquals(events, f.events.size());
    assertEquals(stock, f.stock.getTonThucTe());
    b.put("tinh_trang", "Nội dung khác");
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.settlement(b, key));
  }

  @Test
  void cannotAcceptOverQuantityOrUnknownOwnershipOrWrongVariant() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    var b = goods(id, true, false);
    b.put("quyen_so_huu", "CHUA_XAC_DINH");
    error(ErrorCode.WARRANTY_SUPPLIER_OWNERSHIP_UNVERIFIED, () -> f.settlement(b));
    b.put("quyen_so_huu", "CUA_HANG");
    b.put("phien_ban_id", 103);
    error(ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_CONFLICT, () -> f.settlement(b));
    b.put("phien_ban_id", 101);
    b.put("so_luong", 2);
    b.put("so_luong_ban_lai", 2);
    error(ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_CONFLICT, () -> f.settlement(b));
  }

  @Test
  void foreignOrMissingObligationIsNotFoundAndAuthorizationIsRequired() {
    var f = new Fixture();
    f.ready(true);
    error(ErrorCode.NOT_FOUND, () -> f.settlement(goods(9999, true, false)));
    AdminWarrantyInvoiceServiceTest.role("USER");
    error(
        ErrorCode.WARRANTY_SUPPLIER_APPROVAL_FORBIDDEN,
        () ->
            f.settlement(
                body(
                    "CHOT_PHUONG_AN_KHAC",
                    1,
                    "noi_dung",
                    "Bù tiền",
                    "can_cu",
                    "Xác nhận",
                    "so_luong_quy_doi_duoc_chot",
                    1,
                    "so_tien_nghia_vu",
                    100000)));
  }

  @Test
  void canceledIssueClosesUnfulfilledObligationWithAuditAndNoCash() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    f.save(m("hanh_dong", "HUY", "phien_ban_phuong_an", 1, "ly_do", "Hủy trước bàn giao"));
    var b = timed("HOAN_XUAT_HANG_DOI");
    b.putAll(
        m(
            "giao_dich_xuat_the_kho_id",
            f.issues.getFirst().getId(),
            "so_serial_thuc_nhan",
            "REPL-001",
            "so_luong_ban_lai",
            1,
            "so_luong_can_xu_ly",
            0,
            "ket_qua_kiem_tra",
            "Đạt"));
    f.item(b);
    var v = new WarrantySupplierSettlementSnapshots(f.history).require(f.events, id);
    assertEquals(true, v.get("da_giai_quyet"));
    assertEquals(true, v.get("huy_do_hoan_xuat"));
    assertTrue(f.cash.isEmpty());
    error(
        ErrorCode.SUPPLIER_SETTLEMENT_ALREADY_RESOLVED, () -> f.settlement(goods(id, true, false)));
  }

  @Test
  void alreadyCompensatedIssueCannotBeCanceledAndRestockedAgain() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    f.settlement(goods(id, true, false));
    error(
        ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_CONFLICT,
        () ->
            f.save(
                m("hanh_dong", "HUY", "phien_ban_phuong_an", 1, "ly_do", "Cố hoàn xuất sau bù")));
  }

  @Test
  void missingHeaderAndCommitFailureAreNeverSuccessful() {
    var f = new Fixture();
    f.ready(true);
    long id = f.obligation();
    error(
        ErrorCode.INVALID_WARRANTY_SUPPLIER_SETTLEMENT,
        () -> f.settlement(goods(id, true, false), null));
    var tx = mock(WarrantySupplierSettlementTransactions.class);
    when(tx.apply(anyLong(), anyMap(), anyString(), anyLong()))
        .thenThrow(new IllegalStateException("commit failed"));
    var service = new AdminWarrantySupplierSettlementService(tx);
    error(
        ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_FAILED,
        () ->
            service.save("501", request(goods(id, true, false)), UUID.randomUUID().toString(), 8L));
  }

  static Stream<Map<String, Object>> invalidBodies() {
    var b = goods(1, true, false);
    var unknown = new LinkedHashMap<>(b);
    unknown.put("nguoi_thuc_hien_id", 8);
    var fractional = new LinkedHashMap<>(b);
    fractional.put("so_luong", 1.5);
    var duplicates = new LinkedHashMap<>(b);
    duplicates.put("serials", List.of("ABC", "abc"));
    var negative = new LinkedHashMap<>(b);
    negative.put("so_luong_can_xu_ly", -1);
    return Stream.of(
        m(),
        unknown,
        fractional,
        duplicates,
        negative,
        body(
            "CHOT_PHUONG_AN_KHAC",
            1,
            "noi_dung",
            "Bù",
            "can_cu",
            "Xác nhận",
            "so_luong_quy_doi_duoc_chot",
            1,
            "so_tien_nghia_vu",
            0));
  }

  @ParameterizedTest
  @MethodSource("invalidBodies")
  void rejectsMalformedDto(Map<String, Object> body) {
    error(
        ErrorCode.INVALID_WARRANTY_SUPPLIER_SETTLEMENT,
        () -> WarrantySupplierSettlementValidation.validate(request(body)));
  }
}
