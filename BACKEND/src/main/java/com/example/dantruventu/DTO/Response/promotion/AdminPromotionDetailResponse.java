package com.example.dantruventu.DTO.Response.promotion;

import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPromotionDetailResponse {

  private Long id;

  @JsonProperty("ma_chuong_trinh")
  private String maChuongTrinh;

  @JsonProperty("ten_chuong_trinh")
  private String tenChuongTrinh;

  @JsonProperty("phuong_thuc_khuyen_mai")
  private PhuongThucKhuyenMai phuongThucKhuyenMai;

  @JsonProperty("doi_tuong_khuyen_mai")
  private DoiTuongKhuyenMai doiTuongKhuyenMai;

  @JsonProperty("so_luong_ap_dung")
  private Integer soLuongApDung;

  @JsonProperty("so_luong_da_dung")
  private Integer soLuongDaDung;

  @JsonProperty("so_luong_con_lai")
  private Integer soLuongConLai;

  @JsonProperty("gia_tri_khuyen_mai")
  private BigDecimal giaTriKhuyenMai;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("ngay_bat_dau")
  private OffsetDateTime ngayBatDau;

  @JsonProperty("ngay_ket_thuc")
  private OffsetDateTime ngayKetThuc;

  @JsonProperty("thoi_gian_con_lai_giay")
  private long thoiGianConLaiGiay;

  @JsonProperty("trang_thai")
  private short trangThai;

  @JsonProperty("trang_thai_hien_thi")
  private String trangThaiHienThi;

  @JsonProperty("chi_tiet_khuyen_mai")
  private List<AdminPromotionDetailLineResponse> chiTietKhuyenMai;
}
