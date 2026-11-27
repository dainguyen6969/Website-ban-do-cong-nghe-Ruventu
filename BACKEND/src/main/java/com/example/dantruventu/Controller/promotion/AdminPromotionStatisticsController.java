package com.example.dantruventu.Controller.promotion;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionStatisticsResponse;
import com.example.dantruventu.Services.AdminPromotionStatisticsService;
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
public class AdminPromotionStatisticsController {

  private final AdminPromotionStatisticsService service;

  @GetMapping("/{id}/statistics")
  public ApiResponse<AdminPromotionStatisticsResponse> getStatistics(
      @PathVariable("id") Long id,
      @RequestParam(name = "tu_ngay")
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate from,
      @RequestParam(name = "den_ngay")
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate to) {
    return ApiResponse.<AdminPromotionStatisticsResponse>builder()
        .status(200)
        .message("Lấy thống kê khuyến mại thành công")
        .data(service.getStatistics(id, from, to))
        .build();
  }
}
