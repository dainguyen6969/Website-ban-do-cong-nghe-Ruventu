package com.example.dantruventu.Controller.partner;

import com.example.dantruventu.DTO.Request.partner.AdminSupplierCreateRequest;
import com.example.dantruventu.DTO.Request.partner.AdminSupplierUpdateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierDetailResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierListResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierResponse;
import com.example.dantruventu.Services.AdminSupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/suppliers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSupplierController {

  private final AdminSupplierService adminSupplierService;

  @GetMapping
  public ApiResponse<AdminSupplierListResponse> getSuppliers(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) Short trangThai,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminSupplierListResponse>builder()
        .status(200)
        .message("Lấy danh sách nhà cung cấp thành công")
        .data(adminSupplierService.getSuppliers(keyword, trangThai, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminSupplierDetailResponse> getDetail(
      @PathVariable("id") Long id,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminSupplierDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết nhà cung cấp thành công")
        .data(adminSupplierService.getDetail(id, page, limit))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminSupplierResponse>> create(
      @Valid @RequestBody AdminSupplierCreateRequest request) {

    var response =
        ApiResponse.<AdminSupplierResponse>builder()
            .status(201)
            .message("Thêm nhà cung cấp thành công")
            .data(adminSupplierService.create(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PutMapping("/{id}")
  public ApiResponse<AdminSupplierResponse> update(
      @PathVariable("id") Long id, @Valid @RequestBody AdminSupplierUpdateRequest request) {

    return ApiResponse.<AdminSupplierResponse>builder()
        .status(200)
        .message("Cập nhật nhà cung cấp thành công")
        .data(adminSupplierService.update(id, request))
        .build();
  }
}
