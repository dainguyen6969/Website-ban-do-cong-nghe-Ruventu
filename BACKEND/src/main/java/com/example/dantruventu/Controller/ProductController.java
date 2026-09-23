package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.ProductDetailResponse;
import com.example.dantruventu.DTO.Response.ProductListResponse;
import com.example.dantruventu.DTO.Response.ProductVariantDetailResponse;
import com.example.dantruventu.Services.ProductService;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

  private final ProductService productService;

  @GetMapping
  public ResponseEntity<ApiResponse<ProductListResponse>> getProducts(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "gia_min", required = false) BigDecimal giaMin,
      @RequestParam(name = "gia_max", required = false) BigDecimal giaMax,
      @RequestParam(name = "thuong_hieu_id", required = false) Long thuongHieuId,
      @RequestParam(name = "danh_muc_id", required = false) Long danhMucId,
      @RequestParam(name = "ton_kho", required = false) Boolean tonKho,
      @RequestParam(defaultValue = "0") Integer page,
      @RequestParam(defaultValue = "20") Integer limit,
      @RequestParam(defaultValue = "moi_nhat") String sort) {

    ProductListResponse data =
        productService.getProducts(
            keyword, giaMin, giaMax, thuongHieuId, danhMucId, tonKho, page, limit, sort);

    ApiResponse<ProductListResponse> response =
        ApiResponse.<ProductListResponse>builder()
            .status(200)
            .message("Lấy danh sách sản phẩm thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<ProductDetailResponse>> getProductDetail(
      @PathVariable Long id) {

    ProductDetailResponse data = productService.getProductDetail(id);

    ApiResponse<ProductDetailResponse> response =
        ApiResponse.<ProductDetailResponse>builder()
            .status(200)
            .message("Lấy chi tiết sản phẩm thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }

  @GetMapping("/{id}/variants/{variantId}")
  public ResponseEntity<ApiResponse<ProductVariantDetailResponse>> getProductVariantDetail(
      @PathVariable Long id, @PathVariable Long variantId) {

    ProductVariantDetailResponse data = productService.getProductVariantDetail(id, variantId);

    ApiResponse<ProductVariantDetailResponse> response =
        ApiResponse.<ProductVariantDetailResponse>builder()
            .status(200)
            .message("Lấy phiên bản sản phẩm thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }
}
