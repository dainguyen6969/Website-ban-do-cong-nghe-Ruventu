package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashbookResponse {

  @JsonProperty("bo_loc")
  private CashbookFilterResponse boLoc;

  @JsonProperty("tong_hop")
  private CashbookSummaryResponse tongHop;

  @Builder.Default private List<CashbookTransactionResponse> items = List.of();

  private PaginationResponse pagination;
}
