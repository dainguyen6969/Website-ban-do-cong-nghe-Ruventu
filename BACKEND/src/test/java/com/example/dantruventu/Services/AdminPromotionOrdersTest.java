package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.promotion.AdminPromotionOrdersController;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Entity.KhuyenMaiDonHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.promotion.AdminPromotionOrderRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionOrderRepository.GiftRow;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;

class AdminPromotionOrdersTest {
  private static final String URL = "/api/v1/admin/promotions/{id}/orders";
  private final AdminPromotionRepository programs = mock(AdminPromotionRepository.class);
  private final AdminPromotionOrderRepository applications =
      mock(AdminPromotionOrderRepository.class);
  private final SalesContext context = mock(SalesContext.class);
  private final SalesProperties sales = new SalesProperties();
  private final AdminPromotionOrdersService service =
      new AdminPromotionOrdersService(
          programs, applications, context, sales, JsonMapper.builder().build());
  private final MockMvc mvc =
      MockMvcBuilders.standaloneSetup(new AdminPromotionOrdersController(service))
          .setControllerAdvice(new GlobalExceptionHandler())
          .build();
  private final NguoiDung actor =
      NguoiDung.builder()
          .id(1L)
          .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
          .vaiTro(VaiTro.builder().maVaiTro("ADMIN").tenVaiTro("System administrator").build())
          .build();
  private final LocalDateTime time = LocalDateTime.of(2026, 10, 12, 9, 0);
  private final DonHang order =
      DonHang.builder()
          .id(1001L)
          .maDonHang("ORD-001")
          .loaiDonHang(LoaiDonHang.ONLINE)
          .ngayTao(time)
          .khachHang(NguoiDung.builder().id(20L).build())
          .nhanVien(NguoiDung.builder().id(99L).build())
          .tenNguoiNhan("Nguyễn Văn An")
          .sdtNguoiNhan("0901234567")
          .trangThaiDonHang(TrangThaiDonHang.HOAN_THANH)
          .build();
  private final KhuyenMaiDonHang application =
      KhuyenMaiDonHang.builder()
          .id(801L)
          .donHang(order)
          .khuyenMai(
              KhuyenMai.builder()
                  .id(10L)
                  .phienBanCauHinh(2)
                  .maChuongTrinh("NEWCODE")
                  .tenChuongTrinh("Tên mới")
                  .build())
          .maChuongTrinh("SALECPU10")
          .tenChuongTrinh("Giảm 10% CPU")
          .soTienGiam(BigDecimal.valueOf(200000))
          .trangThaiApDung(TrangThaiApDungKhuyenMai.DA_SU_DUNG)
          .duLieuApDung("{\"phien_ban_cau_hinh\":1,\"san_pham\":[]}")
          .ngayTao(time)
          .ngayCapNhat(time.plusHours(3))
          .build();

  @BeforeEach
  void setup() {
    when(context.actor()).thenReturn(actor);
    when(programs.existsById(10L)).thenReturn(true);
    when(applications.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(call -> new PageImpl<>(List.of(application), call.getArgument(1), 1));
    when(applications.findGiftRows(any())).thenReturn(List.of());
  }

  @Test
  void f01ReadsSnapshotFieldsAndAllOrderMetadataWithDefaultPagination() throws Exception {
    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Lấy đơn áp dụng khuyến mại thành công"))
        .andExpect(jsonPath("$.data.khuyen_mai_id").value(10))
        .andExpect(jsonPath("$.data.items[0].khuyen_mai_don_hang_id").value(801))
        .andExpect(jsonPath("$.data.items[0].don_hang_id").value(1001))
        .andExpect(jsonPath("$.data.items[0].ma_don_hang").value("ORD-001"))
        .andExpect(jsonPath("$.data.items[0].loai_don_hang").value("ONLINE"))
        .andExpect(jsonPath("$.data.items[0].khach_hang_id").value(20))
        .andExpect(jsonPath("$.data.items[0].ten_nguoi_nhan").value("Nguyễn Văn An"))
        .andExpect(jsonPath("$.data.items[0].sdt_nguoi_nhan").value("0901234567"))
        .andExpect(jsonPath("$.data.items[0].ngay_tao_don").value("2026-10-12T09:00:00+07:00"))
        .andExpect(jsonPath("$.data.items[0].trang_thai_don_hang").value("HOAN_THANH"))
        .andExpect(jsonPath("$.data.items[0].trang_thai_ap_dung").value("DA_SU_DUNG"))
        .andExpect(jsonPath("$.data.items[0].ma_chuong_trinh").value("SALECPU10"))
        .andExpect(jsonPath("$.data.items[0].ten_chuong_trinh").value("Giảm 10% CPU"))
        .andExpect(jsonPath("$.data.items[0].phien_ban_cau_hinh").value(1))
        .andExpect(jsonPath("$.data.items[0].so_tien_giam").value(200000))
        .andExpect(jsonPath("$.data.items[0].qua_tang").isEmpty())
        .andExpect(jsonPath("$.data.items[0].ngay_chot_uu_dai").value("2026-10-12T09:00:00+07:00"))
        .andExpect(
            jsonPath("$.data.items[0].ngay_cap_nhat_luot").value("2026-10-12T12:00:00+07:00"))
        .andExpect(jsonPath("$.data.items[0].canh_bao_du_lieu").doesNotExist())
        .andExpect(jsonPath("$.data.pagination.page").value(0))
        .andExpect(jsonPath("$.data.pagination.limit").value(20))
        .andExpect(jsonPath("$.data.pagination.total_elements").value(1))
        .andExpect(jsonPath("$.data.pagination.total_pages").value(1));
    // The program is checked for existence only; today's name/rules/version are not loaded.
    verify(programs).existsById(10L);
    verifyNoMoreInteractions(programs);
  }

  @Test
  void f02HeldApplicationDoesNotIncrementUsageOrRequireAnAccount() throws Exception {
    application.setTrangThaiApDung(TrangThaiApDungKhuyenMai.GIU_CHO);
    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);
    order.setKhachHang(null);
    mvc.perform(get(URL, 10).param("trang_thai_ap_dung", "GIU_CHO"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].khach_hang_id").value((Object) null))
        .andExpect(jsonPath("$.data.items[0].trang_thai_ap_dung").value("GIU_CHO"))
        .andExpect(jsonPath("$.data.items[0].trang_thai_don_hang").value("CHO_DONG_GOI"));
    verify(applications, never()).save(any());
    verify(programs, never()).save(any());
  }

  @Test
  void f03ReleasedApplicationStillReturnsItsOriginalBenefit() throws Exception {
    application.setTrangThaiApDung(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG);
    order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
    mvc.perform(get(URL, 10).param("trang_thai_ap_dung", "DA_GIAI_PHONG"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].trang_thai_ap_dung").value("DA_GIAI_PHONG"))
        .andExpect(jsonPath("$.data.items[0].trang_thai_don_hang").value("HUY_HANG"))
        .andExpect(jsonPath("$.data.items[0].so_tien_giam").value(200000));
  }

  @Test
  void f04CompleteGiftSetWithZeroPaidAmountsDoesNotMultiplyOrderOrPagination() throws Exception {
    application.setSoTienGiam(BigDecimal.ZERO);
    when(applications.findGiftRows(List.of(1001L)))
        .thenReturn(
            List.of(
                new StoredGift(1001L, 4003L, 301L, 1, BigDecimal.ZERO, BigDecimal.ZERO),
                new StoredGift(1001L, 4004L, 302L, 2, BigDecimal.ZERO, BigDecimal.ZERO)));
    order.setDanhSachPhieuTraHang(
        List.of(PhieuTraHang.builder().id(41L).build(), PhieuTraHang.builder().id(42L).build()));
    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.pagination.total_elements").value(1))
        .andExpect(jsonPath("$.data.items[0].so_tien_giam").value(0))
        .andExpect(jsonPath("$.data.items[0].qua_tang.length()").value(2))
        .andExpect(jsonPath("$.data.items[0].qua_tang[0].chi_tiet_don_hang_id").value(4003))
        .andExpect(jsonPath("$.data.items[0].qua_tang[0].phien_ban_id").value(301))
        .andExpect(jsonPath("$.data.items[0].qua_tang[0].so_luong").value(1))
        .andExpect(jsonPath("$.data.items[0].qua_tang[0].don_gia").value(0))
        .andExpect(jsonPath("$.data.items[0].qua_tang[0].thanh_toan_dong").value(0))
        .andExpect(jsonPath("$.data.items[0].qua_tang[1].chi_tiet_don_hang_id").value(4004))
        .andExpect(jsonPath("$.data.items[0].qua_tang[1].phien_ban_id").value(302))
        .andExpect(jsonPath("$.data.items[0].qua_tang[1].so_luong").value(2));
  }

  @ParameterizedTest
  @EnumSource(TrangThaiApDungKhuyenMai.class)
  void f05AndF06NoMatchingLinksReturnAnEmptyPageWithoutInferringLegacyDiscounts(
      TrangThaiApDungKhuyenMai state) throws Exception {
    when(applications.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(call -> new PageImpl<>(List.of(), call.getArgument(1), 0));
    mvc.perform(get(URL, 10).param("trang_thai_ap_dung", state.name()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.khuyen_mai_id").value(10))
        .andExpect(jsonPath("$.data.items").isEmpty())
        .andExpect(jsonPath("$.data.pagination.total_elements").value(0))
        .andExpect(jsonPath("$.data.pagination.total_pages").value(0));
    verify(applications, never()).findGiftRows(any());
  }

  @Test
  void pageHasStableOrderingAndFetchesGiftsOnlyForItsOwnOrderIds() throws Exception {
    when(applications.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(call -> new PageImpl<>(List.of(application), call.getArgument(1), 3));
    mvc.perform(get(URL, 10).param("page", "1").param("limit", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.pagination.page").value(1))
        .andExpect(jsonPath("$.data.pagination.limit").value(1))
        .andExpect(jsonPath("$.data.pagination.total_elements").value(3))
        .andExpect(jsonPath("$.data.pagination.total_pages").value(3));
    var pageable = ArgumentCaptor.forClass(Pageable.class);
    verify(applications).findAll(any(Specification.class), pageable.capture());
    assertEquals(
        Sort.Direction.DESC,
        pageable.getValue().getSort().getOrderFor("donHang.ngayTao").getDirection());
    assertEquals(
        Sort.Direction.DESC, pageable.getValue().getSort().getOrderFor("id").getDirection());
    verify(applications).findGiftRows(List.of(1001L));
  }

  @Test
  void f06UnlinkedGiftPromotionReturnsEmptyItemsAndItsOwnId() throws Exception {
    when(programs.existsById(14L)).thenReturn(true);
    when(applications.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(call -> new PageImpl<>(List.of(), call.getArgument(1), 0));
    mvc.perform(get(URL, 14).param("trang_thai_ap_dung", "DA_SU_DUNG"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.khuyen_mai_id").value(14))
        .andExpect(jsonPath("$.data.items").isEmpty())
        .andExpect(jsonPath("$.data.pagination.total_elements").value(0))
        .andExpect(jsonPath("$.data.pagination.total_pages").value(0));
    verify(applications, never()).findGiftRows(any());
  }

  @Test
  void forwardsTrimmedKeywordAndInclusiveDatesAsHalfOpenOrderCreationRange() throws Exception {
    try (var specifications =
        org.mockito.Mockito.mockStatic(
            com.example.dantruventu.Specification.KhuyenMaiDonHangSpecification.class,
            org.mockito.Mockito.CALLS_REAL_METHODS)) {
      mvc.perform(
              get(URL, 10)
                  .param("keyword", "  ORD_%  ")
                  .param("trang_thai_ap_dung", "DA_SU_DUNG")
                  .param("tu_ngay", "2026-10-01")
                  .param("den_ngay", "2026-10-31"))
          .andExpect(status().isOk());
      specifications.verify(
          () ->
              com.example.dantruventu.Specification.KhuyenMaiDonHangSpecification.build(
                  10L,
                  "ORD_%",
                  TrangThaiApDungKhuyenMai.DA_SU_DUNG,
                  LocalDateTime.of(2026, 10, 1, 0, 0),
                  LocalDateTime.of(2026, 11, 1, 0, 0)));
    }
  }

  @Test
  void blankKeywordDoesNotBecomeAnActiveSearchFilter() throws Exception {
    try (var specifications =
        org.mockito.Mockito.mockStatic(
            com.example.dantruventu.Specification.KhuyenMaiDonHangSpecification.class,
            org.mockito.Mockito.CALLS_REAL_METHODS)) {
      mvc.perform(get(URL, 10).param("keyword", "   ")).andExpect(status().isOk());
      specifications.verify(
          () ->
              com.example.dantruventu.Specification.KhuyenMaiDonHangSpecification.build(
                  10L, null, null, null, null));
    }
  }

  @Test
  void giftsStayWithTheirOwnOrdersAndAreFetchedInOneBatch() throws Exception {
    var otherOrder =
        DonHang.builder()
            .id(1002L)
            .maDonHang("ORD-002")
            .loaiDonHang(LoaiDonHang.TAI_QUAY)
            .trangThaiDonHang(TrangThaiDonHang.HOAN_THANH)
            .build();
    var other =
        KhuyenMaiDonHang.builder()
            .id(802L)
            .donHang(otherOrder)
            .duLieuApDung("{\"phien_ban_cau_hinh\":2}")
            .build();
    when(applications.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(call -> new PageImpl<>(List.of(application, other), call.getArgument(1), 2));
    when(applications.findGiftRows(List.of(1001L, 1002L)))
        .thenReturn(
            List.of(new StoredGift(1002L, 4004L, 302L, 2, BigDecimal.ZERO, BigDecimal.ZERO)));
    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].qua_tang").isEmpty())
        .andExpect(jsonPath("$.data.items[1].qua_tang[0].chi_tiet_don_hang_id").value(4004));
    verify(applications).findGiftRows(List.of(1001L, 1002L));
  }

  @Test
  void returnRecordsDoNotChangeTheApplicationStatusOrReleaseItsSlot() throws Exception {
    order.setDanhSachPhieuTraHang(List.of(PhieuTraHang.builder().id(41L).build()));
    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].trang_thai_ap_dung").value("DA_SU_DUNG"));
    assertEquals(TrangThaiApDungKhuyenMai.DA_SU_DUNG, application.getTrangThaiApDung());
    verify(applications, never()).save(any());
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(
      strings = {
        "broken-json",
        "null",
        "[]",
        "{}",
        "{\"phien_ban_cau_hinh\":0}",
        "{\"phien_ban_cau_hinh\":\"1\"}",
        "{\"phien_ban_cau_hinh\":1.5}"
      })
  void damagedSnapshotIsFlaggedWithoutUsingTodaysVersion(String snapshot) throws Exception {
    application.setDuLieuApDung(snapshot);
    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].phien_ban_cau_hinh").value((Object) null))
        .andExpect(jsonPath("$.data.items[0].canh_bao_du_lieu").isNotEmpty())
        .andExpect(jsonPath("$.data.items[0].ten_chuong_trinh").value("Giảm 10% CPU"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"USER", "QUAN_LY", "NHAN_VIEN_BAN_HANG"})
  void nonAdminCannotReadRecipientsOrProbePromotionExistence(String role) throws Exception {
    org.mockito.Mockito.when(context.actor())
        .thenReturn(
            NguoiDung.builder()
                .id(1L)
                .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
                .vaiTro(VaiTro.builder().maVaiTro(role).tenVaiTro("ADMIN").build())
                .build());
    mvc.perform(get(URL, 10)).andExpect(status().isForbidden());
    verifyNoInteractions(programs, applications);
  }

  @Test
  void inactiveAdminCannotReadOrderData() throws Exception {
    actor.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    mvc.perform(get(URL, 10)).andExpect(status().isForbidden());
    verifyNoInteractions(programs, applications);
  }

  @Test
  void unauthenticatedActorCannotReadOrderData() throws Exception {
    when(context.actor()).thenThrow(new AppException(ErrorCode.UNAUTHORIZED));
    mvc.perform(get(URL, 10)).andExpect(status().isUnauthorized());
    verifyNoInteractions(programs, applications);
  }

  @ParameterizedTest
  @CsvSource({
    "page,-1",
    "page,abc",
    "limit,0",
    "limit,101",
    "page,2147483647",
    "trang_thai_ap_dung,UNKNOWN",
    "tu_ngay,2026-02-30",
    "den_ngay,not-a-date"
  })
  void invalidFiltersAre400BeforeFetchingData(String parameter, String value) throws Exception {
    mvc.perform(get(URL, 10).param(parameter, value)).andExpect(status().isBadRequest());
    verifyNoInteractions(programs, applications);
  }

  @Test
  void reversedDatesAndOverlongKeywordAreRejected() throws Exception {
    mvc.perform(get(URL, 10).param("tu_ngay", "2026-11-30").param("den_ngay", "2026-11-01"))
        .andExpect(status().isBadRequest());
    mvc.perform(get(URL, 10).param("keyword", "x".repeat(201))).andExpect(status().isBadRequest());
    verifyNoInteractions(programs, applications);
  }

  @ParameterizedTest
  @ValueSource(strings = {"0", "-1", "abc"})
  void invalidIdIs400(String id) throws Exception {
    mvc.perform(get(URL, id)).andExpect(status().isBadRequest());
    verifyNoInteractions(programs, applications);
  }

  @Test
  void missingProgramIs404AndDoesNotReadAnyOrders() throws Exception {
    mvc.perform(get(URL, 404)).andExpect(status().isNotFound());
    verifyNoInteractions(applications);
  }

  private record StoredGift(
      Long orderId,
      Long lineId,
      Long variantId,
      Integer quantity,
      BigDecimal unitPrice,
      BigDecimal linePayment)
      implements GiftRow {
    public Long getOrderId() {
      return orderId;
    }

    public Long getLineId() {
      return lineId;
    }

    public Long getVariantId() {
      return variantId;
    }

    public Integer getQuantity() {
      return quantity;
    }

    public BigDecimal getUnitPrice() {
      return unitPrice;
    }

    public BigDecimal getLinePayment() {
      return linePayment;
    }
  }
}
