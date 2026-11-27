package com.example.dantruventu.Controller.promotion;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionOrdersResponse;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Services.AdminPromotionOrdersService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/promotions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPromotionOrdersController {
  private final AdminPromotionOrdersService service;

  @GetMapping("/{id}/orders")
  public ApiResponse<AdminPromotionOrdersResponse> getOrders(
      @PathVariable("id") Long id,
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "trang_thai_ap_dung", required = false) TrangThaiApDungKhuyenMai status,
      @RequestParam(name = "tu_ngay", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate from,
      @RequestParam(name = "den_ngay", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate to,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {
    return ApiResponse.<AdminPromotionOrdersResponse>builder()
        .status(200)
        .message("Lấy đơn áp dụng khuyến mại thành công")
        .data(service.getOrders(id, keyword, status, from, to, page, limit))
        .build();
  }
}
