package com.example.dantruventu.DTO.Response.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBrandResponse {

  private Long id;

  @JsonProperty("ten_thuong_hieu")
  private String tenThuongHieu;

  @JsonProperty("duong_dan_url")
  private String duongDanUrl;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
