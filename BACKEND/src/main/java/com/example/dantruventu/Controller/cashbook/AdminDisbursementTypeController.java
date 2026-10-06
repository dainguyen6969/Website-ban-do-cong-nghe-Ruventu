package com.example.dantruventu.Controller.cashbook;

import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptTypeCreateRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptTypeStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeListResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeStatusResponse;
import com.example.dantruventu.Services.AdminDisbursementTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/disbursement-types")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDisbursementTypeController {

  private final AdminDisbursementTypeService service;

  @GetMapping
  public ApiResponse<AdminReceiptTypeListResponse> getDisbursementTypes(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) String trangThai,
      @RequestParam(name = "dung_cho", required = false) String dungCho,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {

    return ApiResponse.<AdminReceiptTypeListResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy danh sách loại phiếu chi thành công")
        .data(service.getDisbursementTypes(keyword, trangThai, dungCho, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminReceiptTypeResponse> getDisbursementTypeDetail(@PathVariable String id) {

    return ApiResponse.<AdminReceiptTypeResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy chi tiết loại phiếu chi thành công")
        .data(service.getDisbursementTypeDetail(id))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminReceiptTypeResponse>> createDisbursementType(
      @RequestBody(required = false) AdminReceiptTypeCreateRequest request) {

    ApiResponse<AdminReceiptTypeResponse> response =
        ApiResponse.<AdminReceiptTypeResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Thêm loại phiếu chi thành công")
            .data(service.createDisbursementType(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PatchMapping("/{id}/status")
  public ApiResponse<AdminReceiptTypeStatusResponse> updateDisbursementTypeStatus(
      @PathVariable String id,
      @RequestBody(required = false) AdminReceiptTypeStatusRequest request) {

    AdminReceiptTypeStatusResponse data = service.updateDisbursementTypeStatus(id, request);

    String message;
    if (!data.isChanged()) {
      message = "Trạng thái loại phiếu chi không thay đổi";
    } else if (data.getTrangThai() == 1) {
      message = "Kích hoạt loại phiếu chi thành công";
    } else {
      message = "Ngừng hoạt động loại phiếu chi thành công";
    }

    return ApiResponse.<AdminReceiptTypeStatusResponse>builder()
        .status(HttpStatus.OK.value())
        .message(message)
        .data(data)
        .build();
  }
}
