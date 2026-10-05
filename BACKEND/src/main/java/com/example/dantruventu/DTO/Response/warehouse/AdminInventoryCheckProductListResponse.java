package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminInventoryCheckProductListResponse {

  private List<AdminInventoryCheckProductItemResponse> items;

  private PaginationResponse pagination;
}
