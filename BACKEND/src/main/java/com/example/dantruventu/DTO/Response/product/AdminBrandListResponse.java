package com.example.dantruventu.DTO.Response.product;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBrandListResponse {

  private List<AdminBrandListItemResponse> items;

  private PaginationResponse pagination;
}
