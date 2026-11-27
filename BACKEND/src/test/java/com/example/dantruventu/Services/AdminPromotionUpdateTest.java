package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.promotion.AdminPromotionController;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionUpdateRequest;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository.Entry;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionDetailRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository.PromotionUsageStatusCount;
import com.example.dantruventu.Services.order.sales.SalesContext;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;

class AdminPromotionUpdateTest {
  private static final String URL = "/api/v1/admin/promotions/{id}";
  private static final String KEY = "31f72f4f-90be-4b70-9df9-603bc66f282d";
  private static final String KEY2 = "31f72f4f-90be-4b70-9df9-603bc66f282e";
  private static final ValidatorFactory VALIDATORS = Validation.buildDefaultValidatorFactory();

  private final AdminPromotionRepository programs = mock(AdminPromotionRepository.class);
  private final AdminPromotionDetailRepository details = mock(AdminPromotionDetailRepository.class);
  private final PhienBanSanPhamRepository variants = mock(PhienBanSanPhamRepository.class);
  private final DanhMucRepository categories = mock(DanhMucRepository.class);
  private final ThuongHieuRepository brands = mock(ThuongHieuRepository.class);
  private final SalesContext context = mock(SalesContext.class);
  private final SalesIdempotencyRepository idempotency = mock(SalesIdempotencyRepository.class);
  private final JsonMapper mapper = JsonMapper.builder().build();
  private final SalesProperties sales = new SalesProperties();
  private final Map<String, Entry> entries = new HashMap<>();

  private final AdminPromotionService service =
      new AdminPromotionService(
          programs,
          details,
          variants,
          sales,
          categories,
          brands,
          null,
          context,
          idempotency,
          mapper,
          VALIDATORS.getValidator());
  private final MockMvc mvc =
      MockMvcBuilders.standaloneSetup(new AdminPromotionController(service))
          .setControllerAdvice(new GlobalExceptionHandler())
          .setMessageConverters(new JacksonJsonHttpMessageConverter(mapper))
          .build();

  private final LocalDateTime now = LocalDateTime.now(sales.zone()).withNano(0);
  private final DanhMuc category =
      DanhMuc.builder().id(1L).trangThai(TrangThaiCoBanEnum.HOAT_DONG).build();
  private final KhuyenMai program =
      KhuyenMai.builder()
          .id(10L)
          .maChuongTrinh("SALECPU10")
          .tenChuongTrinh("Giảm 10% CPU")
          .moTa("Mô tả cũ")
          .phuongThucKhuyenMai(PhuongThucKhuyenMai.CHIET_KHAU)
          .doiTuongKhuyenMai(DoiTuongKhuyenMai.DANH_MUC)
          .loaiChietKhau(LoaiChietKhau.PHAN_TRAM)
          .giaTriKhuyenMai(BigDecimal.TEN)
          .giaTriHangToiThieu(BigDecimal.valueOf(2_000_000))
          .soLuongMuaToiThieu(1)
          .mucGiamToiDa(BigDecimal.valueOf(300_000))
          .danhMuc(category)
          .soLuongApDung(100)
          .ngayBatDau(now.minusDays(2))
          .ngayKetThuc(now.plusDays(5))
          .build();

  @BeforeEach
  void setup() {
    when(context.actor()).thenReturn(NguoiDung.builder().id(1L).build());
    when(programs.findByIdForUpdate(10L)).thenReturn(Optional.of(program));
    when(programs.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(details.findByKhuyenMai_IdOrderByIdAsc(10L)).thenReturn(List.of());
    when(categories.findById(1L)).thenReturn(Optional.of(category));
    when(idempotency.acquire(startsWith("PROMO:PATCH:"), eq(1L), anyString()))
        .thenAnswer(
            invocation ->
                entries.computeIfAbsent(
                    invocation.getArgument(0),
                    key -> new Entry(1L, invocation.getArgument(2), null)));
    doAnswer(
            invocation -> {
              String key = invocation.getArgument(0);
              Entry old = entries.get(key);
              entries.put(
                  key, new Entry(old.actorId(), old.requestHash(), invocation.getArgument(1)));
              return null;
            })
        .when(idempotency)
        .complete(anyString(), anyString());
  }

  @AfterAll
  static void closeValidatorFactory() {
    VALIDATORS.close();
  }

  @Test
  void f01ExtendsLinkedProgramAndPreservesRulesAndCounts() throws Exception {
    linkedUsage();
    String body =
        patchBody(
            ",\"ten_chuong_trinh\":\"Gia hạn\",\"so_luong_ap_dung\":120,"
                + "\"ngay_ket_thuc\":\""
                + now.plusDays(10).atZone(sales.zone()).toOffsetDateTime()
                + "\"");
    perform(body)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2))
        .andExpect(jsonPath("$.data.gia_tri_khuyen_mai").value(10))
        .andExpect(jsonPath("$.data.so_luong_con_lai").value(94))
        .andExpect(jsonPath("$.data.so_luong_da_giai_phong").value(2))
        .andExpect(jsonPath("$.data.co_the_xoa").value(false));
    assertEquals(120, program.getSoLuongApDung());
    verifyNoInteractions(variants, categories, brands);
    verify(details, never()).deleteAll(any());
  }

  @Test
  void f02ChangesUnlinkedRulesAndReturnsCompleteConfiguration() throws Exception {
    perform(patchBody(",\"gia_tri_khuyen_mai\":15,\"muc_giam_toi_da\":400000"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.gia_tri_khuyen_mai").value(15))
        .andExpect(jsonPath("$.data.muc_giam_toi_da").value(400000))
        .andExpect(jsonPath("$.data.danh_muc_id").value(1))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2))
        .andExpect(jsonPath("$.data.co_the_sua_cau_hinh").value(true));
    verify(details, never()).deleteAll(any());
  }

  @Test
  void f03EditingOnlyInformationKeepsPausedStateAndVersion() throws Exception {
    linkedUsage();
    program.setPhienBanCauHinh(2);
    program.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    perform("{\"phien_ban_cau_hinh_xac_nhan\":2,\"ten_chuong_trinh\":\"Tên mới\",\"mo_ta\":null}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.ten_chuong_trinh").value("Tên mới"))
        .andExpect(jsonPath("$.data.mo_ta").value((Object) null))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2))
        .andExpect(jsonPath("$.data.trang_thai").value(0))
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("TAM_DUNG"));
    assertEquals(BigDecimal.TEN, program.getGiaTriKhuyenMai());
  }

  @ParameterizedTest
  @EnumSource(TrangThaiApDungKhuyenMai.class)
  void f04AnyLinkIncludingReleasedLocksRules(TrangThaiApDungKhuyenMai state) throws Exception {
    when(programs.countUsageByStatus(10L)).thenReturn(List.of(new Count(state, 1)));
    perform(patchBody(",\"gia_tri_khuyen_mai\":15"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].field").value("gia_tri_khuyen_mai"))
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_RULE_LOCKED"));
    verify(programs, never()).saveAndFlush(any());
    verify(idempotency, never()).complete(anyString(), anyString());
    assertEquals(BigDecimal.TEN, program.getGiaTriKhuyenMai());
  }

  @Test
  void f05RejectsQuotaBelowUsedPlusHeldBeforeChangingData() throws Exception {
    linkedUsage();
    perform(patchBody(",\"so_luong_ap_dung\":25,\"ten_chuong_trinh\":\"Không được lưu\""))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_QUOTA_TOO_LOW"));
    assertEquals("Giảm 10% CPU", program.getTenChuongTrinh());
    assertEquals(100, program.getSoLuongApDung());
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void quotaMayEqualOccupiedSlotsAndReleasedSlotsDoNotConsumeQuota() throws Exception {
    linkedUsage();
    perform(patchBody(",\"so_luong_ap_dung\":26"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.so_luong_con_lai").value(0))
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("HET_LUOT"));
  }

  @Test
  void explicitNullQuotaRemovesLimitWhileOmittedQuotaIsPreserved() throws Exception {
    perform(patchBody(",\"so_luong_ap_dung\":null"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.so_luong_ap_dung").value((Object) null))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2));
    assertNull(program.getSoLuongApDung());
    var request =
        mapper.readValue(
            "{\"phien_ban_cau_hinh_xac_nhan\":2,\"ten_chuong_trinh\":\"Tên mới\"}",
            AdminPromotionUpdateRequest.class);
    assertNull(service.updatePromotion(10L, KEY2, request).getSoLuongApDung());
  }

  @Test
  void f06RejectsStaleVersion() throws Exception {
    program.setPhienBanCauHinh(2);
    perform(patchBody(",\"ten_chuong_trinh\":\"Không được lưu\""))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_VERSION_CHANGED"));
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void replayReturnsStoredResultWithoutBumpingVersionOrReadingProgramAgain() throws Exception {
    String body = patchBody(",\"gia_tri_khuyen_mai\":15");
    String first =
        perform(body).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    String replay =
        perform(body).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    assertEquals(first, replay);
    assertEquals(2, program.getPhienBanCauHinh());
    verify(programs, times(1)).findByIdForUpdate(10L);
    verify(programs, times(1)).saveAndFlush(any());
  }

  @Test
  void sameKeyWithDifferentBodyOrTargetConflicts() throws Exception {
    perform(patchBody(",\"ten_chuong_trinh\":\"Tên mới\"")).andExpect(status().isOk());
    perform(patchBody(",\"ten_chuong_trinh\":\"Tên khác\"")).andExpect(status().isConflict());
    mvc.perform(
            patch(URL, 11L)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchBody(",\"ten_chuong_trinh\":\"Tên mới\"")))
        .andExpect(status().isConflict());
  }

  @Test
  void anotherActorCannotReplayStoredResponse() throws Exception {
    entries.put("PROMO:PATCH:" + KEY, new Entry(99L, "hash", "{}"));
    perform(patchBody(",\"ten_chuong_trinh\":\"Tên mới\"")).andExpect(status().isConflict());
    verify(programs, never()).findByIdForUpdate(anyLong());
  }

  @Test
  void linkedProgramCannotShortenEndDate() throws Exception {
    linkedUsage();
    perform(
            patchBody(
                ",\"ngay_ket_thuc\":\""
                    + now.plusDays(1).atZone(sales.zone()).toOffsetDateTime()
                    + "\""))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].field").value("ngay_ket_thuc"));
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void reorderingLinesAndEquivalentMoneyDoNotChangeRulesOrLineIds() throws Exception {
    program.setDoiTuongKhuyenMai(DoiTuongKhuyenMai.TUNG_SAN_PHAM);
    program.setDanhMuc(null);
    when(details.findByKhuyenMai_IdOrderByIdAsc(10L))
        .thenReturn(
            List.of(
                line(7L, 101L, LoaiApDungKhuyenMai.SAN_PHAM_MUA, 2),
                line(8L, 102L, LoaiApDungKhuyenMai.SAN_PHAM_MUA, 1)));
    linkedUsage();
    perform(
            patchBody(
                ",\"gia_tri_khuyen_mai\":10.00,\"chi_tiet_khuyen_mai\":["
                    + "{\"phien_ban_id\":102,\"loai_ap_dung\":\"SAN_PHAM_MUA\",\"so_luong\":1},"
                    + "{\"phien_ban_id\":101,\"loai_ap_dung\":\"SAN_PHAM_MUA\",\"so_luong\":2}]"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(1))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[0].id").value(7));
    verify(details, never()).deleteAll(any());
  }

  @Test
  void transitionsToGiftConfigurationAndAllowsSameVariantInBothRoles() throws Exception {
    var variant =
        PhienBanSanPham.builder()
            .id(101L)
            .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
            .sanPham(SanPham.builder().trangThai(TrangThaiCoBanEnum.HOAT_DONG).build())
            .build();
    when(variants.findAllById(any())).thenReturn(List.of(variant));
    when(details.saveAllAndFlush(any()))
        .thenAnswer(
            invocation -> {
              List<ChiTietKhuyenMai> rows = invocation.getArgument(0);
              long id = 20;
              for (var row : rows) row.setId(id++);
              return rows;
            });
    perform(
            patchBody(
                ",\"phuong_thuc_khuyen_mai\":\"TANG_SAN_PHAM\","
                    + "\"doi_tuong_khuyen_mai\":\"TUNG_SAN_PHAM\",\"danh_muc_id\":null,"
                    + "\"loai_chiet_khau\":null,\"gia_tri_khuyen_mai\":null,\"muc_giam_toi_da\":null,"
                    + "\"chi_tiet_khuyen_mai\":["
                    + "{\"phien_ban_id\":101,\"loai_ap_dung\":\"SAN_PHAM_MUA\",\"so_luong\":1},"
                    + "{\"phien_ban_id\":101,\"loai_ap_dung\":\"SAN_PHAM_TANG\",\"so_luong\":1}]"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.phuong_thuc_khuyen_mai").value("TANG_SAN_PHAM"))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai.length()").value(2))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1}",
        "{\"ten_chuong_trinh\":\"Tên mới\"}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1.5,\"ten_chuong_trinh\":\"Tên mới\"}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"trang_thai\":0}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"phien_ban_cau_hinh\":2}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"so_luong_da_dung\":5}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"ngay_ket_thuc\":null}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"gia_tri_khuyen_mai\":101}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"so_luong_ap_dung\":1.5}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"so_luong_ap_dung\":-1}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"ten_chuong_trinh\":null}",
        "{\"phien_ban_cau_hinh_xac_nhan\":1,\"phuong_thuc_khuyen_mai\":\"TANG_SAN_PHAM\"}"
      })
  void rejectsInvalidOrIncompleteMergedConfiguration(String body) throws Exception {
    perform(body).andExpect(status().isBadRequest());
    verify(programs, never()).saveAndFlush(any());
    verify(idempotency, never()).complete(anyString(), anyString());
  }

  @Test
  void invalidMergedDateRangeConflicts() throws Exception {
    perform(patchBody(",\"ngay_ket_thuc\":\"2020-01-01T00:00:00+07:00\""))
        .andExpect(status().isConflict());
  }

  @Test
  void rejectsDuplicateCodeAndMissingOrInactiveReferences() throws Exception {
    when(programs.existsByMaChuongTrinhIgnoreCaseAndIdNot("DUPLICATE", 10L)).thenReturn(true);
    perform(patchBody(",\"ma_chuong_trinh\":\"DUPLICATE\""))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_CODE_EXISTS"));
    mvc.perform(
            patch(URL, 10)
                .header("Idempotency-Key", KEY2)
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchBody(",\"danh_muc_id\":404")))
        .andExpect(status().isNotFound());
    category.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    entries.clear();
    perform(patchBody(",\"gia_tri_khuyen_mai\":15")).andExpect(status().isConflict());
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void missingProgramReturns404AndOldPutRouteReturns405() throws Exception {
    when(programs.findByIdForUpdate(10L)).thenReturn(Optional.empty());
    perform(patchBody(",\"ten_chuong_trinh\":\"Tên mới\"")).andExpect(status().isNotFound());
    mvc.perform(put(URL, 10).contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isMethodNotAllowed());
  }

  @Test
  void storageFailureDoesNotCompleteIdempotencyAndTransactionCoversMutation() throws Exception {
    when(programs.saveAndFlush(any()))
        .thenThrow(new DataIntegrityViolationException("write failed"));
    perform(patchBody(",\"ten_chuong_trinh\":\"Tên mới\"")).andExpect(status().isConflict());
    verify(idempotency, never()).complete(anyString(), anyString());
    var transaction =
        AdminPromotionService.class
            .getMethod(
                "updatePromotion", Long.class, String.class, AdminPromotionUpdateRequest.class)
            .getAnnotation(org.springframework.transaction.annotation.Transactional.class);
    assertEquals(
        org.springframework.transaction.annotation.Isolation.READ_COMMITTED,
        transaction.isolation());
    assertFalse(transaction.readOnly());
  }

  private org.springframework.test.web.servlet.ResultActions perform(String body) throws Exception {
    return mvc.perform(
        patch(URL, 10L)
            .header("Idempotency-Key", KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body));
  }

  private String patchBody(String fields) {
    return "{\"phien_ban_cau_hinh_xac_nhan\":1" + fields + "}";
  }

  private void linkedUsage() {
    program.setSoLuongDaDung(23);
    when(programs.countUsageByStatus(10L))
        .thenReturn(
            List.of(
                new Count(TrangThaiApDungKhuyenMai.DA_SU_DUNG, 23),
                new Count(TrangThaiApDungKhuyenMai.GIU_CHO, 3),
                new Count(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG, 2)));
  }

  private ChiTietKhuyenMai line(long id, long variantId, LoaiApDungKhuyenMai role, int quantity) {
    return ChiTietKhuyenMai.builder()
        .id(id)
        .khuyenMai(program)
        .phienBan(
            PhienBanSanPham.builder().id(variantId).sanPham(SanPham.builder().build()).build())
        .loaiApDung(role)
        .soLuong(quantity)
        .build();
  }

  private record Count(TrangThaiApDungKhuyenMai status, long quantity)
      implements PromotionUsageStatusCount {
    public TrangThaiApDungKhuyenMai getStatus() {
      return status;
    }

    public long getUsageCount() {
      return quantity;
    }
  }
}
