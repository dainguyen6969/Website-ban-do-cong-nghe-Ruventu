// REST boundary for real admin product operations in the IntelliJ/Spring backend.
package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.product.AdminProductCreateRequest;
import com.example.dantruventu.DTO.Request.product.AdminProductUpdateRequest;
import com.example.dantruventu.DTO.Request.product.ProductVariantCreateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.product.*;
import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminProductService;
import com.example.dantruventu.Services.AdminRoleService;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

  private final AdminProductService adminProductService;
  private final AdminRoleService adminRoleService;

  @GetMapping
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'san_pham', 'xem')")
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
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'san_pham', 'xem')")
  public ApiResponse<AdminProductDetailResponse> getDetail(@PathVariable Long id) {

    return ApiResponse.<AdminProductDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết sản phẩm thành công")
        .data(adminProductService.getProductDetail(id))
        .build();
  }

  @GetMapping("/{id}/inventory-summary")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'kho_hang', 'xem')")
  public ApiResponse<Map<String, Object>> inventorySummary(@PathVariable Long id) {
    var product = adminProductService.getProductDetail(id);
    var variants =
        product.getDanhSachPhienBan().stream()
            .map(
                variant -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("id", variant.getId());
                  row.put("ten_phien_ban", variant.getTenPhienBan());
                  row.put("ma_vach", variant.getMaVach());
                  row.put("trang_thai", variant.getTrangThai());
                  return row;
                })
            .toList();

    Map<String, Object> data = new LinkedHashMap<>();
    data.put("id", product.getId());
    data.put("ma_san_pham", product.getMaSanPham());
    data.put("ten_san_pham", product.getTenSanPham());
    data.put("trang_thai", product.getTrangThai());
    data.put("thuong_hieu", product.getThuongHieu());
    data.put("danh_muc", product.getDanhMuc());
    data.put("anh_san_pham", product.getAnhSanPham());
    data.put("danh_sach_phien_ban", variants);

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy thông tin sản phẩm của kho")
        .data(data)
        .build();
  }

  @PostMapping
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'san_pham', 'them')")
  public ResponseEntity<ApiResponse<AdminProductCreateResponse>> createProduct(
      @Valid @RequestBody AdminProductCreateRequest request,
      @AuthenticationPrincipal NguoiDung actor) {
    if (request.getLoaiSanPham() == LoaiSanPham.BO_PC
        && !adminRoleService.hasModuleAction(actor, "combo_san_pham", "them")) {
      throw new AppException(ErrorCode.FORBIDDEN);
    }

    ApiResponse<AdminProductCreateResponse> response =
        ApiResponse.<AdminProductCreateResponse>builder()
            .status(201)
            .message("Tạo sản phẩm thành công")
            .data(adminProductService.createProduct(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PutMapping("/{id}")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'san_pham', 'sua')")
  public ApiResponse<AdminProductUpdateResponse> updateProduct(
      @PathVariable Long id,
      @Valid @RequestBody AdminProductUpdateRequest request,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<AdminProductUpdateResponse>builder()
        .status(200)
        .message("Cập nhật sản phẩm thành công")
        .data(
            adminProductService.updateProduct(
                id, request, adminRoleService.hasModuleAction(actor, "combo_san_pham", "sua")))
        .build();
  }

  @PostMapping("/{productId}/variants")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'san_pham', 'sua')")
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

  @PutMapping("/{productId}/variants/{variantId}")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'san_pham', 'sua')")
  public ApiResponse<AdminProductVariantResponse> updateVariant(
      @PathVariable Long productId,
      @PathVariable Long variantId,
      @Valid @RequestBody ProductVariantCreateRequest request) {

    return ApiResponse.<AdminProductVariantResponse>builder()
        .status(200)
        .message("Cập nhật phiên bản thành công")
        .data(adminProductService.updateVariant(productId, variantId, request))
        .build();
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'san_pham', 'xoa')")
  public ApiResponse<AdminProductStatusResponse> softDelete(@PathVariable Long id) {

    return ApiResponse.<AdminProductStatusResponse>builder()
        .status(200)
        .message("Ngừng kinh doanh sản phẩm thành công")
        .data(adminProductService.softDelete(id))
        .build();
  }

  @PutMapping("/{productId}/variants/{variantId}/attributes")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'san_pham', 'sua')")
  public ApiResponse<CatalogFields.AttributesResponse> replaceVariantAttributes(
      @PathVariable Long productId,
      @PathVariable Long variantId,
      @RequestBody CatalogFields.AttributesRequest request,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<CatalogFields.AttributesResponse>builder()
        .status(200)
        .message("Cập nhật thuộc tính phiên bản thành công")
        .data(
            adminProductService.replaceVariantAttributes(
                productId,
                variantId,
                request,
                adminRoleService.hasModuleAction(actor, "combo_san_pham", "sua")))
        .build();
  }
}
