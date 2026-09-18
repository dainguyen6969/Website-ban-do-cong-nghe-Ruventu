package com.example.dantruventu.DTO.Response.product;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCategoryListResponse {

  private List<AdminCategoryListItemResponse> items;

  private PaginationResponse pagination;
}
