package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnRejectRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminReturnRejectResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.order.AdminReturnRejectService;
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
public class AdminReturnRejectController {

  private final AdminReturnRejectService rejectService;

  @PostMapping("/{id}/reject")
  public ApiResponse<AdminReturnRejectResponse> reject(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
      @Valid @RequestBody AdminReturnRejectRequest request,
      @AuthenticationPrincipal NguoiDung actor) {
    return ApiResponse.<AdminReturnRejectResponse>builder()
        .status(200)
        .message("Ghi nhận từ chối thành công")
        .data(rejectService.reject(id, idempotencyKey, request, actor))
        .build();
  }
}
