package com.example.dantruventu.Controller.cashbook;

import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptCancelRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptCreateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptCancelResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptListResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptResponse;
import com.example.dantruventu.DTO.Response.cashbook.PayerSuggestionListResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminReceiptService;
import jakarta.validation.Valid;
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

  @GetMapping
  public ApiResponse<AdminReceiptListResponse> getReceipts(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) String trangThai,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {

    return ApiResponse.<AdminReceiptListResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy danh sách phiếu thu thành công")
        .data(service.getReceipts(keyword, trangThai, tuNgay, denNgay, page, limit))
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
  public ApiResponse<AdminReceiptResponse> getReceiptDetail(@PathVariable String id) {

    return ApiResponse.<AdminReceiptResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy chi tiết phiếu thu thành công")
        .data(service.getReceiptDetail(id))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminReceiptResponse>> createReceipt(
      @Valid @RequestBody AdminReceiptCreateRequest request, Authentication authentication) {

    if (authentication == null || !(authentication.getPrincipal() instanceof NguoiDung admin)) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    ApiResponse<AdminReceiptResponse> response =
        ApiResponse.<AdminReceiptResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Tạo phiếu thu thành công")
            .data(service.createReceipt(request, admin))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<AdminReceiptCancelResponse> cancelReceipt(
      @PathVariable String id, @RequestBody(required = false) AdminReceiptCancelRequest request) {

    return ApiResponse.<AdminReceiptCancelResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Hủy phiếu thu thành công")
        .data(service.cancelReceipt(id, request))
        .build();
  }
}
