package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminWarehouseListResponse;
import com.example.dantruventu.Services.AdminWarehouseService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/warehouses")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminWarehouseController {

    private final AdminWarehouseService adminWarehouseService;

    @GetMapping
    public ApiResponse<AdminWarehouseListResponse> getWarehouses(
            @RequestParam(name = "keyword", required = false)
            String keyword,
            @RequestParam(name = "trang_thai", required = false)
            Short trangThai,
            @RequestParam(name = "page", defaultValue = "0")
            int page,
            @RequestParam(name = "limit", defaultValue = "20")
            int limit) {

        return ApiResponse.<AdminWarehouseListResponse>builder()
                .status(200)
                .message("Lấy danh sách kho thành công")
                .data(
                        adminWarehouseService.getWarehouses(
                                keyword, trangThai, page, limit))
                .build();
    }
}