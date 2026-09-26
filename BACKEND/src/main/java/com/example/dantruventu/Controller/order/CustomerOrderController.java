package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.CustomerCheckoutRequest;
import com.example.dantruventu.DTO.Request.order.CustomerOrderRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.CustomerOrderResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.order.CustomerOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class CustomerOrderController {

  private static final String GUEST_CART_COOKIE_NAME = "guest_cart_id";

  private final CustomerOrderService customerOrderService;

  @PostMapping("/checkout/preview")
  public ApiResponse<CustomerOrderResponse.Preview> preview(
      Authentication authentication,
      @CookieValue(value = GUEST_CART_COOKIE_NAME, required = false) String guestCartId,
      @Valid @RequestBody CustomerCheckoutRequest.Preview request) {

    NguoiDung user = getAuthenticatedUser(authentication);

    return ApiResponse.<CustomerOrderResponse.Preview>builder()
        .status(200)
        .message("Tính trước đơn hàng thành công")
        .data(customerOrderService.preview(user, guestCartId, request))
        .build();
  }

  @PostMapping("/checkout")
  public ResponseEntity<ApiResponse<CustomerOrderResponse.Created>> checkout(
      Authentication authentication,
      @CookieValue(value = GUEST_CART_COOKIE_NAME, required = false) String guestCartId,
      @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
      @Valid @RequestBody CustomerCheckoutRequest.Checkout request) {

    NguoiDung user = getAuthenticatedUser(authentication);

    CustomerOrderResponse.Created data =
        customerOrderService.checkout(user, guestCartId, idempotencyKey, request);

    ApiResponse<CustomerOrderResponse.Created> response =
        ApiResponse.<CustomerOrderResponse.Created>builder()
            .status(HttpStatus.CREATED.value())
            .message("Tạo đơn hàng thành công")
            .data(data)
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping
  public ApiResponse<CustomerOrderResponse.ListData> getOrders(
      Authentication authentication,
      @RequestParam(name = "trang_thai", required = false) String status,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit,
      @RequestParam(name = "sort", defaultValue = "ngay_tao,desc") String sort) {

    NguoiDung user = getAuthenticatedUser(authentication);

    return ApiResponse.<CustomerOrderResponse.ListData>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy danh sách đơn hàng thành công")
        .data(customerOrderService.getOrders(user, status, page, limit, sort))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<CustomerOrderResponse.Detail> getOrderDetail(
      Authentication authentication, @PathVariable Long id) {

    NguoiDung user = getAuthenticatedUser(authentication);

    return ApiResponse.<CustomerOrderResponse.Detail>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy chi tiết đơn hàng thành công")
        .data(customerOrderService.getOrderDetail(user, id))
        .build();
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<CustomerOrderResponse.Cancelled> cancelOrder(
      Authentication authentication,
      @PathVariable Long id,
      @Valid @RequestBody CustomerOrderRequest.Cancel request) {

    NguoiDung user = getAuthenticatedUser(authentication);

    return ApiResponse.<CustomerOrderResponse.Cancelled>builder()
        .status(HttpStatus.OK.value())
        .message("Hủy đơn hàng thành công")
        .data(customerOrderService.cancelOrder(user, id, request))
        .build();
  }

  @GetMapping("/tracking")
  public ApiResponse<CustomerOrderResponse.Tracking> trackOrder(
      @RequestParam(name = "ma_don_hang") String orderCode,
      @RequestParam(name = "sdt_nguoi_nhan") String recipientPhone) {

    return ApiResponse.<CustomerOrderResponse.Tracking>builder()
        .status(HttpStatus.OK.value())
        .message("Tra cứu đơn hàng thành công")
        .data(customerOrderService.trackOrder(orderCode, recipientPhone))
        .build();
  }

  private NguoiDung getAuthenticatedUser(Authentication authentication) {
    if (authentication != null && authentication.getPrincipal() instanceof NguoiDung user) {
      return user;
    }

    return null;
  }
}
