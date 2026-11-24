package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/pos")
@RequiredArgsConstructor
@PreAuthorize("@adminRoleService.hasModuleAction(principal, 'ban_hang_pos', 'them')")
public class AdminPosController {

  private final AdminSalesService service;

  @PostMapping("/checkout/prepare")
  public ApiResponse<Map<String, String>> prepareCheckout(
      @Valid @RequestBody AdminSalesRequest.Pos request) {
    return ApiResponse.<Map<String, String>>builder()
        .status(200)
        .message("Đã chuẩn bị lượt thanh toán tại quầy")
        .data(Map.of("idempotency_key", service.preparePosCheckout(request)))
        .build();
  }

  @PostMapping("/checkout")
  public ResponseEntity<ApiResponse<AdminSalesResponse.Checkout>> checkout(
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody AdminSalesRequest.Pos request) {

    return ResponseEntity.status(201)
        .body(
            ApiResponse.<AdminSalesResponse.Checkout>builder()
                .status(201)
                .message("Thanh toán đơn hàng tại quầy thành công")
                .data(service.checkout(key, request))
                .build());
  }

  @PostMapping("/checkout/resolve")
  public ApiResponse<AdminSalesResponse.CheckoutResolution> resolveCheckout(
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @RequestParam(name = "chi_tra_cuu", defaultValue = "false") boolean lookupOnly,
      @RequestBody AdminSalesRequest.Pos request) {
    return ApiResponse.<AdminSalesResponse.CheckoutResolution>builder()
        .status(200)
        .message("Đã đối soát lượt thanh toán tại quầy")
        .data(service.resolvePosCheckout(key, request, lookupOnly))
        .build();
  }
}
