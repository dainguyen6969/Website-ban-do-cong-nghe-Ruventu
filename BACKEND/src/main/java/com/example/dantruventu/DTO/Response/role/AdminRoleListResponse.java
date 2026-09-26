package com.example.dantruventu.DTO.Response.role;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminRoleListResponse {

  private List<RoleListItemResponse> items;
  private PaginationResponse pagination;
}
