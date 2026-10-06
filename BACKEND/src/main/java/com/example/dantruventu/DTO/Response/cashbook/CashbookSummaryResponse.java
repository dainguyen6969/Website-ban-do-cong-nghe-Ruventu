package com.example.dantruventu.DTO.Response.cashbook;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashbookSummaryResponse {

  @JsonProperty("so_du_dau_ky")
  private BigDecimal soDuDauKy;

  @JsonProperty("tong_thu")
  private BigDecimal tongThu;

  @JsonProperty("tong_chi")
  private BigDecimal tongChi;

  @JsonProperty("ton_cuoi_ky")
  private BigDecimal tonCuoiKy;
}
