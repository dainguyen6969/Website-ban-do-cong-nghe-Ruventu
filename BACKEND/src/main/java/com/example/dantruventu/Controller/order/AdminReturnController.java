package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnCreateRequest;
import com.example.dantruventu.DTO.Request.order.AdminReturnReceiveRequest;
import com.example.dantruventu.DTO.Request.order.AdminReturnRefundRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminReturnResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Services.order.AdminReturnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/returns")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReturnController {

  private final AdminReturnService adminReturnService;

  @PostMapping("/{id}/refund")
  public ApiResponse<AdminReturnResponse.RefundResponse> refund(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
      @Valid @RequestBody AdminReturnRefundRequest request,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<AdminReturnResponse.RefundResponse>builder()
        .status(200)
        .message("Ghi nhận hoàn tiền thành công")
        .data(adminReturnService.refund(id, idempotencyKey, request, actor))
        .build();
  }

  @PostMapping("/{id}/receive")
  public ApiResponse<AdminReturnResponse.ReceiveResponse> receive(
      @PathVariable("id") Long id,
      @Valid @RequestBody AdminReturnReceiveRequest request,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<AdminReturnResponse.ReceiveResponse>builder()
        .status(200)
        .message("Nhận hàng trả thành công")
        .data(
            adminReturnService.receive(
                id,
                request,
                actor == null ? null : actor.getId()))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminReturnResponse.DetailResponse> getReturnDetail(
      @PathVariable("id") Long id) {

    return ApiResponse.<AdminReturnResponse.DetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết phiếu trả thành công")
        .data(adminReturnService.getReturnDetail(id))
        .build();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<AdminReturnResponse.CreateResponse> create(
      @Valid @RequestBody AdminReturnCreateRequest request,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<AdminReturnResponse.CreateResponse>builder()
        .status(HttpStatus.CREATED.value())
        .message("Tạo phiếu trả thành công")
        .data(
            adminReturnService.create(
                request,
                actor == null ? null : actor.getId()))
        .build();
  }

  @GetMapping("/eligible-orders/{orderId}")
  public ApiResponse<AdminReturnResponse.EligibleOrderDetailResponse> getEligibleOrderDetail(
      @PathVariable("orderId") Long orderId) {

    return ApiResponse.<AdminReturnResponse.EligibleOrderDetailResponse>builder()
        .status(200)
        .message("Lấy thông tin tạo phiếu trả hàng thành công")
        .data(adminReturnService.getEligibleOrderDetail(orderId))
        .build();
  }

  @GetMapping("/eligible-orders")
  public ApiResponse<AdminReturnResponse.EligibleOrderListResponse> getEligibleOrders(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminReturnResponse.EligibleOrderListResponse>builder()
        .status(200)
        .message("Lấy danh sách đơn hàng có thể trả thành công")
        .data(adminReturnService.getEligibleOrders(keyword, page, limit))
        .build();
  }

  @GetMapping
  public ApiResponse<AdminReturnResponse.ListResponse> getReturns(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "trang_thai_tra_hang", required = false)
          TrangThaiTraHang returnStatus,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminReturnResponse.ListResponse>builder()
        .status(200)
        .message("Lấy danh sách phiếu trả hàng thành công")
        .data(adminReturnService.getReturns(keyword, returnStatus, page, limit))
        .build();
  }
}
