package com.example.dantruventu.DTO.Response.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBrandStatusResponse {

  private Long id;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
