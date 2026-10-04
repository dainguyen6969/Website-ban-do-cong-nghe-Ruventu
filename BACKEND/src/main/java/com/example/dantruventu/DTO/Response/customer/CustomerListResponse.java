package com.example.dantruventu.DTO.Response.customer;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerListResponse {

  private List<CustomerListItemResponse> items;
  private PaginationResponse pagination;
}
