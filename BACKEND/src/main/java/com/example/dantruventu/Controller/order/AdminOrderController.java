package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {

  private final AdminSalesService service;

  @PostMapping
  public ResponseEntity<ApiResponse<AdminSalesResponse.Order>> create(
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody AdminSalesRequest.Online request) {

    return ResponseEntity.status(201)
        .body(
            ApiResponse.<AdminSalesResponse.Order>builder()
                .status(201)
                .message("Tạo đơn hàng Online thành công")
                .data(service.createOnline(key, request))
                .build());
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminSalesResponse.Order> getDetail(@PathVariable("id") Long id) {

    return ApiResponse.<AdminSalesResponse.Order>builder()
        .status(200)
        .message("Lấy chi tiết đơn hàng thành công")
        .data(service.getOrder(id))
        .build();
  }
}
