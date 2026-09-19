package com.example.dantruventu.DTO.Response.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBrandDetailResponse {

  private Long id;

  private String logo;

  @JsonProperty("ten_thuong_hieu")
  private String tenThuongHieu;

  @JsonProperty("duong_dan_url")
  private String duongDanUrl;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("san_pham")
  private List<ProductData> sanPham;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ProductData {

    private Long id;

    @JsonProperty("ma_san_pham")
    private String maSanPham;

    @JsonProperty("ten_san_pham")
    private String tenSanPham;

    @JsonProperty("gia_ban")
    private BigDecimal giaBan;

    @JsonProperty("ton_co_the_ban")
    private Long tonCoTheBan;

    @JsonProperty("trang_thai")
    private Short trangThai;
  }
}
