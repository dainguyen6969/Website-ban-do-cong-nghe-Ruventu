package com.example.dantruventu.DTO.Response.cashbook;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayerSuggestionResponse {

  private Long id;

  @JsonProperty("ten_nguoi_nop_nhan")
  private String tenNguoiNopNhan;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;
}
