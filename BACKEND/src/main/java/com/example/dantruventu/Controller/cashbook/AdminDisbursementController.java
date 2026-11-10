package com.example.dantruventu.Controller.cashbook;

import com.example.dantruventu.DTO.Request.cashbook.AdminDisbursementCancelRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminDisbursementCreateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementCancelResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementResponse;
import com.example.dantruventu.DTO.Response.cashbook.PayerSuggestionListResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminDisbursementService;
import com.example.dantruventu.Services.cashbook.CashbookReadService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/disbursements")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDisbursementController {

  private final AdminDisbursementService service;
  private final CashbookReadService reads;

  @GetMapping
  public ApiResponse<Map<String, Object>> getDisbursements(
      @RequestParam Map<String, String> params) {

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy danh sách phiếu chi thành công")
        .data(reads.vouchers(params, LoaiPhieuThuChi.CHI))
        .build();
  }

  @GetMapping("/payees")
  public ApiResponse<PayerSuggestionListResponse> getPayeeSuggestions(
      @RequestParam(name = "nhom_nguoi_nop_nhan", required = false) String nhomNguoiNopNhan,
      @RequestParam(required = false) String keyword,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {

    return ApiResponse.<PayerSuggestionListResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy danh sách người nhận thành công")
        .data(service.getPayeeSuggestions(nhomNguoiNopNhan, keyword, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<Map<String, Object>> getDisbursementDetail(@PathVariable String id) {

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy chi tiết phiếu chi thành công")
        .data(reads.detail(id, LoaiPhieuThuChi.CHI))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminDisbursementResponse>> createDisbursement(
      @RequestBody(required = false) AdminDisbursementCreateRequest request,
      @RequestHeader(name = "Idempotency-Key", required = false) String requestKey,
      Authentication authentication) {

    if (authentication == null || !(authentication.getPrincipal() instanceof NguoiDung admin)) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    ApiResponse<AdminDisbursementResponse> response =
        ApiResponse.<AdminDisbursementResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Tạo phiếu chi thành công")
            .data(service.createDisbursement(request, admin, requestKey))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<AdminDisbursementCancelResponse> cancelDisbursement(
      @PathVariable String id,
      @RequestHeader("Idempotency-Key") String requestKey,
      @RequestBody AdminDisbursementCancelRequest request,
      Authentication authentication) {

    if (authentication == null || !(authentication.getPrincipal() instanceof NguoiDung actor)) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    return ApiResponse.<AdminDisbursementCancelResponse>builder()
        .status(200)
        .message("Hủy phiếu chi thành công")
        .data(service.cancelDisbursement(id, request, actor, requestKey))
        .build();
  }
}
