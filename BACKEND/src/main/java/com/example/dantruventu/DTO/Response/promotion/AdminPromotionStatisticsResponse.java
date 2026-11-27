package com.example.dantruventu.DTO.Response.promotion;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record AdminPromotionStatisticsResponse(
    @JsonProperty("khuyen_mai_id") Long khuyenMaiId,
    @JsonProperty("tu_ngay") LocalDate tuNgay,
    @JsonProperty("den_ngay") LocalDate denNgay,
    @JsonProperty("mui_gio") String muiGio,
    @JsonProperty("moc_thoi_gian_thong_ke") String mocThoiGianThongKe,
    @JsonProperty("trang_thai_duoc_xet") String trangThaiDuocXet,
    @JsonProperty("luot_toan_bo_hien_tai") UsageCounts luotToanBoHienTai,
    @JsonProperty("don_chot_uu_dai_trong_ky") PeriodStatistics donChotUuDaiTrongKy) {

  public record UsageCounts(
      @JsonProperty("GIU_CHO") long giuCho,
      @JsonProperty("DA_SU_DUNG") long daSuDung,
      @JsonProperty("DA_GIAI_PHONG") long daGiaiPhong) {}

  public record PeriodStatistics(
      @JsonProperty("GIU_CHO") long giuCho,
      @JsonProperty("DA_SU_DUNG") long daSuDung,
      @JsonProperty("DA_GIAI_PHONG") long daGiaiPhong,
      @JsonProperty("tien_giam_luc_ban_cua_don_da_su_dung") BigDecimal tienGiam,
      @JsonProperty("so_luong_qua_da_giao_cua_don_da_su_dung") long soLuongQua,
      @JsonProperty("qua_da_giao") List<Gift> quaDaGiao) {}

  public record Gift(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong") long soLuong) {}
}
