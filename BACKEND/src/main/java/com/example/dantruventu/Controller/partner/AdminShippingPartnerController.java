package com.example.dantruventu.Controller.partner;

import com.example.dantruventu.DTO.Request.partner.AdminShippingPartnerCreateRequest;
import com.example.dantruventu.DTO.Request.partner.AdminShippingPartnerStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingDeliveryListResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerListResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerStatusResponse;
import com.example.dantruventu.Services.AdminShippingPartnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/shipping-partners")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminShippingPartnerController {

  private final AdminShippingPartnerService service;

  @GetMapping
  public ApiResponse<AdminShippingPartnerListResponse> getPartners(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "loai_doi_tac", required = false) String loaiDoiTac,
      @RequestParam(name = "trang_thai", required = false) Short trangThai,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminShippingPartnerListResponse>builder()
        .status(200)
        .message("Lấy danh sách đối tác vận chuyển thành công")
        .data(service.getPartners(keyword, loaiDoiTac, trangThai, page, limit))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminShippingPartnerResponse>> create(
      @Valid @RequestBody AdminShippingPartnerCreateRequest request) {

    var response =
        ApiResponse.<AdminShippingPartnerResponse>builder()
            .status(201)
            .message("Thêm đối tác vận chuyển thành công")
            .data(service.create(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminShippingPartnerResponse> getDetail(@PathVariable("id") Long id) {

    return ApiResponse.<AdminShippingPartnerResponse>builder()
        .status(200)
        .message("Lấy chi tiết đối tác vận chuyển thành công")
        .data(service.getDetail(id))
        .build();
  }

  @GetMapping("/{id}/deliveries")
  public ApiResponse<AdminShippingDeliveryListResponse> getDeliveries(
      @PathVariable("id") Long id,
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "trang_thai_giao_hang", required = false) String trangThaiGiaoHang,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminShippingDeliveryListResponse>builder()
        .status(200)
        .message("Lấy danh sách giao hàng của đối tác thành công")
        .data(service.getDeliveries(id, keyword, trangThaiGiaoHang, page, limit))
        .build();
  }

  @PatchMapping("/{id}/status")
  public ApiResponse<AdminShippingPartnerStatusResponse> updateStatus(
      @PathVariable("id") Long id, @Valid @RequestBody AdminShippingPartnerStatusRequest request) {

    var data = service.updateStatus(id, request);

    String message =
        data.getTrangThai() == 0
            ? "Ngừng hoạt động đối tác vận chuyển thành công"
            : "Khôi phục hoạt động đối tác vận chuyển thành công";

    return ApiResponse.<AdminShippingPartnerStatusResponse>builder()
        .status(200)
        .message(message)
        .data(data)
        .build();
  }
}
