package com.example.dantruventu.DTO.Response.warehouse;


import com.example.dantruventu.DTO.Response.PaginationResponse;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminInventoryLedgerListResponse {

    private List<AdminInventoryLedgerResponse> items;

    private PaginationResponse pagination;
}