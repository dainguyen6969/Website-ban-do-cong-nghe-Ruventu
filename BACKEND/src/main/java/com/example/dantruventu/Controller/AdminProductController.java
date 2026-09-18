package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.product.AdminProductCreateRequest;
import com.example.dantruventu.DTO.Request.product.AdminProductUpdateRequest;
import com.example.dantruventu.DTO.Request.product.ProductVariantCreateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.product.*;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Services.AdminProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

  private final AdminProductService adminProductService;

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN')")
  public ApiResponse<AdminProductListResponse> getProducts(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "danh_muc_id", required = false) Long danhMucId,
      @RequestParam(name = "thuong_hieu_id", required = false) Long thuongHieuId,
      @RequestParam(name = "trang_thai", required = false) Short trangThai,
      @RequestParam(name = "loai_san_pham", required = false) LoaiSanPham loaiSanPham,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit,
      @RequestParam(defaultValue = "id,desc") String sort) {

    return ApiResponse.<AdminProductListResponse>builder()
        .status(200)
        .message("Lấy danh sách sản phẩm thành công")
        .data(
            adminProductService.getProducts(
                keyword, danhMucId, thuongHieuId, trangThai, loaiSanPham, page, limit, sort))
        .build();
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<AdminProductDetailResponse> getDetail(@PathVariable Long id) {

    return ApiResponse.<AdminProductDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết sản phẩm thành công")
        .data(adminProductService.getProductDetail(id))
        .build();
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN')")
  public ResponseEntity<ApiResponse<AdminProductCreateResponse>> createProduct(
      @Valid @RequestBody AdminProductCreateRequest request) {

    ApiResponse<AdminProductCreateResponse> response =
        ApiResponse.<AdminProductCreateResponse>builder()
            .status(201)
            .message("Tạo sản phẩm thành công")
            .data(adminProductService.createProduct(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN')")
  public ApiResponse<AdminProductUpdateResponse> updateProduct(
      @PathVariable Long id, @Valid @RequestBody AdminProductUpdateRequest request) {

    return ApiResponse.<AdminProductUpdateResponse>builder()
        .status(200)
        .message("Cập nhật sản phẩm thành công")
        .data(adminProductService.updateProduct(id, request))
        .build();
  }

  @PostMapping("/{productId}/variants")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<ApiResponse<AdminProductVariantResponse>> addVariant(
      @PathVariable Long productId, @Valid @RequestBody ProductVariantCreateRequest request) {

    ApiResponse<AdminProductVariantResponse> response =
        ApiResponse.<AdminProductVariantResponse>builder()
            .status(201)
            .message("Thêm phiên bản thành công")
            .data(adminProductService.addVariant(productId, request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<AdminProductStatusResponse> softDelete(@PathVariable Long id) {

    return ApiResponse.<AdminProductStatusResponse>builder()
        .status(200)
        .message("Ngừng kinh doanh sản phẩm thành công")
        .data(adminProductService.softDelete(id))
        .build();
  }
}
