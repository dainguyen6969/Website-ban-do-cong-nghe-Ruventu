package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComboComponentOptionListResponse {

  private List<AdminComboComponentOptionResponse> items;

  private PaginationResponse pagination;
}
