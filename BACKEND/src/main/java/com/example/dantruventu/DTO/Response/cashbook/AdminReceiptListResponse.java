package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminReceiptListResponse {

  @Builder.Default private List<AdminReceiptListItemResponse> items = List.of();

  private PaginationResponse pagination;
}
