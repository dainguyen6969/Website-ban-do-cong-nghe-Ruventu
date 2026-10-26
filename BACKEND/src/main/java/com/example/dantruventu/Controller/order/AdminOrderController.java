package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminDeliveryReturnRequest;
import com.example.dantruventu.DTO.Request.order.AdminOrderRequest;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminOrderResponse;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Services.order.AdminDeliveryService;
import com.example.dantruventu.Services.order.AdminOrderService;
import com.example.dantruventu.Services.order.OrderWebSocket;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {

  private final AdminSalesService salesService;
  private final AdminOrderService orderService;
  private final OrderWebSocket orderWebSocket;
  private final AdminDeliveryService deliveryService;

  @PostMapping("/{id}/counter-exchange")
  public ApiResponse<AdminOrderResponse.Action> counterExchange(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key") String key,
      @Valid @RequestBody AdminOrderRequest.CounterExchange request) {

    return ok("Đổi 1-1 lỗi tại quầy thành công", orderService.counterExchange(id, key, request));
  }

  @PostMapping("/{id}/counter-inspection/complete")
  public ApiResponse<AdminOrderResponse.Action> completeCounterInspection(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key") String key,
      @Valid @RequestBody AdminOrderRequest.Confirm request) {

    return ok(
        "Đã kết thúc kiểm tra tại quầy", orderService.completeCounterInspection(id, key, request));
  }

  @PostMapping("/realtime-ticket")
  public ApiResponse<java.util.Map<String, String>> realtimeTicket(
      @RequestHeader("Authorization") String authorization) {
    return ok(
        "Kết nối cập nhật đơn hàng",
        java.util.Map.of("ticket", orderWebSocket.issueTicket(authorization.substring(7))));
  }

  @GetMapping
  public ApiResponse<AdminSalesResponse.PageData<AdminOrderResponse.ListItem>> list(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "loai_don_hang", required = false) LoaiDonHang type,
      @RequestParam(name = "trang_thai_don_hang", required = false) TrangThaiDonHang orderStatus,
      @RequestParam(name = "trang_thai_thanh_toan", required = false)
          TrangThaiThanhToanDonHang paymentStatus,
      @RequestParam(name = "trang_thai_dong_goi", required = false) TrangThaiDongGoi packingStatus,
      @RequestParam(name = "trang_thai_xuat_kho", required = false) TrangThaiXuatKho stockStatus,
      @RequestParam(name = "tu_ngay", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate from,
      @RequestParam(name = "den_ngay", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate to,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit,
      @RequestParam(name = "sort", defaultValue = "ngay_tao,desc") String sort) {

    return ok(
        "Lấy danh sách đơn hàng thành công",
        orderService.list(
            keyword,
            type,
            orderStatus,
            paymentStatus,
            packingStatus,
            stockStatus,
            from,
            to,
            page,
            limit,
            sort));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminSalesResponse.Order>> create(
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody AdminSalesRequest.Online request) {

    return ResponseEntity.status(201)
        .body(
            ApiResponse.<AdminSalesResponse.Order>builder()
                .status(201)
                .message("Tạo đơn hàng Online thành công")
                .data(salesService.createOnline(key, request))
                .build());
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','QUAN_LY','NHAN_VIEN_BAN_HANG')")
  public ApiResponse<AdminSalesResponse.Order> detail(@PathVariable("id") Long id) {

    return ok("Lấy chi tiết đơn hàng thành công", orderService.detail(id));
  }

  @GetMapping("/{id}/screen")
  @PreAuthorize("hasAnyRole('ADMIN','QUAN_LY','NHAN_VIEN_BAN_HANG')")
  public ApiResponse<Map<String, Object>> screen(@PathVariable("id") Long id) {

    return ok("Lấy dữ liệu màn hình đơn hàng thành công", orderService.screen(id));
  }

  @PutMapping("/{id}")
  public ApiResponse<AdminOrderResponse.Action> update(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody AdminSalesRequest.Online request) {

    return ok("Cập nhật đơn hàng thành công", orderService.update(id, key, request));
  }

  @PostMapping("/{id}/approve")
  public ApiResponse<AdminOrderResponse.Action> approve(
      @PathVariable("id") Long id, @Valid @RequestBody AdminOrderRequest.Confirm request) {

    return ok("Đã kiểm tra hàng và cập nhật trạng thái đơn", orderService.approve(id));
  }

  @PostMapping("/{id}/stock/retry")
  public ApiResponse<AdminOrderResponse.Action> retryWaitingStock(
      @PathVariable("id") Long id, @Valid @RequestBody AdminOrderRequest.Confirm request) {

    return ok("Đã kiểm tra hàng", orderService.retryWaitingStock(id));
  }

  @PostMapping("/{id}/stock/reserve")
  public ApiResponse<AdminOrderResponse.Action> reserveWaitingStock(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminOrderRequest.Confirm request) {

    return ok(
        "Đã kiểm tra và cập nhật số lượng giữ cho đơn chờ hàng",
        orderService.reserveWaitingStock(id, idempotencyKey, request));
  }

  @PostMapping("/{id}/fulfillment")
  public ApiResponse<AdminOrderResponse.Action> fulfillment(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminOrderRequest.Fulfillment request) {

    return ok(
        "Bắt đầu xử lý đơn hàng thành công", orderService.fulfillment(id, idempotencyKey, request));
  }

  @PatchMapping("/{id}/packing-status")
  public ApiResponse<AdminOrderResponse.Action> packing(
      @PathVariable("id") Long id, @Valid @RequestBody AdminOrderRequest.Packing request) {

    return ok("Cập nhật đóng gói thành công", orderService.packing(id, request));
  }

  @PostMapping("/{id}/delivery/start")
  public ApiResponse<AdminOrderResponse.Action> startDelivery(
      @PathVariable("id") Long id, @Valid @RequestBody AdminOrderRequest.DeliveryStart request) {
    return ok("Bắt đầu giao hàng thành công", orderService.startDelivery(id, request));
  }

  @GetMapping("/{id}/history")
  @PreAuthorize("hasAnyRole('ADMIN','QUAN_LY','NHAN_VIEN_BAN_HANG')")
  public ApiResponse<java.util.List<AdminOrderResponse.History>> history(
      @PathVariable("id") Long id) {
    return ok("Lấy lịch sử xử lý thành công", orderService.history(id));
  }

  @GetMapping("/{id}/warehouse/serial-requirements")
  public ApiResponse<AdminOrderResponse.Requirements> requirements(@PathVariable("id") Long id) {

    return ok("Lấy yêu cầu serial thành công", orderService.requirements(id));
  }

  @GetMapping("/{id}/packing/serials")
  public ApiResponse<Map<String, Object>> packingSerials(@PathVariable("id") Long id) {

    return ok("Lấy serial đóng gói thành công", orderService.packingSerials(id));
  }

  @PostMapping("/{id}/packing/serials")
  public ApiResponse<AdminOrderResponse.Action> savePackingSerials(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody AdminOrderRequest.PackingSerials request) {

    return ok("Lưu serial đóng gói thành công", orderService.savePackingSerials(id, key, request));
  }

  @GetMapping("/{id}/warehouse/serial-candidates")
  public ApiResponse<AdminOrderResponse.Candidates> candidates(
      @PathVariable("id") Long id,
      @RequestParam("chi_tiet_don_hang_id") Long lineId,
      @RequestParam("phien_ban_id") Long variantId,
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "so_serial", required = false) String exact,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ok(
        "Lấy serial khả dụng thành công",
        orderService.candidates(id, lineId, variantId, keyword, exact, page, limit));
  }

  @PostMapping("/{id}/warehouse/export")
  public ApiResponse<AdminOrderResponse.Action> export(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminOrderRequest.Export request) {

    return ok("Xuất kho thành công", orderService.export(id, idempotencyKey, request));
  }

  @PostMapping("/{id}/payment/confirm")
  public ApiResponse<AdminOrderResponse.Action> payment(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminOrderRequest.Payment request) {

    return ok(
        "Xác nhận thanh toán đơn hàng thành công",
        orderService.confirmPayment(id, idempotencyKey, request));
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<AdminOrderResponse.Action> cancel(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminOrderRequest.Cancel request) {

    return ok("Hủy đơn hàng thành công", orderService.cancel(id, idempotencyKey, request));
  }

  @PostMapping("/{id}/pickup/confirm")
  public ApiResponse<AdminOrderResponse.Action> pickup(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminOrderRequest.Pickup request) {

    return ok(
        "Xác nhận khách nhận hàng thành công", orderService.pickup(id, idempotencyKey, request));
  }

  @PostMapping("/{id}/refund")
  public ApiResponse<AdminOrderResponse.Action> refund(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminOrderRequest.Refund request) {

    return ok(
        "Ghi nhận hoàn tiền đơn hàng thành công", orderService.refund(id, idempotencyKey, request));
  }

  @GetMapping("/{id}/refund-options")
  public ApiResponse<Map<String, Object>> refundOptions(@PathVariable("id") Long id) {

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy thông tin hoàn tiền của đơn hàng thành công")
        .data(orderService.refundOptions(id))
        .build();
  }

  private <T> ApiResponse<T> ok(String message, T data) {
    return ApiResponse.<T>builder().status(200).message(message).data(data).build();
  }

  @GetMapping("/{id}/pre-handover-return-requirements")
  public ApiResponse<Map<String, Object>> preHandoverReturnRequirements(
      @PathVariable("id") Long id) {

    return ok(
        "Lấy yêu cầu nhận lại hàng trước bàn giao thành công",
        deliveryService.preHandoverReturnRequirements(id));
  }

  @PostMapping("/{id}/cancel-before-handover")
  public ApiResponse<Map<String, Object>> cancelBeforeHandover(
      @PathVariable("id") Long id,
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody AdminDeliveryReturnRequest request) {

    return ok(
        "Đã hủy đơn và nhận lại đủ hàng", deliveryService.cancelBeforeHandover(id, key, request));
  }
}
