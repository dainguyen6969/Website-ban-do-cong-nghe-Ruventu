package com.example.dantruventu.DTO.Response.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBrandListItemResponse {

  private Long id;

  private String logo;

  @JsonProperty("ten_thuong_hieu")
  private String tenThuongHieu;

  @JsonProperty("duong_dan_url")
  private String duongDanUrl;

  @JsonProperty("so_luong_san_pham")
  private Long soLuongSanPham;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
