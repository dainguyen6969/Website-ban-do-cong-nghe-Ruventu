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
public class AdminPromotionDeleteResponse {

  private Long id;

  @JsonProperty("ma_chuong_trinh")
  private String maChuongTrinh;
}
