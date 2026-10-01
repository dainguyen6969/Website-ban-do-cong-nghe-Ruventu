// Exposes the shared authenticated upload boundary used by all admin image fields.
package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.media.ImageUploadResponse;
import com.example.dantruventu.Services.ImageUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Shared authenticated endpoint for every current and future admin image field. */
@RestController
@RequestMapping("/api/v1/admin/uploads")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ImageUploadController {

  private final ImageUploadService imageUploadService;

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
