package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.promotion.AdminPromotionController;
import com.example.dantruventu.Entity.ChiTietKhuyenMai;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.LoaiApDungKhuyenMai;
import com.example.dantruventu.Enum.LoaiChietKhau;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.promotion.AdminPromotionDetailRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository.PromotionUsageStatusCount;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AdminPromotionStatusTest {
  private static final String URL = "/api/v1/admin/promotions/{id}/status";
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
  private final LocalDateTime now = LocalDateTime.now(sales.zone()).withNano(0);
  private final KhuyenMai program =
      KhuyenMai.builder()
          .id(10L)
          .maChuongTrinh("SALECPU10")
          .tenChuongTrinh("Giảm 10% CPU")
          .phuongThucKhuyenMai(PhuongThucKhuyenMai.CHIET_KHAU)
          .doiTuongKhuyenMai(DoiTuongKhuyenMai.DANH_MUC)
          .loaiChietKhau(LoaiChietKhau.PHAN_TRAM)
          .giaTriKhuyenMai(BigDecimal.TEN)
          .giaTriHangToiThieu(BigDecimal.valueOf(2_000_000))
          .soLuongMuaToiThieu(1)
          .mucGiamToiDa(BigDecimal.valueOf(300_000))
          .danhMuc(DanhMuc.builder().id(5L).build())
          .moTa("Thông tin mới, giữ nguyên mọi quy tắc")
          .phienBanCauHinh(2)
          .soLuongApDung(120)
          .soLuongDaDung(23)
          .ngayBatDau(now.minusDays(2))
          .ngayKetThuc(now.plusDays(5))
          .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
          .build();

  @BeforeEach
  void setup() {
    when(programs.findByIdForUpdate(10L)).thenReturn(Optional.of(program));
    when(programs.saveAndFlush(program)).thenReturn(program);
    when(programs.countUsageByStatus(10L))
        .thenReturn(
            List.of(
                new UsageCount(TrangThaiApDungKhuyenMai.DA_SU_DUNG, 23),
                new UsageCount(TrangThaiApDungKhuyenMai.GIU_CHO, 3),
                new UsageCount(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG, 2)));
    when(details.findByKhuyenMai_IdOrderByIdAsc(10L)).thenReturn(List.of());
  }

  @Test
  void f01PauseReturnsFullConfigurationWithoutChangingUsageOrVersion() throws Exception {
    send(0)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Tạm dừng khuyến mại thành công"))
        .andExpect(jsonPath("$.data.trang_thai").value(0))
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("TAM_DUNG"))
        .andExpect(jsonPath("$.data.ma_chuong_trinh").value("SALECPU10"))
        .andExpect(jsonPath("$.data.ten_chuong_trinh").value("Giảm 10% CPU"))
        .andExpect(jsonPath("$.data.phuong_thuc_khuyen_mai").value("CHIET_KHAU"))
        .andExpect(jsonPath("$.data.doi_tuong_khuyen_mai").value("DANH_MUC"))
        .andExpect(jsonPath("$.data.loai_chiet_khau").value("PHAN_TRAM"))
        .andExpect(jsonPath("$.data.gia_tri_khuyen_mai").value(10))
        .andExpect(jsonPath("$.data.gia_tri_hang_toi_thieu").value(2_000_000))
        .andExpect(jsonPath("$.data.so_luong_mua_toi_thieu").value(1))
        .andExpect(jsonPath("$.data.muc_giam_toi_da").value(300_000))
        .andExpect(jsonPath("$.data.danh_muc_id").value(5))
        .andExpect(jsonPath("$.data.thuong_hieu_id").value((Object) null))
        .andExpect(jsonPath("$.data.so_luong_ap_dung").value(120))
        .andExpect(jsonPath("$.data.so_luong_da_dung").value(23))
        .andExpect(jsonPath("$.data.so_luong_dang_giu").value(3))
        .andExpect(jsonPath("$.data.so_luong_da_giai_phong").value(2))
        .andExpect(jsonPath("$.data.so_luong_con_lai").value(94))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2))
        .andExpect(jsonPath("$.data.mo_ta").value(program.getMoTa()))
        .andExpect(jsonPath("$.data.ngay_bat_dau").exists())
        .andExpect(jsonPath("$.data.ngay_ket_thuc").exists())
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai").isEmpty())
        .andExpect(jsonPath("$.data.co_the_sua_cau_hinh").value(false))
        .andExpect(jsonPath("$.data.co_the_xoa").value(false));
    var order = inOrder(programs, details);
    order.verify(programs).findByIdForUpdate(10L);
    order.verify(programs).countUsageByStatus(10L);
    order.verify(details).findByKhuyenMai_IdOrderByIdAsc(10L);
    order.verify(programs).saveAndFlush(program);
    verifyNoMoreInteractions(programs, details);
    assertEquals(2, program.getPhienBanCauHinh());
    assertEquals(23, program.getSoLuongDaDung());
  }

  @Test
  void f02RestoreDuringPeriodPreservesHeldSlotsAndConfiguration() throws Exception {
    pauseFixture();
    send(1)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Khôi phục khuyến mại thành công"))
        .andExpect(jsonPath("$.data.trang_thai").value(1))
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("DANG_AP_DUNG"))
        .andExpect(jsonPath("$.data.so_luong_con_lai").value(94))
        .andExpect(jsonPath("$.data.so_luong_dang_giu").value(3))
        .andExpect(jsonPath("$.data.so_luong_da_giai_phong").value(2))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2));
  }

  @Test
  void f03RestoreBeforeStartReturnsNotStartedAndUnlinkedPermissions() throws Exception {
    pauseFixture();
    program.setNgayBatDau(now.plusDays(1));
    program.setSoLuongDaDung(0);
    when(programs.countUsageByStatus(10L)).thenReturn(List.of());
    send(1)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.trang_thai").value(1))
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("CHUA_BAT_DAU"))
        .andExpect(jsonPath("$.data.so_luong_con_lai").value(120))
        .andExpect(jsonPath("$.data.co_the_sua_cau_hinh").value(true))
        .andExpect(jsonPath("$.data.co_the_xoa").value(true))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2));
  }

  @Test
  void f04RejectsExpiredRestoreAndKeepsPausedFlag() throws Exception {
    pauseFixture();
    program.setNgayKetThuc(now.minusDays(1));
    assertConflict("PROMOTION_EXPIRED", "Chương trình đã hết hạn, không thể khôi phục áp dụng mới");
  }

  @Test
  void expirationIncludesTheExactEndInstant() throws Exception {
    pauseFixture();
    program.setNgayKetThuc(now);
    try (var clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
      clock.when(() -> LocalDateTime.now(sales.zone())).thenReturn(now);
      assertConflict(
          "PROMOTION_EXPIRED", "Chương trình đã hết hạn, không thể khôi phục áp dụng mới");
    }
  }

  @Test
  void f05RejectsQuotaOccupiedByUsedAndHeldSlots() throws Exception {
    pauseFixture();
    program.setSoLuongApDung(26);
    assertConflict(
        "PROMOTION_QUOTA_EXHAUSTED", "Chương trình không còn lượt khả dụng để khôi phục");
  }

  @Test
  void quotaCanBeExhaustedByHeldSlotsAlone() throws Exception {
    pauseFixture();
    program.setSoLuongDaDung(0);
    program.setSoLuongApDung(3);
    assertConflict(
        "PROMOTION_QUOTA_EXHAUSTED", "Chương trình không còn lượt khả dụng để khôi phục");
  }

  @Test
  void releasedSlotsDoNotOccupyQuota() throws Exception {
    pauseFixture();
    program.setSoLuongApDung(27);
    send(1).andExpect(status().isOk()).andExpect(jsonPath("$.data.so_luong_con_lai").value(1));
  }

  @Test
  void unlimitedQuotaCanBeRestored() throws Exception {
    pauseFixture();
    program.setSoLuongApDung(null);
    send(1)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("DANG_AP_DUNG"))
        .andExpect(jsonPath("$.data.so_luong_con_lai").value((Object) null));
  }

  @Test
  void f06RepeatedPauseReturnsFullCurrentStateWithoutWriting() throws Exception {
    pauseFixture();
    send(0)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Khuyến mại đang tạm dừng"))
        .andExpect(jsonPath("$.data.gia_tri_khuyen_mai").value(10))
        .andExpect(jsonPath("$.data.so_luong_dang_giu").value(3))
        .andExpect(jsonPath("$.data.so_luong_con_lai").value(94))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2));
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void repeatedEnabledFlagIsANoOpEvenWhenNoLongerApplicable() throws Exception {
    program.setNgayKetThuc(now.minusDays(1));
    program.setSoLuongApDung(26);
    send(1)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.trang_thai").value(1))
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("HET_HAN"))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2));
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void canPauseAnExpiredAndExhaustedProgram() throws Exception {
    program.setNgayKetThuc(now.minusDays(1));
    program.setSoLuongApDung(26);
    send(0)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("TAM_DUNG"));
  }

  @Test
  void giftAndPurchaseLinesRemainInFullResponseWithoutBeingWritten() throws Exception {
    program.setPhuongThucKhuyenMai(PhuongThucKhuyenMai.TANG_SAN_PHAM);
    program.setDoiTuongKhuyenMai(DoiTuongKhuyenMai.TUNG_SAN_PHAM);
    program.setLoaiChietKhau(null);
    program.setGiaTriKhuyenMai(null);
    when(details.findByKhuyenMai_IdOrderByIdAsc(10L))
        .thenReturn(
            List.of(
                line(7L, 101L, LoaiApDungKhuyenMai.SAN_PHAM_MUA, 2),
                line(8L, 301L, LoaiApDungKhuyenMai.SAN_PHAM_TANG, 1)));
    send(0)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[0].phien_ban_id").value(101))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[0].loai_ap_dung").value("SAN_PHAM_MUA"))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[0].so_luong").value(2))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[1].phien_ban_id").value(301))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[1].loai_ap_dung").value("SAN_PHAM_TANG"))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[1].so_luong").value(1));
    verify(details).findByKhuyenMai_IdOrderByIdAsc(10L);
    verifyNoMoreInteractions(details);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"trang_thai\":null}",
        "{\"trang_thai\":2}",
        "{\"trang_thai\":-1}",
        "{\"trang_thai\":0.5}",
        "{\"trang_thai\":\"1\"}",
        "{\"trang_thai\":true}",
        "{\"trang_thai\":2147483648}",
        "[0]"
      })
  void invalidStatusBodyIsRejectedBeforeAnyDatabaseRead(String body) throws Exception {
    mvc.perform(patch(URL, 10).contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(programs, details);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "trang_thai_hien_thi",
        "so_luong_da_dung",
        "so_luong_dang_giu",
        "gia_tri_khuyen_mai",
        "phien_ban_cau_hinh_xac_nhan"
      })
  void rejectsFieldsOutsideStatusContract(String field) throws Exception {
    mvc.perform(
            patch(URL, 10)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"trang_thai\":0,\"" + field + "\":1}"))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(programs, details);
  }

  @Test
  void invalidIdIsBadRequestAndMissingProgramIsNotFound() throws Exception {
    mvc.perform(patch(URL, 0).contentType(MediaType.APPLICATION_JSON).content("{\"trang_thai\":0}"))
        .andExpect(status().isBadRequest());
    mvc.perform(
            patch(URL, "abc").contentType(MediaType.APPLICATION_JSON).content("{\"trang_thai\":0}"))
        .andExpect(status().isBadRequest());
    mvc.perform(
            patch(URL, 404).contentType(MediaType.APPLICATION_JSON).content("{\"trang_thai\":0}"))
        .andExpect(status().isNotFound());
    verifyNoInteractions(details);
  }

  private ResultActions send(int flag) throws Exception {
    return mvc.perform(
        patch(URL, 10)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"trang_thai\":" + flag + "}"));
  }

  private void pauseFixture() {
    program.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
  }

  private void assertConflict(String code, String message) throws Exception {
    send(1)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value(message))
        .andExpect(jsonPath("$.errors[0].field").value("trang_thai"))
        .andExpect(jsonPath("$.errors[0].code").value(code));
    assertEquals(TrangThaiCoBanEnum.NGUNG_HOAT_DONG, program.getTrangThai());
    assertEquals(2, program.getPhienBanCauHinh());
    verify(programs, never()).saveAndFlush(any());
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

  private ChiTietKhuyenMai line(long id, long variantId, LoaiApDungKhuyenMai role, int quantity) {
    return ChiTietKhuyenMai.builder()
        .id(id)
        .phienBan(
            PhienBanSanPham.builder()
                .id(variantId)
                .sanPham(SanPham.builder().maSanPham("DEMO").tenSanPham("Demo").build())
                .build())
        .loaiApDung(role)
        .soLuong(quantity)
        .build();
  }
}
