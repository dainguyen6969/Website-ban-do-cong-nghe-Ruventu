package com.example.dantruventu.Controller.cashbook;

import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptCancelRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptCreateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptCancelResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptResponse;
import com.example.dantruventu.DTO.Response.cashbook.PayerSuggestionListResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminReceiptService;
import com.example.dantruventu.Services.cashbook.CashbookReadService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/receipts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReceiptController {

  private final AdminReceiptService service;
  private final CashbookReadService reads;

  @GetMapping
  public ApiResponse<Map<String, Object>> getReceipts(@RequestParam Map<String, String> params) {

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy danh sách phiếu thu thành công")
        .data(reads.vouchers(params, LoaiPhieuThuChi.THU))
        .build();
  }

  @GetMapping("/payers")
  public ApiResponse<PayerSuggestionListResponse> getPayerSuggestions(
      @RequestParam(name = "nhom_nguoi_nop_nhan", required = false) String nhomNguoiNopNhan,
      @RequestParam(required = false) String keyword,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {

    return ApiResponse.<PayerSuggestionListResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy danh sách người nộp thành công")
        .data(service.getPayerSuggestions(nhomNguoiNopNhan, keyword, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<Map<String, Object>> getReceiptDetail(@PathVariable String id) {

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy chi tiết phiếu thu thành công")
        .data(reads.detail(id, LoaiPhieuThuChi.THU))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminReceiptResponse>> createReceipt(
      @Valid @RequestBody AdminReceiptCreateRequest request,
      @RequestHeader(name = "Idempotency-Key", required = false) String requestKey,
      Authentication authentication) {

    if (authentication == null || !(authentication.getPrincipal() instanceof NguoiDung admin)) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    ApiResponse<AdminReceiptResponse> response =
        ApiResponse.<AdminReceiptResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Tạo phiếu thu thành công")
            .data(service.createReceipt(request, admin, requestKey))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<AdminReceiptCancelResponse> cancelReceipt(
      @PathVariable String id,
      @RequestHeader("Idempotency-Key") String requestKey,
      @RequestBody AdminReceiptCancelRequest request,
      Authentication authentication) {

    if (authentication == null || !(authentication.getPrincipal() instanceof NguoiDung actor)) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    return ApiResponse.<AdminReceiptCancelResponse>builder()
        .status(200)
        .message("Hủy phiếu thu thành công")
        .data(service.cancelReceipt(id, request, actor, requestKey))
        .build();
  }
}
