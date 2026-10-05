package com.example.dantruventu.DTO.Response.cashbook;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashFlowBucketItemResponse {

  @JsonProperty("tu_ngay")
  private LocalDate tuNgay;

  @JsonProperty("den_ngay")
  private LocalDate denNgay;

  @JsonProperty("tong_thu")
  private BigDecimal tongThu;

  @JsonProperty("tong_chi")
  private BigDecimal tongChi;
}
