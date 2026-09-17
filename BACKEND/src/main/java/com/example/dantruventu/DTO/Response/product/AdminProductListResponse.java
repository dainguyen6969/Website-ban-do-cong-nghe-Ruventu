package com.example.dantruventu.DTO.Response.product;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductListResponse {

  private List<AdminProductListItemResponse> items;

  private PaginationResponse pagination;
}
