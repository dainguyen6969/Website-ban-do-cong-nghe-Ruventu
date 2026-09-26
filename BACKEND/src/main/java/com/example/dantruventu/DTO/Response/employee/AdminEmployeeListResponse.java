package com.example.dantruventu.DTO.Response.employee;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminEmployeeListResponse {

  private List<EmployeeListItemResponse> items;
  private PaginationResponse pagination;
}
