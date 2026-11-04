package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.NccRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.Services.warehouse.NccCaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/purchase-orders/{poId}/supplier-cases")
@PreAuthorize("hasRole('ADMIN')")
public class NccCaseController {

  private final NccCaseService service;

  @GetMapping
  public ApiResponse<Object> screen(@PathVariable Long poId) {
    return ApiResponse.builder()
        .status(200)
        .message("Lấy hồ sơ xử lý Nhà Cung Cấp thành công")
        .data(service.screen(poId))
        .build();
  }

  @PostMapping
  public ApiResponse<NccCaseService.Result> open(
      @PathVariable Long poId,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody NccRequest.Open request) {

    return ApiResponse.<NccCaseService.Result>builder()
        .status(200)
        .message("Tạo hồ sơ xử lý Nhà Cung Cấp thành công")
        .data(service.open(poId, key, request))
        .build();
  }

  @PostMapping("/{caseId}/events")
  public ApiResponse<NccCaseService.Result> execute(
      @PathVariable Long poId,
      @PathVariable Long caseId,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody NccRequest.Command request) {

    return ApiResponse.<NccCaseService.Result>builder()
        .status(200)
        .message("Ghi nhận xử lý Nhà Cung Cấp thành công")
        .data(service.execute(poId, caseId, key, request))
        .build();
  }
}
