package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnCancelRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminReturnCancelResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.order.AdminReturnCancelService;
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
public class AdminReturnCancelController {

  private final AdminReturnCancelService cancelService;

  @PostMapping("/{id}/cancel")
  public ApiResponse<AdminReturnCancelResponse> cancel(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
      @Valid @RequestBody AdminReturnCancelRequest request,
      @AuthenticationPrincipal NguoiDung actor) {
    return ApiResponse.<AdminReturnCancelResponse>builder()
        .status(200)
        .message("Ghi nhận yêu cầu hủy thành công")
        .data(cancelService.cancel(id, idempotencyKey, request, actor))
        .build();
  }
}
