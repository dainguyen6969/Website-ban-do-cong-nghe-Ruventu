package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayerSuggestionListResponse {

  @JsonProperty("nhom_nguoi_nop_nhan")
  private NhomNguoiNopNhanEnum nhomNguoiNopNhan;

  @Builder.Default private List<PayerSuggestionResponse> items = List.of();

  private PaginationResponse pagination;
}
