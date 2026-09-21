package com.example.dantruventu.DTO.Response.partner;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSupplierListResponse {

    private List<AdminSupplierListItemResponse> items;

    private PaginationResponse pagination;
}