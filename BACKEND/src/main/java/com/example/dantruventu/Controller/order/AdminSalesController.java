package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/sales")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSalesController {

  private final AdminSalesService service;

  @GetMapping("/options")
  public ApiResponse<AdminSalesResponse.Options> options() {
    return ok("Lấy cấu hình bán hàng thành công", service.options());
  }

  @GetMapping("/customers")
  public ApiResponse<AdminSalesResponse.PageData<AdminSalesResponse.Customer>> customers(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ok("Lấy khách hàng thành công", service.customers(keyword, page, limit));
  }

  @GetMapping("/products")
  public ApiResponse<AdminSalesResponse.PageData<AdminSalesResponse.Product>> products(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "kho_hang_id") Long warehouseId,
      @RequestParam(name = "bang_gia", defaultValue = "BAN_LE") String priceList,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ok(
        "Lấy sản phẩm bán hàng thành công",
        service.products(keyword, warehouseId, priceList, page, limit));
  }

  @PostMapping("/preview")
  public ApiResponse<AdminSalesResponse.Preview> preview(
      @Valid @RequestBody AdminSalesRequest.Preview request) {

    return ok("Tính giá đơn hàng thành công", service.preview(request));
  }

  private <T> ApiResponse<T> ok(String message, T data) {
    return ApiResponse.<T>builder().status(200).message(message).data(data).build();
  }
}
