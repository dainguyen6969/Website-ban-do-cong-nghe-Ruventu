package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.product.AdminBrandRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.product.AdminBrandDetailResponse;
import com.example.dantruventu.DTO.Response.product.AdminBrandListResponse;
import com.example.dantruventu.DTO.Response.product.AdminBrandResponse;
import com.example.dantruventu.DTO.Response.product.AdminBrandStatusResponse;
import com.example.dantruventu.Services.AdminBrandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/brands")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBrandController {

  private final AdminBrandService adminBrandService;

  @GetMapping
  public ApiResponse<AdminBrandListResponse> getBrands(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) Short trangThai,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {

    return ApiResponse.<AdminBrandListResponse>builder()
        .status(200)
        .message("Lấy danh sách thương hiệu thành công")
        .data(adminBrandService.getBrands(keyword, trangThai, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminBrandDetailResponse> getDetail(@PathVariable Long id) {

    return ApiResponse.<AdminBrandDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết thương hiệu thành công")
        .data(adminBrandService.getDetail(id))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminBrandResponse>> create(
      @Valid @RequestBody AdminBrandRequest request) {

    var response =
        ApiResponse.<AdminBrandResponse>builder()
            .status(201)
            .message("Thêm thương hiệu thành công")
            .data(adminBrandService.create(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PutMapping("/{id}")
  public ApiResponse<AdminBrandResponse> update(
      @PathVariable Long id, @Valid @RequestBody AdminBrandRequest request) {

    return ApiResponse.<AdminBrandResponse>builder()
        .status(200)
        .message("Cập nhật thương hiệu thành công")
        .data(adminBrandService.update(id, request))
        .build();
  }

  @DeleteMapping("/{id}")
  public ApiResponse<AdminBrandStatusResponse> delete(@PathVariable Long id) {

    return ApiResponse.<AdminBrandStatusResponse>builder()
        .status(200)
        .message("Ngừng hoạt động thương hiệu thành công")
        .data(adminBrandService.softDelete(id))
        .build();
  }
}
