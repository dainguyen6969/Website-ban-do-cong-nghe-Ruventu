package com.example.dantruventu.DTO.Response.promotion;

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
public class AdminPromotionListResponse {

  private List<AdminPromotionListItemResponse> items;

  private PaginationResponse pagination;
}
