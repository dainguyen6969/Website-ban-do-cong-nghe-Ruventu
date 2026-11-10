package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnHandoverRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminReturnHandoverResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.order.AdminReturnHandoverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/returns")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReturnHandoverController {

  private final AdminReturnHandoverService handoverService;

  @PostMapping("/{id}/handover")
  public ApiResponse<AdminReturnHandoverResponse> handover(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
      @Valid @RequestBody AdminReturnHandoverRequest request,
      @AuthenticationPrincipal NguoiDung actor) {
    return ApiResponse.<AdminReturnHandoverResponse>builder()
        .status(200)
        .message("Bàn giao lại hàng thành công")
        .data(handoverService.handover(id, idempotencyKey, request, actor))
        .build();
  }
}
