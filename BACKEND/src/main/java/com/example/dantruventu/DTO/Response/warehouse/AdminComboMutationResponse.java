package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComboMutationResponse extends CatalogFields.Metadata {

  private Long id;

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("loai_san_pham")
  private LoaiSanPham loaiSanPham;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("thanh_phan")
  private List<ThanhPhanData> thanhPhan;

  @JsonProperty("gia_ban_le")
  private BigDecimal giaBanLe;

  @JsonProperty("gia_nhap")
  private BigDecimal giaNhap;

  @JsonProperty("khoi_luong")
  private BigDecimal khoiLuong;

  @JsonProperty("ton_thuc_te")
  @com.fasterxml.jackson.annotation.JsonInclude(
      com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS)
  private Long tonThucTe;

  @JsonProperty("ton_co_the_ban")
  @com.fasterxml.jackson.annotation.JsonInclude(
      com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS)
  private Long tonCoTheBan;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ThanhPhanData {

    @JsonProperty("phien_ban_thanh_phan_id")
    private Long phienBanThanhPhanId;

    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonProperty("thoi_han_bao_hanh_thang")
    private Integer thoiHanBaoHanhThang;
  }
}
