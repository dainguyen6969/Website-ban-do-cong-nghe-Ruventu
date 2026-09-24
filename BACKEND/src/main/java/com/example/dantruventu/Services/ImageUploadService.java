// Owns validation and the backend-to-Cloudinary leg of the standard image round-trip.
package com.example.dantruventu.Services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.dantruventu.DTO.Response.media.ImageUploadResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Uploads validated admin images to Cloudinary and returns the durable HTTPS URL stored in DB
 * fields.
 */
@Service
@RequiredArgsConstructor
public class ImageUploadService {

  private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
  private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
  private static final Set<String> ALLOWED_FOLDERS =
      Set.of("products", "categories", "brands", "general");

  private final Cloudinary cloudinary;

  /**
   * Completes file -> backend -> Cloudinary; callers persist the returned URL with their record.
   */
  public ImageUploadResponse upload(MultipartFile file, String requestedFolder) {
    validate(file);
    String folder = ALLOWED_FOLDERS.contains(requestedFolder) ? requestedFolder : "general";

    try {
      Map<?, ?> result =
          cloudinary
              .uploader()
              .upload(
                  file.getBytes(),
                  ObjectUtils.asMap(
                      "folder", "ruventu/" + folder,
                      "resource_type", "image",
                      "use_filename", false,
                      "unique_filename", true,
                      "overwrite", false));

      String url = String.valueOf(result.get("secure_url"));
      String publicId = String.valueOf(result.get("public_id"));
      if (url.isBlank() || "null".equals(url)) {
        throw new AppException(ErrorCode.CONFLICT, "Cloudinary khong tra ve URL anh");
      }
      return ImageUploadResponse.builder().url(url).publicId(publicId).build();
    } catch (IOException | RuntimeException exception) {
      if (exception instanceof AppException appException) {
        throw appException;
      }
      throw new AppException(ErrorCode.CONFLICT, "Khong the tai anh len Cloudinary");
    }
  }

  private void validate(MultipartFile file) {
    if (file == null || file.isEmpty() || !ALLOWED_TYPES.contains(file.getContentType())) {
      throw new AppException(ErrorCode.INVALID_DATA, "Anh phai la tep JPG, PNG hoac WEBP");
    }
    if (file.getSize() > MAX_FILE_SIZE) {
      throw new AppException(ErrorCode.INVALID_DATA, "Anh khong duoc vuot qua 5 MB");
    }
  }
}
