package com.example.dantruventu.DTO.Response.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminWarehouseResponse {

  private Long id;

  @JsonProperty("ma_kho")
  private String maKho;

  @JsonProperty("ten_kho")
  private String tenKho;

  @JsonProperty("dia_chi")
  private String diaChi;

  @JsonProperty("quan_ly_id")
  private Long quanLyId;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
