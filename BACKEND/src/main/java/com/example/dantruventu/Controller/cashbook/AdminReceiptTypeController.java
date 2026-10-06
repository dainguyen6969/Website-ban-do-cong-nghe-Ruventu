package com.example.dantruventu.Controller.cashbook;

import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptTypeCreateRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptTypeStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeListResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeStatusResponse;
import com.example.dantruventu.Services.AdminReceiptTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/receipt-types")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReceiptTypeController {

  private final AdminReceiptTypeService service;

  @GetMapping
  public ApiResponse<AdminReceiptTypeListResponse> getReceiptTypes(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) String trangThai,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {

    return ApiResponse.<AdminReceiptTypeListResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy danh sách loại phiếu thu thành công")
        .data(service.getReceiptTypes(keyword, trangThai, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminReceiptTypeResponse> getReceiptTypeDetail(@PathVariable String id) {

    return ApiResponse.<AdminReceiptTypeResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy chi tiết loại phiếu thu thành công")
        .data(service.getReceiptTypeDetail(id))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminReceiptTypeResponse>> createReceiptType(
      @RequestBody(required = false) AdminReceiptTypeCreateRequest request) {

    ApiResponse<AdminReceiptTypeResponse> response =
        ApiResponse.<AdminReceiptTypeResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Thêm loại phiếu thu thành công")
            .data(service.createReceiptType(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PatchMapping("/{id}/status")
  public ApiResponse<AdminReceiptTypeStatusResponse> updateReceiptTypeStatus(
      @PathVariable String id,
      @RequestBody(required = false) AdminReceiptTypeStatusRequest request) {

    AdminReceiptTypeStatusResponse data = service.updateReceiptTypeStatus(id, request);

    String message;
    if (!data.isChanged()) {
      message = "Trạng thái loại phiếu thu không thay đổi";
    } else if (data.getTrangThai() == 1) {
      message = "Kích hoạt loại phiếu thu thành công";
    } else {
      message = "Ngừng hoạt động loại phiếu thu thành công";
    }

    return ApiResponse.<AdminReceiptTypeStatusResponse>builder()
        .status(HttpStatus.OK.value())
        .message(message)
        .data(data)
        .build();
  }
}
