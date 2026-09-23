package com.example.dantruventu.DTO.Response.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCategoryListItemResponse {

  private Long id;

  @JsonProperty("ten_danh_muc")
  private String tenDanhMuc;

  @JsonProperty("danh_muc_cha_id")
  private Long danhMucChaId;

  @JsonProperty("ten_danh_muc_cha")
  private String tenDanhMucCha;

  @JsonProperty("anh_dai_dien")
  private String anhDaiDien;

  @JsonProperty("duong_dan_url")
  private String duongDanUrl;

  @JsonProperty("so_luong_san_pham")
  private Long soLuongSanPham;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
