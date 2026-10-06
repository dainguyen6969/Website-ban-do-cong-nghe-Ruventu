package com.example.dantruventu.Controller.promotion;

import com.example.dantruventu.DTO.Request.promotion.AdminPromotionCreateRequest;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDeleteResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDetailResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionListResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionMutationResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionStatusResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionVariantListResponse;
import com.example.dantruventu.Services.AdminPromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/promotions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
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

  @PutMapping("/{id}")
  public ApiResponse<AdminPromotionMutationResponse> updatePromotion(
      @PathVariable("id") Long id, @Valid @RequestBody AdminPromotionCreateRequest request) {

    return ApiResponse.<AdminPromotionMutationResponse>builder()
        .status(200)
        .message("Cập nhật khuyến mại thành công")
        .data(adminPromotionService.updatePromotion(id, request))
        .build();
  }

  @PatchMapping("/{id}/status")
  public ApiResponse<AdminPromotionStatusResponse> updatePromotionStatus(
      @PathVariable("id") Long id, @Valid @RequestBody AdminPromotionStatusRequest request) {

    String message =
        request.getTrangThai() != null && request.getTrangThai() == 0
            ? "Tạm dừng khuyến mại thành công"
            : "Khôi phục khuyến mại thành công";

    return ApiResponse.<AdminPromotionStatusResponse>builder()
        .status(200)
        .message(message)
        .data(adminPromotionService.updatePromotionStatus(id, request))
        .build();
  }

  @DeleteMapping("/{id}")
  public ApiResponse<AdminPromotionDeleteResponse> deletePromotion(@PathVariable("id") Long id) {

    return ApiResponse.<AdminPromotionDeleteResponse>builder()
        .status(200)
        .message("Xóa khuyến mại thành công")
        .data(adminPromotionService.deletePromotion(id))
        .build();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<AdminPromotionMutationResponse> createPromotion(
      @Valid @RequestBody AdminPromotionCreateRequest request) {

    return ApiResponse.<AdminPromotionMutationResponse>builder()
        .status(HttpStatus.CREATED.value())
        .message("Tạo khuyến mại thành công")
        .data(adminPromotionService.createPromotion(request))
        .build();
  }

  @GetMapping("/variants")
  public ApiResponse<AdminPromotionVariantListResponse> getVariants(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminPromotionVariantListResponse>builder()
        .status(200)
        .message("Lấy danh sách phiên bản sản phẩm thành công")
        .data(adminPromotionService.getVariants(keyword, page, limit))
        .build();
  }

  @GetMapping
  public ApiResponse<AdminPromotionListResponse> getPromotions(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "phuong_thuc_khuyen_mai", required = false) String promotionMethod,
      @RequestParam(name = "trang_thai", required = false) Integer status,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminPromotionListResponse>builder()
        .status(200)
        .message("Lấy danh sách khuyến mại thành công")
        .data(adminPromotionService.getPromotions(keyword, promotionMethod, status, page, limit))
        .build();
  }
}
