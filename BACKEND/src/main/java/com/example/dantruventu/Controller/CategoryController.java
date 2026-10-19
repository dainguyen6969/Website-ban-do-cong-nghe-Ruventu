package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.product.AdminCategoryListResponse;
import com.example.dantruventu.Services.AdminCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

  private final AdminCategoryService adminCategoryService;

  @GetMapping
  public ResponseEntity<ApiResponse<AdminCategoryListResponse>> getCategories(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) Short trangThai,
      @RequestParam(name = "danh_muc_cha_id", required = false) Long danhMucChaId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "100") int limit) {

    AdminCategoryListResponse data =
        adminCategoryService.getCategories(
            keyword, trangThai != null ? trangThai : (short) 1, danhMucChaId, page, limit);

    ApiResponse<AdminCategoryListResponse> response =
        ApiResponse.<AdminCategoryListResponse>builder()
            .status(200)
            .message("Lấy danh sách danh mục thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }
}
