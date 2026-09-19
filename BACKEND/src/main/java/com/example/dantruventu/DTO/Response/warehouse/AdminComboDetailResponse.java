package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.DTO.Response.product.AdminProductDetailResponse;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;
import tools.jackson.databind.JsonNode;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComboDetailResponse {

  private Long id;

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("danh_muc_id")
  private Long danhMucId;

  @JsonProperty("thuong_hieu_id")
  private Long thuongHieuId;

  @JsonProperty("loai_san_pham")
  private LoaiSanPham loaiSanPham;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("thong_so_ky_thuat")
  private JsonNode thongSoKyThuat;

  @JsonProperty("thue_vat")
  private BigDecimal thueVat;

  @JsonProperty("khoi_luong")
  private BigDecimal khoiLuong;

  @JsonProperty("gia_ban_le")
  private BigDecimal giaBanLe;

  @JsonProperty("gia_nhap")
  private BigDecimal giaNhap;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("thanh_phan")
  private List<ComboComponentResponse> thanhPhan;

  @JsonProperty("anh_san_pham")
  private List<AdminProductDetailResponse.AnhSanPhamData> anhSanPham;

  @JsonProperty("ton_co_the_ban")
  private Long tonCoTheBan;

  @JsonProperty("ton_thuc_te")
  private Long tonThucTe;

  @JsonProperty("cau_hinh_bi_khoa")
  private Boolean cauHinhBiKhoa;
}
