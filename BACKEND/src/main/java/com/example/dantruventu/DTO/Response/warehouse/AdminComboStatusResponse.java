package com.example.dantruventu.DTO.Response.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComboStatusResponse {

  private Long id;

  @JsonProperty("trang_thai")
  private Short trangThai;
}
