package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.promotion.AdminPromotionController;
import com.example.dantruventu.Entity.ChiTietKhuyenMai;
import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Enum.LoaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.promotion.AdminPromotionDetailRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository.PromotionUsageStatusCount;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AdminPromotionDeleteTest {
  private static final String URL = "/api/v1/admin/promotions/{id}";
  private final SalesProperties sales = new SalesProperties();
  private final AdminPromotionRepository programs = mock(AdminPromotionRepository.class);
  private final AdminPromotionDetailRepository details = mock(AdminPromotionDetailRepository.class);
  private final AdminPromotionService service =
      new AdminPromotionService(
          programs, details, null, sales, null, null, null, null, null, null, null);
  private final MockMvc mvc =
      MockMvcBuilders.standaloneSetup(new AdminPromotionController(service))
          .setControllerAdvice(new GlobalExceptionHandler())
          .build();
  private final KhuyenMai program =
      KhuyenMai.builder()
          .id(15L)
          .maChuongTrinh("DON2TRIEUQUA")
          .soLuongDaDung(0)
          .phienBanCauHinh(1)
          .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
          .build();
  private final List<ChiTietKhuyenMai> lines =
      List.of(
          line(920L, 101L, LoaiApDungKhuyenMai.SAN_PHAM_MUA),
          line(921L, 301L, LoaiApDungKhuyenMai.SAN_PHAM_TANG));

  @BeforeEach
  void setup() {
    when(programs.findByIdForUpdate(15L)).thenReturn(Optional.of(program));
    when(programs.countUsageByStatus(15L)).thenReturn(List.of());
    when(details.findByKhuyenMai_IdOrderByIdAsc(15L)).thenReturn(lines);
  }

  @Test
  void f01DeletesUnlinkedProgramAndBothDetailRolesWithoutRequestBodyOrIdempotencyKey()
      throws Exception {
    mvc.perform(delete(URL, 15))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value(200))
        .andExpect(jsonPath("$.message").value("Xóa khuyến mại thành công"))
        .andExpect(jsonPath("$.data.id").value(15))
        .andExpect(jsonPath("$.data.ma_chuong_trinh").value("DON2TRIEUQUA"));

    var order = inOrder(programs, details);
    order.verify(programs).findByIdForUpdate(15L);
    order.verify(programs).countUsageByStatus(15L);
    order.verify(details).findByKhuyenMai_IdOrderByIdAsc(15L);
    order.verify(details).deleteAll(lines);
    order.verify(details).flush();
    order.verify(programs).delete(program);
    order.verify(programs).flush();
    verifyNoMoreInteractions(programs, details);
  }

  @Test
  void deletesProgramWithoutDetailLines() throws Exception {
    when(details.findByKhuyenMai_IdOrderByIdAsc(15L)).thenReturn(List.of());
    mvc.perform(delete(URL, 15)).andExpect(status().isOk());
    verify(details, never()).deleteAll(any());
    verify(details, never()).flush();
    verify(programs).delete(program);
  }

  @ParameterizedTest
  @EnumSource(TrangThaiApDungKhuyenMai.class)
  void f02EveryHistoryStatusBlocksDeletionEvenWhenUsedCounterIsZero(
      TrangThaiApDungKhuyenMai applicationStatus) throws Exception {
    when(programs.countUsageByStatus(15L))
        .thenReturn(List.of(new UsageCount(applicationStatus, 1)));
    mvc.perform(delete(URL, 15))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409))
        .andExpect(
            jsonPath("$.message")
                .value("Chương trình đã có lịch sử áp dụng, hãy tạm dừng thay vì xóa"))
        .andExpect(jsonPath("$.data").value((Object) null))
        .andExpect(jsonPath("$.errors[0].field").value("id"))
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_HAS_ORDER_HISTORY"))
        .andExpect(
            jsonPath("$.errors[0].message")
                .value("Chương trình đã có lịch sử áp dụng, hãy tạm dừng thay vì xóa"));
    verify(programs, never()).delete(any(KhuyenMai.class));
    verify(programs, never()).flush();
    verifyNoInteractions(details);
    assertEquals(0, program.getSoLuongDaDung());
    assertEquals(1, program.getPhienBanCauHinh());
    assertEquals(TrangThaiCoBanEnum.HOAT_DONG, program.getTrangThai());
  }

  @Test
  void mixedReleasedAndUsedHistoryCannotBeDeleted() throws Exception {
    program.setSoLuongDaDung(23);
    when(programs.countUsageByStatus(15L))
        .thenReturn(
            List.of(
                new UsageCount(TrangThaiApDungKhuyenMai.DA_SU_DUNG, 23),
                new UsageCount(TrangThaiApDungKhuyenMai.GIU_CHO, 3),
                new UsageCount(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG, 2)));
    mvc.perform(delete(URL, 15))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_HAS_ORDER_HISTORY"));
    verifyNoInteractions(details);
    verify(programs, never()).delete(any(KhuyenMai.class));
  }

  @Test
  void pausingAndExpiringAProgramDoesNotRemoveTheHistoryRestriction() throws Exception {
    program.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    program.setNgayKetThuc(LocalDateTime.now(sales.zone()).minusDays(1));
    when(programs.countUsageByStatus(15L))
        .thenReturn(List.of(new UsageCount(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG, 1)));
    mvc.perform(delete(URL, 15))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_HAS_ORDER_HISTORY"));
    verifyNoInteractions(details);
    verify(programs, never()).delete(any(KhuyenMai.class));
  }

  @Test
  void readsHistoryAfterAcquiringTheProgramLock() throws Exception {
    var lockAcquired = new AtomicBoolean();
    when(programs.findByIdForUpdate(15L))
        .thenAnswer(
            invocation -> {
              lockAcquired.set(true);
              return Optional.of(program);
            });
    when(programs.countUsageByStatus(15L))
        .thenAnswer(
            invocation ->
                lockAcquired.get()
                    ? List.of(new UsageCount(TrangThaiApDungKhuyenMai.GIU_CHO, 1))
                    : List.of());
    mvc.perform(delete(URL, 15))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_HAS_ORDER_HISTORY"));
    verify(programs, never()).delete(any(KhuyenMai.class));
    verifyNoInteractions(details);
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 2})
  void historyQueryIsTheSameDeletionCriterionAsTheDetailPermissionFlag(int legacyUsedCounter)
      throws Exception {
    // A legacy counter is not an application record; KM04 reports canDelete=true for no links.
    program.setSoLuongDaDung(legacyUsedCounter);
    mvc.perform(delete(URL, 15)).andExpect(status().isOk());
    verify(programs).delete(program);
  }

  @Test
  void absentLegacyCounterDoesNotPreventDeletingUnlinkedProgram() throws Exception {
    program.setSoLuongDaDung(null);
    mvc.perform(delete(URL, 15)).andExpect(status().isOk());
    verify(programs).delete(program);
  }

  @ParameterizedTest
  @ValueSource(strings = {"0", "-1", "abc", "9223372036854775808"})
  void rejectsInvalidIdBeforeDatabaseAccess(String id) throws Exception {
    mvc.perform(delete(URL, id)).andExpect(status().isBadRequest());
    verifyNoInteractions(programs, details);
  }

  @Test
  void missingProgramReturns404WithoutReadingOrDeletingDetails() throws Exception {
    mvc.perform(delete(URL, 404)).andExpect(status().isNotFound());
    verify(programs, never()).countUsageByStatus(any());
    verify(programs, never()).delete(any(KhuyenMai.class));
    verifyNoInteractions(details);
  }

  @Test
  void deletedProgramIsNotFoundAndCannotBeDeletedTwice() throws Exception {
    when(programs.findByIdForUpdate(15L)).thenReturn(Optional.of(program), Optional.empty());
    mvc.perform(delete(URL, 15)).andExpect(status().isOk());
    mvc.perform(get(URL, 15)).andExpect(status().isNotFound());
    mvc.perform(delete(URL, 15)).andExpect(status().isNotFound());
    verify(programs).delete(program);
  }

  @Test
  void detailWriteFailurePropagatesAndStopsParentDeletion() {
    var failure = new DataIntegrityViolationException("detail delete failed");
    doThrow(failure).when(details).flush();
    assertSame(
        failure,
        assertThrows(DataIntegrityViolationException.class, () -> service.deletePromotion(15L)));
    verify(programs, never()).delete(any(KhuyenMai.class));
    verify(programs, never()).flush();
  }

  @Test
  void parentWriteFailurePropagatesInsteadOfReportingSuccess() {
    var failure = new DataIntegrityViolationException("program delete failed");
    doThrow(failure).when(programs).flush();
    assertSame(
        failure,
        assertThrows(DataIntegrityViolationException.class, () -> service.deletePromotion(15L)));
    verify(details).deleteAll(lines);
    verify(programs).delete(program);
  }

  private record UsageCount(TrangThaiApDungKhuyenMai status, long quantity)
      implements PromotionUsageStatusCount {
    public TrangThaiApDungKhuyenMai getStatus() {
      return status;
    }

    public long getUsageCount() {
      return quantity;
    }
  }

  private ChiTietKhuyenMai line(long id, long variantId, LoaiApDungKhuyenMai role) {
    return ChiTietKhuyenMai.builder()
        .id(id)
        .phienBan(PhienBanSanPham.builder().id(variantId).build())
        .loaiApDung(role)
        .soLuong(1)
        .build();
  }
}
