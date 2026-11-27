// Exposes the shared authenticated upload boundary used by all admin image fields.
package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.media.ImageUploadResponse;
import com.example.dantruventu.Services.ImageUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Shared authenticated endpoint for every current and future admin image field. */
@RestController
@RequestMapping("/api/v1/admin/uploads")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ImageUploadController {

  private final ImageUploadService imageUploadService;

  @PostMapping("/images/warranty-intake")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'bao_hanh', 'them')")
  public ApiResponse<ImageUploadResponse> uploadWarrantyIntakeImage(
      @RequestParam("file") MultipartFile file) {
    return ApiResponse.<ImageUploadResponse>builder()
        .status(200)
        .message("Tải ảnh tiếp nhận bảo hành thành công")
        .data(imageUploadService.upload(file, "general"))
        .build();
  }

  @PostMapping("/images/catalog/{folder:categories|brands}")
  @PreAuthorize(
      "@adminRoleService.hasModuleAction(principal, 'danh_muc', 'them')"
          + " or @adminRoleService.hasModuleAction(principal, 'danh_muc', 'sua')")
  public ApiResponse<ImageUploadResponse> uploadCatalogImage(
      @PathVariable("folder") String folder, @RequestParam("file") MultipartFile file) {
    return ApiResponse.<ImageUploadResponse>builder()
        .status(200)
        .message("Tải ảnh danh mục hoặc thương hiệu thành công")
        .data(imageUploadService.upload(file, folder))
        .build();
  }

  @PostMapping("/images/products")
  @PreAuthorize(
      "@adminRoleService.hasModuleAction(principal, 'san_pham', 'them')"
          + " or @adminRoleService.hasModuleAction(principal, 'san_pham', 'sua')"
          + " or @adminRoleService.hasModuleAction(principal, 'combo_san_pham', 'them')"
          + " or @adminRoleService.hasModuleAction(principal, 'combo_san_pham', 'sua')")
  public ApiResponse<ImageUploadResponse> uploadProductImage(
      @RequestParam("file") MultipartFile file) {
    return ApiResponse.<ImageUploadResponse>builder()
        .status(200)
        .message("Tải ảnh sản phẩm thành công")
        .data(imageUploadService.upload(file, "products"))
        .build();
  }

  @PostMapping("/images")
  public ApiResponse<ImageUploadResponse> uploadImage(
      @RequestParam("file") MultipartFile file,
      @RequestParam(defaultValue = "general") String folder) {
    return ApiResponse.<ImageUploadResponse>builder()
        .status(200)
        .message("Tai anh len Cloudinary thanh cong")
        .data(imageUploadService.upload(file, folder))
        .build();
  }
}
