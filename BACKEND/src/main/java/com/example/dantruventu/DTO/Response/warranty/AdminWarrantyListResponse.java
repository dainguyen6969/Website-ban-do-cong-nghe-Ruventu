package com.example.dantruventu.DTO.Response.warranty;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminWarrantyListResponse {
  private List<AdminWarrantyListItemResponse> items;
  private PaginationResponse pagination;
}
