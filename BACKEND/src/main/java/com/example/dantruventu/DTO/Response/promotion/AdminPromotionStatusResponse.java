package com.example.dantruventu.DTO.Response.promotion;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class AdminPromotionStatusResponse {

  private Long id;

  @JsonProperty("ma_chuong_trinh")
  private String maChuongTrinh;

  @JsonProperty("trang_thai")
  private short trangThai;

  @JsonProperty("trang_thai_hien_thi")
  private String trangThaiHienThi;
}
