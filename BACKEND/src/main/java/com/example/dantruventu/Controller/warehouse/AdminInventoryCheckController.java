package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminInventoryCheckCreateRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminInventoryCheckCancelRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminInventoryCheckUpdateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckCancelResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckBalanceResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckCreateResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckDetailResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckProductListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckUpdateResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiPhieuKiemKho;
import com.example.dantruventu.Services.AdminInventoryCheckService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/inventory-checks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminInventoryCheckController {

  private final AdminInventoryCheckService adminInventoryCheckService;

  @GetMapping("/products")
  public ApiResponse<AdminInventoryCheckProductListResponse> searchProducts(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminInventoryCheckProductListResponse>builder()
        .status(200)
        .message("Tìm kiếm sản phẩm kiểm hàng thành công")
        .data(adminInventoryCheckService.searchProducts(keyword, page, limit))
        .build();
  }

  @GetMapping
  public ApiResponse<AdminInventoryCheckListResponse> getInventoryChecks(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false)
          TrangThaiPhieuKiemKho status,
      @RequestParam(name = "nguoi_kiem_id", required = false) Long checkerId,
      @RequestParam(name = "from_date", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate fromDate,
      @RequestParam(name = "to_date", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate toDate,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit,
      @RequestParam(name = "sort", defaultValue = "ngay_tao,desc") String sort) {

    return ApiResponse.<AdminInventoryCheckListResponse>builder()
        .status(200)
        .message("Lấy danh sách phiếu kiểm hàng thành công")
        .data(
            adminInventoryCheckService.getInventoryChecks(
                keyword,
                status,
                checkerId,
                fromDate,
                toDate,
                page,
                limit,
                sort))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminInventoryCheckDetailResponse> getDetail(
      @PathVariable("id") Long id) {

    return ApiResponse.<AdminInventoryCheckDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết phiếu kiểm hàng thành công")
        .data(adminInventoryCheckService.getDetail(id))
        .build();
  }

  @PutMapping("/{id}")
  public ApiResponse<AdminInventoryCheckUpdateResponse> update(
      @PathVariable("id") Long id,
      @Valid @RequestBody AdminInventoryCheckUpdateRequest request,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<AdminInventoryCheckUpdateResponse>builder()
        .status(200)
        .message("Cập nhật phiếu kiểm hàng thành công")
        .data(
            adminInventoryCheckService.update(
                id,
                request,
                actor == null ? null : actor.getId()))
        .build();
  }

  @PatchMapping("/{id}/cancel")
  public ApiResponse<AdminInventoryCheckCancelResponse> cancel(
      @PathVariable("id") Long id,
      @Valid @RequestBody AdminInventoryCheckCancelRequest request,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<AdminInventoryCheckCancelResponse>builder()
        .status(200)
        .message("Hủy phiếu kiểm hàng thành công")
        .data(
            adminInventoryCheckService.cancel(
                id,
                request,
                actor == null ? null : actor.getId()))
        .build();
  }

  @PostMapping("/{id}/balance")
  public ApiResponse<AdminInventoryCheckBalanceResponse> balance(
      @PathVariable("id") Long id,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<AdminInventoryCheckBalanceResponse>builder()
        .status(200)
        .message("Cân bằng kho thành công")
        .data(
            adminInventoryCheckService.balance(
                id,
                actor == null ? null : actor.getId()))
        .build();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<AdminInventoryCheckCreateResponse> create(
      @Valid @RequestBody AdminInventoryCheckCreateRequest request,
      @AuthenticationPrincipal NguoiDung actor) {

    return ApiResponse.<AdminInventoryCheckCreateResponse>builder()
        .status(HttpStatus.CREATED.value())
        .message("Tạo phiếu kiểm hàng thành công")
        .data(
            adminInventoryCheckService.create(
                request,
                actor == null ? null : actor.getId()))
        .build();
  }
}
