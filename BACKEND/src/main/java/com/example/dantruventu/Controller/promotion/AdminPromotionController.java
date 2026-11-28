package com.example.dantruventu.Controller.promotion;

import com.example.dantruventu.DTO.Request.promotion.AdminPromotionConfigurationCreateRequest;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionStatusRequest;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionUpdateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionCreateResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDeleteResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDetailResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionListResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionVariantListResponse;
import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiHienThiKhuyenMai;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminPromotionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/promotions")
@RequiredArgsConstructor
@PreAuthorize("@adminRoleService.hasModuleAction(principal, 'khuyen_mai', 'xem')")
public class AdminPromotionController {

  private final AdminPromotionService adminPromotionService;

  @GetMapping("/{id}")
  public ApiResponse<AdminPromotionDetailResponse> getPromotionDetail(@PathVariable("id") Long id) {

    return ApiResponse.<AdminPromotionDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết khuyến mại thành công")
        .data(adminPromotionService.getPromotionDetail(id))
        .build();
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'khuyen_mai', 'sua')")
  public ApiResponse<AdminPromotionDetailResponse> updatePromotion(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String requestKey,
      @Valid @RequestBody AdminPromotionUpdateRequest request) {

    return ApiResponse.<AdminPromotionDetailResponse>builder()
        .status(200)
        .message("Cập nhật khuyến mại thành công")
        .data(adminPromotionService.updatePromotion(id, requestKey, request))
        .build();
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'khuyen_mai', 'sua')")
  public ApiResponse<AdminPromotionDetailResponse> updatePromotionStatus(
      @PathVariable("id") Long id, @Valid @RequestBody AdminPromotionStatusRequest request) {

    var result = adminPromotionService.updatePromotionStatus(id, request);
    return ApiResponse.<AdminPromotionDetailResponse>builder()
        .status(200)
        .message(result.message())
        .data(result.data())
        .build();
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'khuyen_mai', 'xoa')")
  public ApiResponse<AdminPromotionDeleteResponse> deletePromotion(@PathVariable("id") Long id) {

    return ApiResponse.<AdminPromotionDeleteResponse>builder()
        .status(200)
        .message("Xóa khuyến mại thành công")
        .data(adminPromotionService.deletePromotion(id))
        .build();
  }

  @PostMapping
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'khuyen_mai', 'them')")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<AdminPromotionCreateResponse> createPromotion(
      @RequestHeader("Idempotency-Key") String requestKey,
      @Valid @RequestBody AdminPromotionConfigurationCreateRequest request) {

    return ApiResponse.<AdminPromotionCreateResponse>builder()
        .status(HttpStatus.CREATED.value())
        .message("Tạo khuyến mại thành công")
        .data(adminPromotionService.createPromotion(requestKey, request))
        .build();
  }

  @GetMapping("/variants")
  @PreAuthorize(
      "@adminRoleService.hasModuleAction(principal, 'khuyen_mai', 'them')"
          + " or @adminRoleService.hasModuleAction(principal, 'khuyen_mai', 'sua')")
  public ApiResponse<AdminPromotionVariantListResponse> getVariants(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "danh_muc_id", required = false) Long categoryId,
      @RequestParam(name = "thuong_hieu_id", required = false) Long brandId,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit,
      HttpServletRequest request) {

    if (request.getParameterMap().containsKey("kho_hang_id")) {
      throw new AppException(
          ErrorCode.INVALID_DATA,
          "Danh sách sản phẩm sử dụng kho mặc định. Vui lòng bỏ lựa chọn kho khác.");
    }

    return ApiResponse.<AdminPromotionVariantListResponse>builder()
        .status(200)
        .message("Lấy phiên bản cho khuyến mại thành công")
        .data(adminPromotionService.getVariants(keyword, categoryId, brandId, page, limit))
        .build();
  }

  @GetMapping
  public ApiResponse<AdminPromotionListResponse> getPromotions(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "phuong_thuc_khuyen_mai", required = false) String promotionMethod,
      @RequestParam(name = "doi_tuong_khuyen_mai", required = false) DoiTuongKhuyenMai target,
      @RequestParam(name = "trang_thai", required = false) Integer status,
      @RequestParam(name = "trang_thai_hien_thi", required = false)
          TrangThaiHienThiKhuyenMai displayStatus,
      @RequestParam(name = "tu_ngay", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate from,
      @RequestParam(name = "den_ngay", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate to,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminPromotionListResponse>builder()
        .status(200)
        .message("Lấy danh sách khuyến mại thành công")
        .data(
            adminPromotionService.getPromotions(
                keyword, promotionMethod, target, status, displayStatus, from, to, page, limit))
        .build();
  }
}
