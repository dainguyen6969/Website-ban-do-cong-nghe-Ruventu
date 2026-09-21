package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderPaymentRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderReceiveRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderReturnRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderSaveRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warehouse.*;
import com.example.dantruventu.Services.AdminPurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/purchase-orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPurchaseOrderController {

  private final AdminPurchaseOrderService service;

  @GetMapping
  public ApiResponse<AdminPurchaseOrderListResponse> getList(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "nha_cung_cap_id", required = false) Long nhaCungCapId,
      @RequestParam(name = "trang_thai_nhap", required = false) String trangThaiNhap,
      @RequestParam(name = "trang_thai_thanh_toan", required = false) String trangThaiThanhToan,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {

    return ApiResponse.<AdminPurchaseOrderListResponse>builder()
        .status(200)
        .message("Lấy danh sách đơn nhập hàng thành công")
        .data(
            service.getList(keyword, nhaCungCapId, trangThaiNhap, trangThaiThanhToan, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminPurchaseOrderDetailResponse> getDetail(@PathVariable Long id) {

    return ApiResponse.<AdminPurchaseOrderDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết đơn nhập hàng thành công")
        .data(service.getDetail(id))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminPurchaseOrderDetailResponse>> create(
      @Valid @RequestBody AdminPurchaseOrderSaveRequest request) {

    ApiResponse<AdminPurchaseOrderDetailResponse> response =
        ApiResponse.<AdminPurchaseOrderDetailResponse>builder()
            .status(201)
            .message("Tạo đơn nhập hàng thành công")
            .data(service.create(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PutMapping("/{id}")
  public ApiResponse<AdminPurchaseOrderStatusResponse> update(
      @PathVariable Long id, @Valid @RequestBody AdminPurchaseOrderSaveRequest request) {

    return ApiResponse.<AdminPurchaseOrderStatusResponse>builder()
        .status(200)
        .message("Cập nhật đơn nhập hàng thành công")
        .data(service.update(id, request))
        .build();
  }

  @PostMapping("/{id}/approve")
  public ApiResponse<AdminPurchaseOrderStatusResponse> approve(@PathVariable Long id) {

    return ApiResponse.<AdminPurchaseOrderStatusResponse>builder()
        .status(200)
        .message("Duyệt đơn nhập hàng thành công")
        .data(service.approve(id))
        .build();
  }

  @PostMapping("/{id}/payments")
  public ApiResponse<AdminPurchaseOrderPaymentResponse> pay(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminPurchaseOrderPaymentRequest request) {

    return ApiResponse.<AdminPurchaseOrderPaymentResponse>builder()
        .status(200)
        .message("Thanh toán nhà cung cấp thành công")
        .data(service.pay(id, idempotencyKey, request))
        .build();
  }

  @PostMapping("/{id}/receive")
  public ApiResponse<AdminPurchaseOrderReceiveResponse> receive(
      @PathVariable Long id, @Valid @RequestBody AdminPurchaseOrderReceiveRequest request) {

    return ApiResponse.<AdminPurchaseOrderReceiveResponse>builder()
        .status(200)
        .message("Nhập kho thành công")
        .data(service.receive(id, request))
        .build();
  }

  @PostMapping("/{id}/returns")
  public ResponseEntity<ApiResponse<AdminPurchaseOrderReturnResponse>> returnToSupplier(
      @PathVariable Long id, @Valid @RequestBody AdminPurchaseOrderReturnRequest request) {

    ApiResponse<AdminPurchaseOrderReturnResponse> response =
        ApiResponse.<AdminPurchaseOrderReturnResponse>builder()
            .status(201)
            .message("Ghi nhận trả nhà cung cấp thành công")
            .data(service.returnToSupplier(id, request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<AdminPurchaseOrderStatusResponse> cancel(@PathVariable Long id) {

    return ApiResponse.<AdminPurchaseOrderStatusResponse>builder()
        .status(200)
        .message("Hủy đơn nhập hàng thành công")
        .data(service.cancel(id))
        .build();
  }
}
