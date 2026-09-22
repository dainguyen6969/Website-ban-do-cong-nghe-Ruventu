package com.example.dantruventu.Controller.order;

import com.example.dantruventu.DTO.Request.order.AdminDeliveryCancelRequest;
import com.example.dantruventu.DTO.Request.order.AdminDeliveryReturnRequest;
import com.example.dantruventu.DTO.Request.order.AdminDeliveryStatusRequest;
import com.example.dantruventu.DTO.Request.order.AdminDeliveryUpdateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.order.AdminDeliveryResponse.*;
import com.example.dantruventu.Services.order.AdminDeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/deliveries")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDeliveryController {

  private final AdminDeliveryService service;

  @GetMapping
  public ApiResponse<ListData> getList(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "trang_thai_giao_hang", required = false) String trangThai,
      @RequestParam(name = "doi_tac_van_chuyen_id", required = false) Long partnerId,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return success(
        "Lấy danh sách phiếu giao hàng thành công",
        service.getList(keyword, trangThai, partnerId, page, limit));
  }

  @GetMapping("/{id}")
  public ApiResponse<Detail> getDetail(@PathVariable("id") Long id) {
    return success("Lấy chi tiết phiếu giao hàng thành công", service.getDetail(id));
  }

  @PutMapping("/{id}")
  public ApiResponse<Action> update(
      @PathVariable("id") Long id, @Valid @RequestBody AdminDeliveryUpdateRequest request) {

    return success("Cập nhật thông tin phiếu giao hàng thành công", service.update(id, request));
  }

  @PatchMapping("/{id}/status")
  public ApiResponse<Action> changeStatus(
      @PathVariable("id") Long id, @Valid @RequestBody AdminDeliveryStatusRequest request) {

    Action response = service.changeStatus(id, request);

    String message =
        switch (request.getTrangThaiGiaoHang()) {
          case DA_NHAN_HANG -> "Xác nhận bàn giao hàng cho đối tác thành công";
          case DANG_GIAO -> "Cập nhật trạng thái đang giao hàng thành công";
          case GIAO_THANH_CONG -> "Xác nhận giao hàng thành công";
          case GIAO_THAT_BAI -> "Đã ghi nhận giao thất bại và chuyển sang chờ hoàn hàng";
          default -> "Cập nhật trạng thái giao hàng thành công";
        };

    return success(message, response);
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<Action> cancel(
      @PathVariable("id") Long id, @Valid @RequestBody AdminDeliveryCancelRequest request) {

    return success("Hủy phiếu giao hàng thành công", service.cancel(id, request));
  }

  @PostMapping("/{id}/return-receipt")
  public ApiResponse<Action> receiveReturn(
      @PathVariable("id") Long id, @Valid @RequestBody AdminDeliveryReturnRequest request) {

    return success(
        "Xác nhận nhận hàng hoàn và nhập lại kho thành công", service.receiveReturn(id, request));
  }

  private <T> ApiResponse<T> success(String message, T data) {
    return ApiResponse.<T>builder().status(200).message(message).data(data).build();
  }
}
