package com.example.dantruventu.DTO.Response.cashbook;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminReceiptTypeListResponse {

  @Builder.Default private List<AdminReceiptTypeResponse> items = List.of();

  private PaginationResponse pagination;
}
