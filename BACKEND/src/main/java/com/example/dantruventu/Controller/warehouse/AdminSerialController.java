package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminSerialStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialDeleteBlockedResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialDetailResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialStatusResponse;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Services.AdminSerialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/serials")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSerialController {

  private final AdminSerialService adminSerialService;

  @GetMapping
  public ApiResponse<AdminSerialListResponse> getSerials(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "so_serial", required = false) String soSerial,
      @RequestParam(name = "trang_thai", required = false) TrangThaiSerial trangThai,
      @RequestParam(name = "phien_ban_id", required = false) Long phienBanId,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminSerialListResponse>builder()
        .status(200)
        .message("Lấy danh sách serial thành công")
        .data(adminSerialService.getSerials(keyword, soSerial, trangThai, phienBanId, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminSerialDetailResponse> getDetail(@PathVariable("id") Long id) {

    return ApiResponse.<AdminSerialDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết serial thành công")
        .data(adminSerialService.getDetail(id))
        .build();
  }

  @PatchMapping("/{id}/status")
  public ApiResponse<AdminSerialStatusResponse> updateStatus(
      @PathVariable("id") Long id,
      @Valid @RequestBody AdminSerialStatusRequest request,
      @AuthenticationPrincipal Long actorId) {

    return ApiResponse.<AdminSerialStatusResponse>builder()
        .status(200)
        .message("Cập nhật trạng thái serial thành công")
        .data(adminSerialService.updateStatus(id, request, actorId))
        .build();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<AdminSerialDeleteBlockedResponse> delete(@PathVariable("id") Long id) {

    return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
        .body(adminSerialService.blockDelete(id));
  }
}
