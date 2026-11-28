package com.example.dantruventu.Services;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AdminPromotionDetailTest {
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

  private final LocalDateTime now = LocalDateTime.now(sales.zone());
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
          .danhMuc(DanhMuc.builder().id(5L).trangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG).build())
          .soLuongApDung(100)
          .ngayBatDau(now.minusDays(2))
          .ngayKetThuc(now.plusDays(2))
          .build();

  @BeforeEach
  void setup() {
    when(programs.findById(10L)).thenReturn(Optional.of(program));
    when(details.findByKhuyenMai_IdOrderByIdAsc(10L)).thenReturn(List.of());
  }

  @Test
  void returnsRulesAndCountsForLinkedPromotion() throws Exception {
    program.setSoLuongDaDung(23);
    program.setPhienBanCauHinh(2);
    when(programs.countUsageByStatus(10L))
        .thenReturn(
            List.of(
                count(TrangThaiApDungKhuyenMai.DA_SU_DUNG, 23),
                count(TrangThaiApDungKhuyenMai.GIU_CHO, 3),
                count(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG, 2)));

    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.loai_chiet_khau").value("PHAN_TRAM"))
        .andExpect(jsonPath("$.data.gia_tri_hang_toi_thieu").value(2_000_000))
        .andExpect(jsonPath("$.data.so_luong_mua_toi_thieu").value(1))
        .andExpect(jsonPath("$.data.muc_giam_toi_da").value(300_000))
        .andExpect(jsonPath("$.data.danh_muc_id").value(5))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(2))
        .andExpect(jsonPath("$.data.so_luong_da_dung").value(23))
        .andExpect(jsonPath("$.data.so_luong_dang_giu").value(3))
        .andExpect(jsonPath("$.data.so_luong_da_giai_phong").value(2))
        .andExpect(jsonPath("$.data.so_luong_con_lai").value(74))
        .andExpect(jsonPath("$.data.co_the_sua_cau_hinh").value(false))
        .andExpect(jsonPath("$.data.co_the_xoa").value(false));
  }

  @ParameterizedTest
  @EnumSource(TrangThaiApDungKhuyenMai.class)
  void anyLinkPreventsEditingAndDeleting(TrangThaiApDungKhuyenMai applicationStatus)
      throws Exception {
    when(programs.countUsageByStatus(10L)).thenReturn(List.of(count(applicationStatus, 1)));
    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.co_the_sua_cau_hinh").value(false))
        .andExpect(jsonPath("$.data.co_the_xoa").value(false));
  }

  @Test
  void returnsBothRolesAndPermissionFlagsForUnlinkedPromotion() throws Exception {
    program.setPhuongThucKhuyenMai(PhuongThucKhuyenMai.TANG_SAN_PHAM);
    program.setDoiTuongKhuyenMai(DoiTuongKhuyenMai.TUNG_SAN_PHAM);
    program.setLoaiChietKhau(null);
    program.setSoLuongApDung(null);
    when(details.findByKhuyenMai_IdOrderByIdAsc(10L))
        .thenReturn(
            List.of(
                line(7L, 101L, LoaiApDungKhuyenMai.SAN_PHAM_MUA, 2),
                line(8L, 301L, LoaiApDungKhuyenMai.SAN_PHAM_TANG, 1)));

    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.so_luong_con_lai").value((Object) null))
        .andExpect(jsonPath("$.data.so_luong_dang_giu").value(0))
        .andExpect(jsonPath("$.data.so_luong_da_giai_phong").value(0))
        .andExpect(jsonPath("$.data.co_the_sua_cau_hinh").value(true))
        .andExpect(jsonPath("$.data.co_the_xoa").value(true))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[0].loai_ap_dung").value("SAN_PHAM_MUA"))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[0].so_luong").value(2))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[1].phien_ban_id").value(301))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai[1].loai_ap_dung").value("SAN_PHAM_TANG"));
  }

  @Test
  void countsHeldSlotsForDisplayStatusAndStillShowsExpiredOrPausedConfiguration() throws Exception {
    program.setSoLuongApDung(1);
    when(programs.countUsageByStatus(10L))
        .thenReturn(List.of(count(TrangThaiApDungKhuyenMai.GIU_CHO, 1)));
    mvc.perform(get(URL, 10))
        .andExpect(jsonPath("$.data.so_luong_con_lai").value(0))
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("HET_LUOT"));
    program.setNgayKetThuc(now.minusDays(1));
    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("HET_HAN"))
        .andExpect(jsonPath("$.data.co_the_xoa").value(false));
    program.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    mvc.perform(get(URL, 10))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.trang_thai_hien_thi").value("TAM_DUNG"));
  }

  @Test
  void rejectsInvalidIdAndReturnsNotFoundForMissingPromotion() throws Exception {
    mvc.perform(get(URL, 0)).andExpect(status().isBadRequest());
    mvc.perform(get(URL, "abc")).andExpect(status().isBadRequest());
    mvc.perform(get(URL, 404)).andExpect(status().isNotFound());
  }

  private PromotionUsageStatusCount count(TrangThaiApDungKhuyenMai status, long quantity) {
    return new UsageCount(status, quantity);
  }

  private record UsageCount(TrangThaiApDungKhuyenMai status, long quantity)
      implements PromotionUsageStatusCount {
    @Override
    public TrangThaiApDungKhuyenMai getStatus() {
      return status;
    }

    @Override
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
