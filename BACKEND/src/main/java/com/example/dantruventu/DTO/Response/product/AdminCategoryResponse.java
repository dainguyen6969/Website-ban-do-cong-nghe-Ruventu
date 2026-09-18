package com.example.dantruventu.DTO.Response.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCategoryResponse {

  private Long id;

  @JsonProperty("ten_danh_muc")
  private String tenDanhMuc;

  @JsonProperty("danh_muc_cha_id")
  private Long danhMucChaId;

  @JsonProperty("duong_dan_url")
  private String duongDanUrl;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
