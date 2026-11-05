package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnInspectionRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminReturnInspectionResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.order.AdminReturnInspectionService;
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
public class AdminReturnInspectionController {

  private final AdminReturnInspectionService inspectionService;

  @PostMapping("/{id}/inspection")
  public ApiResponse<AdminReturnInspectionResponse> inspect(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody AdminReturnInspectionRequest request,
      @AuthenticationPrincipal NguoiDung actor) {
    return ApiResponse.<AdminReturnInspectionResponse>builder()
        .status(200)
        .message("Ghi nhận thực tiếp nhận thành công")
        .data(inspectionService.inspect(id, key, request, actor))
        .build();
  }
}
