package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.product.AdminCategoryCreateRequest;
import com.example.dantruventu.DTO.Request.product.AdminCategoryUpdateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.product.AdminCategoryDetailResponse;
import com.example.dantruventu.DTO.Response.product.AdminCategoryListResponse;
import com.example.dantruventu.DTO.Response.product.AdminCategoryResponse;
import com.example.dantruventu.DTO.Response.product.AdminCategoryStatusResponse;
import com.example.dantruventu.Services.AdminCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCategoryController {

  private final AdminCategoryService adminCategoryService;

  @GetMapping
  public ApiResponse<AdminCategoryListResponse> getCategories(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) Short trangThai,
      @RequestParam(name = "danh_muc_cha_id", required = false) Long danhMucChaId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {

    return ApiResponse.<AdminCategoryListResponse>builder()
        .status(200)
        .message("Lấy danh sách danh mục thành công")
        .data(adminCategoryService.getCategories(keyword, trangThai, danhMucChaId, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminCategoryDetailResponse> getDetail(@PathVariable Long id) {

    return ApiResponse.<AdminCategoryDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết danh mục thành công")
        .data(adminCategoryService.getDetail(id))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminCategoryResponse>> create(
      @Valid @RequestBody AdminCategoryCreateRequest request) {

    ApiResponse<AdminCategoryResponse> response =
        ApiResponse.<AdminCategoryResponse>builder()
            .status(201)
            .message("Thêm danh mục thành công")
            .data(adminCategoryService.create(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PutMapping("/{id}")
  public ApiResponse<AdminCategoryResponse> update(
      @PathVariable Long id, @Valid @RequestBody AdminCategoryUpdateRequest request) {

    return ApiResponse.<AdminCategoryResponse>builder()
        .status(200)
        .message("Cập nhật danh mục thành công")
        .data(adminCategoryService.update(id, request))
        .build();
  }

  @DeleteMapping("/{id}")
  public ApiResponse<AdminCategoryStatusResponse> delete(@PathVariable Long id) {

    return ApiResponse.<AdminCategoryStatusResponse>builder()
        .status(200)
        .message("Ngừng hoạt động danh mục thành công")
        .data(adminCategoryService.softDelete(id))
        .build();
  }
}
