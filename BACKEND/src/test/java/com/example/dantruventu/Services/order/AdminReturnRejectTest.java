package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminReturnRejectRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnRejectResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.time.LocalDateTime;
import java.util.HashMap;
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

class AdminReturnRejectTest {

  private static final String KEY = "8f4b6a10-8632-4c37-8797-b47f371f14fa";
  private final PhieuTraHangRepository returns = mock(PhieuTraHangRepository.class);
  private final SoQuyThuChiRepository cash = mock(SoQuyThuChiRepository.class);
  private final LoaiThuChiRepository cashTypes = mock(LoaiThuChiRepository.class);
  private final SalesIdempotencyRepository keys = mock(SalesIdempotencyRepository.class);
  private final ObjectMapper mapper = new ObjectMapper();
  private final NguoiDung actor = NguoiDung.builder().id(7L).build();
  private final Map<String, SalesIdempotencyRepository.Entry> cache = new HashMap<>();
  private AdminReturnRejectService service;
  private PhieuTraHang slip;

  @BeforeEach
  void setup() {
    service =
        new AdminReturnRejectService(
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
    // Real idempotency logic; mocked storage. This does not simulate DB transactions/row locks.
    TransactionSynchronizationManager.setActualTransactionActive(true);
    TransactionSynchronizationManager.setCurrentTransactionReadOnly(false);
    when(keys.acquire(anyString(), anyLong(), anyString()))
        .thenAnswer(
            invocation -> {
              String key = invocation.getArgument(0);
              Long actorId = invocation.getArgument(1);
              String hash = invocation.getArgument(2);
              return cache.computeIfAbsent(
                  key, ignored -> new SalesIdempotencyRepository.Entry(actorId, hash, null));
            });
    doAnswer(
            invocation -> {
              String key = invocation.getArgument(0);
              var old = cache.get(key);
              cache.put(
                  key,
                  new SalesIdempotencyRepository.Entry(
                      old.actorId(), old.requestHash(), invocation.getArgument(1)));
              return null;
            })
        .when(keys)
        .complete(anyString(), anyString());
    slip =
        PhieuTraHang.builder()
            .id(300L)
            .maTraHang("TH000300")
            .trangThaiTraHang(TrangThaiTraHang.CHO_TIEP_NHAN)
            .build();
    when(returns.findByIdForUpdate(300L)).thenReturn(Optional.of(slip));
  }

  @AfterEach
  void cleanup() {
    TransactionSynchronizationManager.clear();
    verify(cash, never()).save(any());
    verify(cash, never()).saveAndFlush(any());
    verifyNoInteractions(cashTypes);
  }

  @Test
  void noCustodyEndsAndReleasesWithoutDeletingReturnLines() {
    var response = reject();
    assertEquals(TrangThaiTraHang.TU_CHOI, response.trangThaiTraHang());
    assertFalse(response.dangGiuHang());
    assertTrue(response.daGiaiPhongQuyenTra());
    assertNotNull(response.ngayKetThuc());
    assertEquals(response.ngayKetThuc().toLocalDateTime(), slip.getNgayKetThuc());
    assertEquals(
        "TU_CHOI", ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()).get("muc_dich_ket_thuc"));
    verify(returns).saveAndFlush(slip);
    verify(returns, never()).delete(any(PhieuTraHang.class));
  }

  @Test
  void heldItemsWaitForHandoverAndKeepInspectionEvidence() {
    var held = List.of(Map.of("ma_muc_nhan", "HN-1", "so_luong", 1));
    var inspection = Map.of("ghi_chu", "Hàng sai serial");
    slip.setDuLieuNhanHang(
        ReturnSnapshotJson.encode(Map.of("hang_dang_giu", held, "ket_qua_kiem_tra", inspection)));
    slip.setNgayTiepNhanThucTe(LocalDateTime.now());
    var response = reject();
    assertEquals(TrangThaiTraHang.CHO_TRA_KHACH, response.trangThaiTraHang());
    assertTrue(response.dangGiuHang());
    assertFalse(response.daGiaiPhongQuyenTra());
    assertNull(response.ngayKetThuc());
    assertNull(slip.getNgayKetThuc());
    assertEquals(held, ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()).get("hang_dang_giu"));
    assertEquals(
        inspection, ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()).get("ket_qua_kiem_tra"));
    assertTrue(mapper.writeValueAsString(response).contains("\"ngay_ket_thuc\":null"));
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiTraHang.class,
      names = {"DA_NHAN_HANG", "HOAN_TAT", "DA_HOAN_TIEN"})
  void acceptedAndRefundedStatesAreBlocked(TrangThaiTraHang status) {
    slip.setTrangThaiTraHang(status);
    var error = assertThrows(AppException.class, this::reject);
    assertEquals(ErrorCode.CONFLICT, error.getErrorCode());
    assertEquals("RETURN_ALREADY_ACCEPTED", error.getCode());
    verify(returns, never()).saveAndFlush(any());
    verify(keys, never()).complete(anyString(), anyString());
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiTraHang.class,
      names = {"HUY", "TU_CHOI", "CHO_TRA_KHACH"})
  void newKeysCannotRestartClosedOrPendingHandoverSlips(TrangThaiTraHang status) {
    slip.setTrangThaiTraHang(status);
    assertEquals(ErrorCode.CONFLICT, assertThrows(AppException.class, this::reject).getErrorCode());
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void acceptedTimestampBlocksEvenIfStatusIsStale() {
    slip.setNgayNhanHang(LocalDateTime.now());
    assertThrows(AppException.class, this::reject);
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void acceptedSnapshotBlocksEvenIfStatusIsStale() {
    slip.setDuLieuNhanHang(
        ReturnSnapshotJson.encode(Map.of("hang_da_nhan", List.of(Map.of("so_luong", 1)))));
    assertThrows(AppException.class, this::reject);
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void linkedRefundExpenseBlocksRejection() {
    when(returns.findRefundExpenseByReturnId(300L))
        .thenReturn(Optional.of(mock(PhieuTraHangRepository.RefundExpenseProjection.class)));
    assertThrows(AppException.class, this::reject);
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void legacyRefundVoucherAlsoBlocksRejection() {
    when(cash.findByMaPhieu("CHI-TH-300")).thenReturn(Optional.of(new SoQuyThuChi()));
    assertThrows(AppException.class, this::reject);
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void inconsistentReceiptDoesNotReleaseRights() {
    slip.setNgayTiepNhanThucTe(LocalDateTime.now());
    var error = assertThrows(AppException.class, this::reject);
    assertEquals("RETURN_CUSTODY_INCONSISTENT", error.getCode());
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void malformedCustodyIsNotTreatedAsEmpty() {
    slip.setDuLieuNhanHang(ReturnSnapshotJson.encode(Map.of("hang_dang_giu", "invalid")));
    assertThrows(AppException.class, this::reject);
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void sameKeyReplaysExactResponseWithoutSecondWrite() {
    var first = reject();
    var second = reject();
    assertEquals(first, second);
    verify(returns, times(1)).findByIdForUpdate(300L);
    verify(returns, times(1)).saveAndFlush(slip);
  }

  @Test
  void sameKeyWithDifferentPayloadIsConflict() {
    reject();
    var changed = request();
    changed.setLyDo("Khác lý do");
    assertEquals(
        ErrorCode.CONFLICT,
        assertThrows(AppException.class, () -> service.reject(300L, KEY, changed, actor))
            .getErrorCode());
    verify(returns, times(1)).findByIdForUpdate(300L);
  }

  @Test
  void sameKeyCannotBeReusedForAnotherSlipOrActor() {
    reject();
    assertThrows(AppException.class, () -> service.reject(301L, KEY, request(), actor));
    assertThrows(
        AppException.class,
        () -> service.reject(300L, KEY, request(), NguoiDung.builder().id(8L).build()));
    verify(returns, times(1)).findByIdForUpdate(anyLong());
  }

  @Test
  void newKeyAfterSuccessfulRejectIsConflict() {
    reject();
    assertThrows(
        AppException.class,
        () -> service.reject(300L, "9f4b6a10-8632-4c37-8797-b47f371f14fa", request(), actor));
    verify(returns, times(1)).saveAndFlush(slip);
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {" ", "abc", "1-1-1-1-1"})
  void invalidKeyDoesNotAcquireLocks(String key) {
    assertEquals(
        ErrorCode.INVALID_DATA,
        assertThrows(AppException.class, () -> service.reject(300L, key, request(), actor))
            .getErrorCode());
    verifyNoInteractions(returns);
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {" ", "\n\t"})
  void emptyReasonDoesNotAcquireLocks(String reason) {
    var request = request();
    request.setLyDo(reason);
    assertThrows(AppException.class, () -> service.reject(300L, KEY, request, actor));
    verifyNoInteractions(returns);
  }

  @Test
  void missingActorAndInvalidIdAreRejectedBeforeWrites() {
    assertEquals(
        ErrorCode.UNAUTHORIZED,
        assertThrows(AppException.class, () -> service.reject(300L, KEY, request(), null))
            .getErrorCode());
    assertEquals(
        ErrorCode.INVALID_DATA,
        assertThrows(AppException.class, () -> service.reject(0L, KEY, request(), actor))
            .getErrorCode());
    verifyNoInteractions(returns);
  }

  @Test
  void missingSlipIs404AndDoesNotCacheSuccess() {
    when(returns.findByIdForUpdate(300L)).thenReturn(Optional.empty());
    assertEquals(
        ErrorCode.NOT_FOUND, assertThrows(AppException.class, this::reject).getErrorCode());
    verify(keys, never()).complete(anyString(), anyString());
  }

  @Test
  void writeFailureDoesNotCacheSuccess() {
    when(returns.saveAndFlush(slip)).thenThrow(new IllegalStateException("DB write failed"));
    assertThrows(IllegalStateException.class, this::reject);
    verify(keys, never()).complete(anyString(), anyString());
  }

  private AdminReturnRejectResponse reject() {
    return service.reject(300L, KEY, request(), actor);
  }

  @Test
  void persistsBasisEvidenceActorAndKeepsExistingSnapshotWithoutMutatingIt() {
    var original =
        Map.<String, Object>of("kiem_tra_chinh_sach_khi_lap", Map.of("du_dieu_kien", true));
    slip.setDuLieuNhanHang(ReturnSnapshotJson.encode(original));
    var response = reject();
    var audit =
        (Map<?, ?>) ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()).get("yeu_cau_tu_choi");
    assertEquals("Đối chiếu serial và hóa đơn", audit.get("can_cu"));
    assertEquals(List.of("/uploads/tu-choi-300.jpg"), audit.get("bang_chung_urls"));
    assertEquals(7L, ((Number) audit.get("nguoi_thuc_hien_id")).longValue());
    assertEquals(
        response.ngayKetThuc().toInstant(),
        java.time.OffsetDateTime.parse((String) audit.get("thoi_diem")).toInstant());
    assertEquals(
        Map.of("du_dieu_kien", true),
        ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()).get("kiem_tra_chinh_sach_khi_lap"));
    assertFalse(original.containsKey("yeu_cau_tu_choi"));
  }

  @Test
  void heldItemsExposeOnlyHandoverInExistingDetailLogic() {
    slip.setDuLieuNhanHang(
        ReturnSnapshotJson.encode(Map.of("hang_dang_giu", List.of(Map.of("ma_muc_nhan", "HN-1")))));
    reject();
    var snapshot = ReturnDetailSnapshot.read(ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()));
    assertEquals("TU_CHOI", snapshot.endPurpose());
    assertEquals(
        List.of("BAN_GIAO_LAI"),
        snapshot.allowedActions(
            slip.getTrangThaiTraHang(), java.math.BigDecimal.TEN, null, null, false));
  }

  @Test
  void noCustodyFinishedRejectionExposesNoFurtherActions() {
    reject();
    assertEquals(
        List.of(),
        ReturnDetailSnapshot.read(ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()))
            .allowedActions(
                slip.getTrangThaiTraHang(),
                java.math.BigDecimal.TEN,
                null,
                slip.getNgayKetThuc(),
                false));
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {" ", "\n\t"})
  void emptyBasisIs400BeforeLocks(String basis) {
    var request = request();
    request.setCanCu(basis);
    assertEquals(
        ErrorCode.INVALID_DATA,
        assertThrows(AppException.class, () -> service.reject(300L, KEY, request, actor))
            .getErrorCode());
    verifyNoInteractions(returns);
  }

  @Test
  void blankAndNullEvidenceEntriesAreRejectedBeforeLocks() {
    for (String value : java.util.Arrays.asList(null, "", " ")) {
      var request = request();
      request.setBangChungUrls(java.util.Collections.singletonList(value));
      assertThrows(AppException.class, () -> service.reject(300L, KEY, request, actor));
    }
    verifyNoInteractions(returns);
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void evidenceArrayIsOptional(boolean sendNull) {
    var request = request();
    request.setBangChungUrls(sendNull ? null : List.of());
    service.reject(300L, KEY, request, actor);
    var audit =
        (Map<?, ?>) ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()).get("yeu_cau_tu_choi");
    assertEquals(List.of(), audit.get("bang_chung_urls"));
  }

  @Test
  void savedCustodyFlagWithoutItemsCannotReleaseRights() {
    slip.setDuLieuNhanHang(
        ReturnSnapshotJson.encode(Map.of("dang_giu_hang", true, "hang_dang_giu", List.of())));
    var error = assertThrows(AppException.class, this::reject);
    assertEquals("RETURN_CUSTODY_INCONSISTENT", error.getCode());
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void bodyCannotOverrideActualCustodyFromSavedItems() {
    slip.setDuLieuNhanHang(
        ReturnSnapshotJson.encode(
            Map.of(
                "dang_giu_hang", false, "hang_dang_giu", List.of(Map.of("ma_muc_nhan", "HN-1")))));
    assertTrue(reject().dangGiuHang());
    assertEquals(true, ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()).get("dang_giu_hang"));
  }

  @Test
  void sameKeyWithChangedBasisOrEvidenceIsConflict() {
    reject();
    var changedBasis = request();
    changedBasis.setCanCu("Biên bản kiểm tra khác");
    assertThrows(AppException.class, () -> service.reject(300L, KEY, changedBasis, actor));
    var changedEvidence = request();
    changedEvidence.setBangChungUrls(List.of("/uploads/khac.jpg"));
    assertThrows(AppException.class, () -> service.reject(300L, KEY, changedEvidence, actor));
    verify(returns, times(1)).saveAndFlush(slip);
  }

  @Test
  void sameKeyReplaysHeldResponseAndDoesNotReplaceFirstEvidence() {
    slip.setDuLieuNhanHang(
        ReturnSnapshotJson.encode(Map.of("hang_dang_giu", List.of(Map.of("ma_muc_nhan", "HN-1")))));
    var first = reject();
    var second = reject();
    assertEquals(first, second);
    assertNull(second.ngayKetThuc());
    verify(returns, times(1)).saveAndFlush(slip);
  }

  private AdminReturnRejectRequest request() {
    var request = new AdminReturnRejectRequest();
    request.setLyDo("Hàng thực nhận không đúng thiết bị được yêu cầu");
    request.setCanCu("Đối chiếu serial và hóa đơn");
    request.setBangChungUrls(List.of("/uploads/tu-choi-300.jpg"));
    return request;
  }

  @Test
  void currentBusinessKeyExpenseBlocksTheOperationWithoutTheLegacyVoucherNumber() {
    when(cash.findByBusinessKey("CHI-TH-300")).thenReturn(Optional.of(new SoQuyThuChi()));
    var error = assertThrows(AppException.class, () -> reject());
    assertEquals("RETURN_ALREADY_ACCEPTED", error.getCode());
    verify(returns, never()).saveAndFlush(any());
  }
}
