package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminReturnHandoverRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnHandoverResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

class AdminReturnHandoverTest {

  private static final String KEY = "8f4b6a10-8632-4c37-8797-b47f371f14fa";
  private static final OffsetDateTime HANDED_AT = OffsetDateTime.parse("2026-10-12T12:30:00+07:00");
  private final PhieuTraHangRepository returns = mock(PhieuTraHangRepository.class);
  private final SoQuyThuChiRepository cash = mock(SoQuyThuChiRepository.class);
  private final LoaiThuChiRepository cashTypes = mock(LoaiThuChiRepository.class);
  private final SalesIdempotencyRepository keys = mock(SalesIdempotencyRepository.class);
  private final ObjectMapper mapper = new ObjectMapper();
  private final NguoiDung actor = NguoiDung.builder().id(7L).build();
  private final Map<String, SalesIdempotencyRepository.Entry> cache = new HashMap<>();
  private AdminReturnHandoverService service;
  private PhieuTraHang slip;

  @BeforeEach
  void setup() {
    service =
        new AdminReturnHandoverService(
            returns,
            cash,
            new CashbookService(
                cash,
                cashTypes,
                keys,
                mapper,
                mock(OrderEvents.class),
                mock(org.springframework.jdbc.core.JdbcTemplate.class),
                mock(com.example.dantruventu.Services.documents.DocumentNumberService.class)),
            new SalesProperties(),
            mock(OrderEvents.class));
    // Exercise real fingerprint/replay logic. Mocked repositories do not prove DB row
    // locks/rollback.
    TransactionSynchronizationManager.setActualTransactionActive(true);
    TransactionSynchronizationManager.setCurrentTransactionReadOnly(false);
    when(keys.acquire(anyString(), anyLong(), anyString()))
        .thenAnswer(
            call -> {
              String key = call.getArgument(0);
              return cache.computeIfAbsent(
                  key,
                  ignored ->
                      new SalesIdempotencyRepository.Entry(
                          call.getArgument(1), call.getArgument(2), null));
            });
    doAnswer(
            call -> {
              String key = call.getArgument(0);
              var old = cache.get(key);
              cache.put(
                  key,
                  new SalesIdempotencyRepository.Entry(
                      old.actorId(), old.requestHash(), call.getArgument(1)));
              return null;
            })
        .when(keys)
        .complete(anyString(), anyString());
    slip =
        PhieuTraHang.builder()
            .id(300L)
            .trangThaiTraHang(TrangThaiTraHang.CHO_TRA_KHACH)
            .ngayTiepNhanThucTe(LocalDateTime.of(2026, 10, 12, 11, 30))
            .tongTienHoan(new BigDecimal("1045000"))
            .lyDoKetThuc("Lý do đã lưu")
            .duLieuNhanHang(
                ReturnSnapshotJson.encode(
                    new LinkedHashMap<>(
                        Map.of(
                            "muc_dich_ket_thuc", "TU_CHOI",
                            "dang_giu_hang", true,
                            "hang_dang_giu", heldItems(),
                            "hang_da_nhan", List.of(),
                            "yeu_cau_tu_choi",
                                Map.of("ly_do", "Lý do đã lưu", "can_cu", "Biên bản"),
                            "kiem_tra_chinh_sach_khi_lap", Map.of("du_dieu_kien", true)))))
            .build();
    when(returns.findByIdForUpdate(300L)).thenReturn(Optional.of(slip));
  }

  @AfterEach
  void cleanup() {
    TransactionSynchronizationManager.clear();
    verify(cash, never()).save(any());
    verify(cash, never()).saveAndFlush(any());
    verifyNoInteractions(cashTypes);
    verify(returns, never()).delete(any(PhieuTraHang.class));
  }

  @ParameterizedTest
  @ValueSource(strings = {"TU_CHOI", "HUY"})
  void completesOnlyTheSavedPurposeAndPreservesCustodyAudit(String purpose) {
    putSnapshot("muc_dich_ket_thuc", purpose);
    Map<String, Object> original = ReturnSnapshotJson.decode(slip.getDuLieuNhanHang());
    String before = mapper.writeValueAsString(original);
    var result = handover();
    assertEquals(TrangThaiTraHang.valueOf(purpose), result.trangThaiTraHang());
    assertEquals(HANDED_AT, result.ngayKetThuc());
    assertEquals(HANDED_AT.toLocalDateTime(), slip.getNgayKetThuc());
    assertFalse(result.dangGiuHang());
    assertTrue(result.daGiaiPhongQuyenTra());
    assertNull(result.phieuChi());
    assertEquals(new BigDecimal("1045000"), slip.getTongTienHoan());
    assertNull(slip.getNgayNhanHang());
    assertEquals("Lý do đã lưu", slip.getLyDoKetThuc());
    var saved = ReturnSnapshotJson.decode(slip.getDuLieuNhanHang());
    assertNotSame(original, saved);
    assertEquals(before, mapper.writeValueAsString(original));
    assertEquals(List.of(), saved.get("hang_dang_giu"));
    assertEquals(heldItems(), saved.get("hang_da_ban_giao"));
    assertEquals(false, saved.get("dang_giu_hang"));
    assertEquals(original.get("yeu_cau_tu_choi"), saved.get("yeu_cau_tu_choi"));
    assertEquals(
        original.get("kiem_tra_chinh_sach_khi_lap"), saved.get("kiem_tra_chinh_sach_khi_lap"));
    var audit = (Map<?, ?>) saved.get("ban_giao_lai");
    assertEquals(7L, ((Number) audit.get("nguoi_thuc_hien_id")).longValue());
    assertNotNull(audit.get("thoi_diem_ghi_nhan"));
    assertEquals(
        HANDED_AT.toInstant(),
        OffsetDateTime.parse((String) audit.get("ngay_ban_giao")).toInstant());
    assertEquals(
        List.of(),
        ReturnDetailSnapshot.read(saved)
            .allowedActions(
                slip.getTrangThaiTraHang(),
                slip.getTongTienHoan(),
                null,
                slip.getNgayKetThuc(),
                false));
    assertEquals(audit, ReturnDetailSnapshot.read(saved).handover());
    verify(returns).saveAndFlush(slip);
    var json = mapper.readTree(mapper.writeValueAsString(result));
    assertTrue(json.has("phieu_chi"));
    assertTrue(json.get("phieu_chi").isNull());
    assertEquals(
        "2026-10-12T12:30:00+07:00", json.path("ban_giao_lai").path("ngay_ban_giao").asText());
  }

  @Test
  void replayReturnsTheSameOffsetAndNestedProofWithoutAnotherWrite() {
    var first = handover();
    assertEquals(first, handover());
    assertEquals(HANDED_AT.getOffset(), handover().ngayKetThuc().getOffset());
    verify(returns, times(1)).findByIdForUpdate(300L);
    verify(returns, times(1)).saveAndFlush(slip);
    verify(keys, times(1)).complete(eq("TH-HANDOVER-" + KEY), anyString());
  }

  @ParameterizedTest
  @ValueSource(strings = {"recipient", "phone", "time", "evidence", "condition", "items"})
  void reusedKeyWithChangedProofIs409(String changed) {
    handover();
    var request = request();
    switch (changed) {
      case "recipient" -> request.setTenNguoiNhan("Người nhận khác");
      case "phone" -> request.setSdtNguoiNhan("0900000001");
      case "time" -> request.setNgayBanGiao(HANDED_AT.plusMinutes(1));
      case "evidence" -> request.setBangChungUrls(List.of("/uploads/khac.jpg"));
      case "condition" -> request.getHangBanGiao().getFirst().setTinhTrang("Mô tả khác");
      case "items" -> request.setHangBanGiao(List.of(request.getHangBanGiao().getFirst()));
      default -> fail();
    }
    assertEquals(
        ErrorCode.CONFLICT,
        assertThrows(AppException.class, () -> service.handover(300L, KEY, request, actor))
            .getErrorCode());
    verify(returns, times(1)).saveAndFlush(slip);
  }

  @Test
  void keysAreScopedToActorReturnAndOperation() {
    handover();
    assertThrows(AppException.class, () -> service.handover(301L, KEY, request(), actor));
    assertThrows(
        AppException.class,
        () -> service.handover(300L, KEY, request(), NguoiDung.builder().id(8L).build()));
    assertTrue(cache.containsKey("TH-HANDOVER-" + KEY));
    verify(returns, never()).findByIdForUpdate(301L);
  }

  @Test
  void uppercaseUuidReplaysTheSameOperation() {
    var first = handover();
    assertEquals(
        first, service.handover(300L, KEY.toUpperCase(java.util.Locale.ROOT), request(), actor));
    verify(returns, times(1)).saveAndFlush(slip);
  }

  @Test
  void freshKeyCannotRepeatSuccessfulHandover() {
    handover();
    var error =
        assertThrows(
            AppException.class,
            () -> service.handover(300L, "f2ca2e42-5b04-47b1-b09a-6c2ac88b6c15", request(), actor));
    assertEquals("HANDOVER_NOT_ALLOWED", error.getCode());
    verify(returns, times(1)).saveAndFlush(slip);
  }

  @Test
  void documentsF03MissingOneHeldItemIsStructured422WithoutChangingCustody() {
    var request = request();
    request.setHangBanGiao(List.of(request.getHangBanGiao().getFirst()));
    assertFailure(request, ErrorCode.UNPROCESSABLE_ENTITY, "HANDOVER_INCOMPLETE");
  }

  @ParameterizedTest
  @ValueSource(ints = {1, 3})
  void underOrOverQuantityDoesNotReleaseAnything(int quantity) {
    var request = request();
    request.getHangBanGiao().get(1).setSoLuong(quantity);
    assertFailure(request, ErrorCode.UNPROCESSABLE_ENTITY, "HANDOVER_INCOMPLETE");
  }

  @ParameterizedTest
  @ValueSource(strings = {"missing", "wrong", "extra", "duplicate-count"})
  void allAccessoryNamesAndTheirMultiplicityMustMatch(String variant) {
    var request = request();
    switch (variant) {
      case "missing" -> request.getHangBanGiao().getFirst().setPhuKien(List.of("Hộp"));
      case "wrong" -> request.getHangBanGiao().getFirst().setPhuKien(List.of("Hộp", "Cáp khác"));
      case "extra" ->
          request.getHangBanGiao().getFirst().setPhuKien(List.of("Hộp", "Cáp USB", "Túi"));
      case "duplicate-count" -> request.getHangBanGiao().get(1).setPhuKien(List.of("Hộp"));
      default -> fail();
    }
    assertFailure(request, ErrorCode.UNPROCESSABLE_ENTITY, "HANDOVER_INCOMPLETE");
  }

  @Test
  void orderingAndFreshConditionTextDoNotChangeTheIdentityCheck() {
    var request = request();
    request.getHangBanGiao().getFirst().setPhuKien(List.of(" Cáp USB ", " Hộp "));
    request.setTenNguoiNhan(" Nguyễn Văn An ");
    request.setSdtNguoiNhan(" 0912345678 ");
    request.setBangChungUrls(List.of(" /uploads/ban-giao.jpg "));
    request.setHangBanGiao(
        List.of(request.getHangBanGiao().get(1), request.getHangBanGiao().getFirst()));
    var response = service.handover(300L, KEY, request, actor);
    assertEquals("Nguyễn Văn An", response.banGiaoLai().tenNguoiNhan());
    assertEquals(List.of("/uploads/ban-giao.jpg"), response.banGiaoLai().bangChungUrls());
  }

  @Test
  void aForeignReceiptCodeIs404() {
    var request = request();
    request.getHangBanGiao().getFirst().setMaMucNhan("HN-OTHER");
    assertFailure(request, ErrorCode.NOT_FOUND, "HANDOVER_ITEM_NOT_FOUND");
  }

  @Test
  void duplicateReceiptCodeCannotSubstituteForAnotherItem() {
    var request = request();
    request.getHangBanGiao().get(1).setMaMucNhan(" HN-1 ");
    assertFailure(request, ErrorCode.INVALID_DATA, "HANDOVER_ITEM_DUPLICATED");
    verifyNoInteractions(returns, keys);
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiTraHang.class,
      mode = EnumSource.Mode.EXCLUDE,
      names = "CHO_TRA_KHACH")
  void onlyPendingHandoverStateIsAllowed(TrangThaiTraHang state) {
    slip.setTrangThaiTraHang(state);
    assertFailure(request(), ErrorCode.CONFLICT, "HANDOVER_NOT_ALLOWED");
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {"HOAN_TAT", "huy", " HUY", "UNKNOWN"})
  void missingOrInvalidSavedPurposeCannotBeChosenByClient(String purpose) {
    putSnapshot("muc_dich_ket_thuc", purpose);
    assertFailure(request(), ErrorCode.CONFLICT, "HANDOVER_END_PURPOSE_MISSING");
  }

  @ParameterizedTest
  @ValueSource(strings = {"accepted-date", "accepted-items", "refund-fk", "refund-code"})
  void staleStateCannotHandoverAlreadyAcceptedOrRefundedGoods(String evidence) {
    switch (evidence) {
      case "accepted-date" -> slip.setNgayNhanHang(LocalDateTime.of(2026, 10, 12, 12, 0));
      case "accepted-items" -> putSnapshot("hang_da_nhan", List.of(Map.of("thiet_bi_id", 801)));
      case "refund-fk" ->
          when(returns.findRefundExpenseByReturnId(300L))
              .thenReturn(Optional.of(mock(PhieuTraHangRepository.RefundExpenseProjection.class)));
      case "refund-code" ->
          when(cash.findByMaPhieu("CHI-TH-300")).thenReturn(Optional.of(mock(SoQuyThuChi.class)));
      default -> fail();
    }
    assertFailure(request(), ErrorCode.CONFLICT, "RETURN_ALREADY_ACCEPTED");
  }

  @ParameterizedTest
  @ValueSource(strings = {"ended", "handover"})
  void stalePendingStateWithExistingCompletionCannotBeOverwritten(String evidence) {
    if (evidence.equals("ended")) slip.setNgayKetThuc(HANDED_AT.toLocalDateTime());
    else putSnapshot("ban_giao_lai", Map.of("ten_nguoi_nhan", "Đã giao"));
    assertFailure(request(), ErrorCode.CONFLICT, "HANDOVER_NOT_ALLOWED");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "absent",
        "empty",
        "object",
        "bad-item",
        "missing-code",
        "missing-quantity",
        "fractional-quantity",
        "string-quantity",
        "overflow-quantity",
        "zero-quantity",
        "missing-condition",
        "missing-accessories",
        "object-accessories",
        "null-accessory",
        "blank-accessory",
        "duplicate-code",
        "bad-accepted-list"
      })
  void corruptCustodyCannotBeInterpretedAsSafeToRelease(String variant) {
    var item = new LinkedHashMap<>(held("HN-1", 1, List.of("Hộp", "Cáp USB")));
    switch (variant) {
      case "absent" -> removeSnapshot("hang_dang_giu");
      case "empty" -> putSnapshot("hang_dang_giu", List.of());
      case "object" -> putSnapshot("hang_dang_giu", Map.of());
      case "bad-item" -> putSnapshot("hang_dang_giu", List.of("HN-1"));
      case "bad-accepted-list" -> putSnapshot("hang_da_nhan", "bad");
      case "duplicate-code" -> putSnapshot("hang_dang_giu", List.of(item, item));
      default -> {
        switch (variant) {
          case "missing-code" -> item.remove("ma_muc_nhan");
          case "missing-quantity" -> item.remove("so_luong");
          case "fractional-quantity" -> item.put("so_luong", new BigDecimal("1.5"));
          case "string-quantity" -> item.put("so_luong", "1");
          case "overflow-quantity" -> item.put("so_luong", 2147483648L);
          case "zero-quantity" -> item.put("so_luong", 0);
          case "missing-condition" -> item.remove("tinh_trang");
          case "missing-accessories" -> item.remove("phu_kien");
          case "object-accessories" -> item.put("phu_kien", Map.of("Hộp", 1));
          case "null-accessory" -> item.put("phu_kien", Arrays.asList("Hộp", null));
          case "blank-accessory" -> item.put("phu_kien", List.of(" "));
          default -> fail();
        }
        putSnapshot("hang_dang_giu", List.of(item));
      }
    }
    assertFailure(request(), ErrorCode.CONFLICT, "RETURN_CUSTODY_INCONSISTENT");
  }

  @Test
  void futureHandoverCannotFinishBeforeThePhysicalEvent() {
    var future = request();
    future.setNgayBanGiao(OffsetDateTime.now().plusDays(1));
    assertFailure(future, ErrorCode.INVALID_DATA, null);
    verifyNoInteractions(returns, keys);
  }

  @Test
  void handoverCannotPredateReceiptWhenOffsetsAreDifferent() {
    var beforeReceipt = request();
    beforeReceipt.setNgayBanGiao(OffsetDateTime.parse("2026-10-12T04:00:00Z"));
    assertFailure(beforeReceipt, ErrorCode.INVALID_DATA, null);
  }

  @Test
  void utcHandoverIsStoredAndReturnedInTheConfiguredBusinessZone() {
    var utc = request();
    utc.setNgayBanGiao(OffsetDateTime.parse("2026-10-12T05:30:00Z"));
    assertEquals(HANDED_AT, service.handover(300L, KEY, utc, actor).ngayKetThuc());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "confirmation-null",
        "confirmation-false",
        "name",
        "phone",
        "time",
        "no-evidence",
        "empty-evidence",
        "blank-evidence",
        "no-items",
        "empty-items",
        "null-item",
        "code",
        "quantity-null",
        "quantity-zero",
        "condition",
        "null-accessories",
        "blank-accessory"
      })
  void invalidBusinessInputDoesNotAcquireAnyWriteLock(String variant) {
    var request = request();
    switch (variant) {
      case "confirmation-null" -> request.setXacNhanTraDuHang(null);
      case "confirmation-false" -> request.setXacNhanTraDuHang(false);
      case "name" -> request.setTenNguoiNhan(" ");
      case "phone" -> request.setSdtNguoiNhan(null);
      case "time" -> request.setNgayBanGiao(null);
      case "no-evidence" -> request.setBangChungUrls(null);
      case "empty-evidence" -> request.setBangChungUrls(List.of());
      case "blank-evidence" -> request.setBangChungUrls(List.of(" "));
      case "no-items" -> request.setHangBanGiao(null);
      case "empty-items" -> request.setHangBanGiao(List.of());
      case "null-item" -> request.setHangBanGiao(java.util.Collections.singletonList(null));
      case "code" -> request.getHangBanGiao().getFirst().setMaMucNhan(" ");
      case "quantity-null" -> request.getHangBanGiao().getFirst().setSoLuong(null);
      case "quantity-zero" -> request.getHangBanGiao().getFirst().setSoLuong(0);
      case "condition" -> request.getHangBanGiao().getFirst().setTinhTrang(null);
      case "null-accessories" -> request.getHangBanGiao().getFirst().setPhuKien(null);
      case "blank-accessory" -> request.getHangBanGiao().getFirst().setPhuKien(List.of(" "));
      default -> fail();
    }
    assertFailure(request, ErrorCode.INVALID_DATA, null);
    verifyNoInteractions(returns, keys);
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(
      strings = {
        "bad-key",
        " 8f4b6a10-8632-4c37-8797-b47f371f14fa",
        "8f4b6a10-8632-4c37-8797-b47f371f14fa "
      })
  void invalidKeyNeverAcquiresAnIdempotencyEntry(String key) {
    assertThrows(AppException.class, () -> service.handover(300L, key, request(), actor));
    verifyNoInteractions(returns, keys);
  }

  @Test
  void noActorLockedActorAndInvalidIdsAreBlockedBeforePersistence() {
    assertEquals(
        ErrorCode.UNAUTHORIZED,
        assertThrows(AppException.class, () -> service.handover(300L, KEY, request(), null))
            .getErrorCode());
    actor.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    assertEquals(
        ErrorCode.FORBIDDEN,
        assertThrows(AppException.class, () -> service.handover(300L, KEY, request(), actor))
            .getErrorCode());
    actor.setTrangThai(TrangThaiCoBanEnum.HOAT_DONG);
    for (Long id : Arrays.asList(null, 0L, -1L)) {
      assertThrows(AppException.class, () -> service.handover(id, KEY, request(), actor));
    }
    verifyNoInteractions(returns, keys);
  }

  @Test
  void nullRequestIs400AndMissingReturnIs404() {
    assertThrows(AppException.class, () -> service.handover(300L, KEY, null, actor));
    verifyNoInteractions(returns, keys);
    assertEquals(
        ErrorCode.NOT_FOUND,
        assertThrows(AppException.class, () -> service.handover(999L, KEY, request(), actor))
            .getErrorCode());
    verify(keys, never()).complete(anyString(), anyString());
  }

  @Test
  void failedPersistenceDoesNotCacheASuccessResponse() {
    doThrow(new IllegalStateException("DB write failed")).when(returns).saveAndFlush(slip);
    assertThrows(IllegalStateException.class, this::handover);
    verify(keys, never()).complete(anyString(), anyString());
  }

  @Test
  void falseLegacyHoldingFlagDoesNotDiscardActualSavedItems() {
    putSnapshot("dang_giu_hang", false);
    assertTrue(handover().daGiaiPhongQuyenTra());
    assertEquals(
        heldItems(), ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()).get("hang_da_ban_giao"));
  }

  @Test
  void cannotHandOverAParcelBeforeItsOwnInspectionTime() {
    var items = new ArrayList<>(heldItems());
    var laterItem = new LinkedHashMap<>(items.get(1));
    laterItem.put("ngay_tiep_nhan_thuc_te", HANDED_AT.plusMinutes(5).toString());
    items.set(1, laterItem);
    putSnapshot("hang_dang_giu", items);
    assertFailure(request(), ErrorCode.INVALID_DATA, null);
  }

  private void assertFailure(
      AdminReturnHandoverRequest request, ErrorCode code, String detailCode) {
    String snapshot =
        mapper.writeValueAsString(ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()));
    var state = slip.getTrangThaiTraHang();
    var endedAt = slip.getNgayKetThuc();
    var error = assertThrows(AppException.class, () -> service.handover(300L, KEY, request, actor));
    assertEquals(code, error.getErrorCode());
    if (detailCode != null) assertEquals(detailCode, error.getCode());
    assertEquals(
        snapshot, mapper.writeValueAsString(ReturnSnapshotJson.decode(slip.getDuLieuNhanHang())));
    assertEquals(state, slip.getTrangThaiTraHang());
    assertEquals(endedAt, slip.getNgayKetThuc());
    verify(returns, never()).saveAndFlush(any());
    verify(keys, never()).complete(anyString(), anyString());
  }

  private AdminReturnHandoverResponse handover() {
    return service.handover(300L, KEY, request(), actor);
  }

  private AdminReturnHandoverRequest request() {
    var request = new AdminReturnHandoverRequest();
    request.setXacNhanTraDuHang(true);
    request.setTenNguoiNhan("Nguyễn Văn An");
    request.setSdtNguoiNhan("0912345678");
    request.setNgayBanGiao(HANDED_AT);
    request.setHangBanGiao(
        new ArrayList<>(
            List.of(
                item("HN-1", 1, List.of("Hộp", "Cáp USB")),
                item("HN-2", 2, List.of("Hộp", "Hộp")))));
    request.setBangChungUrls(List.of("/uploads/ban-giao.jpg"));
    return request;
  }

  private AdminReturnHandoverRequest.Item item(
      String code, int quantity, List<String> accessories) {
    var item = new AdminReturnHandoverRequest.Item();
    item.setMaMucNhan(code);
    item.setSoLuong(quantity);
    item.setTinhTrang("Theo biên bản bàn giao");
    item.setPhuKien(accessories);
    return item;
  }

  private List<Map<String, Object>> heldItems() {
    return List.of(
        held("HN-1", 1, List.of("Hộp", "Cáp USB")), held("HN-2", 2, List.of("Hộp", "Hộp")));
  }

  private Map<String, Object> held(String code, int quantity, List<String> accessories) {
    return Map.of(
        "ma_muc_nhan",
        code,
        "so_luong",
        quantity,
        "tinh_trang",
        "Đang kiểm tra",
        "phu_kien",
        accessories,
        "dau_hieu_nhan_dang",
        "KIEN-" + code);
  }

  private void putSnapshot(String key, Object value) {
    var data = new java.util.LinkedHashMap<>(ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()));
    data.put(key, value);
    slip.setDuLieuNhanHang(ReturnSnapshotJson.encode(data));
  }

  private void removeSnapshot(String key) {
    var data = new java.util.LinkedHashMap<>(ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()));
    data.remove(key);
    slip.setDuLieuNhanHang(ReturnSnapshotJson.encode(data));
  }

  @Test
  void currentBusinessKeyExpenseBlocksTheOperationWithoutTheLegacyVoucherNumber() {
    when(cash.findByBusinessKey("CHI-TH-300")).thenReturn(Optional.of(new SoQuyThuChi()));
    var error = assertThrows(AppException.class, () -> handover());
    assertEquals("RETURN_ALREADY_ACCEPTED", error.getCode());
    verify(returns, never()).saveAndFlush(any());
  }
}
