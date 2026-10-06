package com.example.dantruventu.Controller.cashbook;

import com.example.dantruventu.DTO.Request.cashbook.AdminDisbursementCancelRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminDisbursementCreateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementCancelResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementListResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementResponse;
import com.example.dantruventu.DTO.Response.cashbook.PayerSuggestionListResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminDisbursementService;
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

  @GetMapping
  public ApiResponse<AdminDisbursementListResponse> getDisbursements(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "loai_thu_chi_id", required = false) String loaiThuChiId,
      @RequestParam(name = "nhom_nguoi_nop_nhan", required = false) String nhomNguoiNopNhan,
      @RequestParam(name = "phuong_thuc_thanh_toan", required = false) String phuongThucThanhToan,
      @RequestParam(name = "nguoi_tao_id", required = false) String nguoiTaoId,
      @RequestParam(name = "nguon_tao", required = false) String nguonTao,
      @RequestParam(name = "trang_thai", required = false) String trangThai,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {

    return ApiResponse.<AdminDisbursementListResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy danh sách phiếu chi thành công")
        .data(
            service.getDisbursements(
                keyword,
                loaiThuChiId,
                nhomNguoiNopNhan,
                phuongThucThanhToan,
                nguoiTaoId,
                nguonTao,
                trangThai,
                tuNgay,
                denNgay,
                page,
                limit))
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
  public ApiResponse<AdminDisbursementResponse> getDisbursementDetail(@PathVariable String id) {

    return ApiResponse.<AdminDisbursementResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy chi tiết phiếu chi thành công")
        .data(service.getDisbursementDetail(id))
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
      @RequestBody(required = false) AdminDisbursementCancelRequest request) {

    return ApiResponse.<AdminDisbursementCancelResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Hủy phiếu chi thành công")
        .data(service.cancelDisbursement(id, request))
        .build();
  }
}
