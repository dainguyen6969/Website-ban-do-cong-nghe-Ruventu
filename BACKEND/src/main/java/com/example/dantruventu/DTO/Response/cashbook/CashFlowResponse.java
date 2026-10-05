package com.example.dantruventu.DTO.Response.cashbook;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashFlowResponse {

  @JsonProperty("bo_loc")
  private CashbookFilterResponse boLoc;

  @JsonProperty("nhom_theo")
  private String nhomTheo;

  @JsonProperty("co_du_lieu")
  private boolean coDuLieu;

  @Builder.Default private List<CashFlowBucketItemResponse> items = List.of();
}
