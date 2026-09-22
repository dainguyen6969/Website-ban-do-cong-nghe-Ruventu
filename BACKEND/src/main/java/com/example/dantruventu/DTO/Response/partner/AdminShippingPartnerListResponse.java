package com.example.dantruventu.DTO.Response.partner;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminShippingPartnerListResponse {

  private List<AdminShippingPartnerListItemResponse> items;
  private PaginationResponse pagination;
}
