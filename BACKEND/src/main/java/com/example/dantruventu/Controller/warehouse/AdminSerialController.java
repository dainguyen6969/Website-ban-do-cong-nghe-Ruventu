package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminSerialStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warehouse.*;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminSerialService;
import com.example.dantruventu.Services.warehouse.WarehouseOperations;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/serials")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSerialController {

  private final AdminSerialService adminSerialService;
  private final WarehouseOperations warehouseOperations;

  @GetMapping
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'kho_hang', 'xem')")
  public ApiResponse<AdminSerialListResponse> getSerials(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "so_serial", required = false) String soSerial,
      @RequestParam(name = "trang_thai", required = false) TrangThaiSerial trangThai,
      @RequestParam(name = "phien_ban_id", required = false) Long phienBanId,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminSerialListResponse>builder()
        .status(200)
        .message("Lấy danh sách serial thành công")
        .data(adminSerialService.getSerials(keyword, soSerial, trangThai, phienBanId, page, limit))
        .build();
  }

  @GetMapping("/available-for-pos")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'ban_hang_pos', 'xem')")
  public ApiResponse<AdminSerialListResponse> availableForPos(
      @RequestParam("phien_ban_id") Long phienBanId,
      @RequestParam(name = "so_serial", required = false) String soSerial,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {
    var result =
        adminSerialService.getSerials(
            null, soSerial, TrangThaiSerial.TRONG_KHO, phienBanId, page, limit);

    var items =
        result.getItems().stream()
            .map(
                item ->
                    AdminSerialListItemResponse.builder()
                        .id(item.getId())
                        .phienBanId(item.getPhienBanId())
                        .soSerial(item.getSoSerial())
                        .trangThai(item.getTrangThai())
                        .biThuHoi(item.getBiThuHoi())
                        .build())
            .toList();

    return ApiResponse.<AdminSerialListResponse>builder()
        .status(200)
        .message("Lấy serial cho POS")
        .data(
            AdminSerialListResponse.builder()
                .items(items)
                .pagination(result.getPagination())
                .build())
        .build();
  }

  @GetMapping("/warranty-candidates")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'bao_hanh', 'them')")
  public ApiResponse<AdminSerialListResponse> warrantyCandidates(
      @RequestParam("keyword") String keyword,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {
    if (keyword.isBlank()) {
      throw new AppException(ErrorCode.INVALID_PARAM);
    }

    var result = adminSerialService.getSerials(keyword, null, null, null, page, limit);
    var items =
        result.getItems().stream()
            .map(
                item ->
                    AdminSerialListItemResponse.builder()
                        .id(item.getId())
                        .phienBanId(item.getPhienBanId())
                        .soSerial(item.getSoSerial())
                        .tenSanPham(item.getTenSanPham())
                        .tenPhienBan(item.getTenPhienBan())
                        .trangThai(item.getTrangThai())
                        .build())
            .toList();

    return ApiResponse.<AdminSerialListResponse>builder()
        .status(200)
        .message("Lấy serial để tiếp nhận bảo hành")
        .data(
            AdminSerialListResponse.builder()
                .items(items)
                .pagination(result.getPagination())
                .build())
        .build();
  }

  @GetMapping("/{id}")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'kho_hang', 'xem')")
  public ApiResponse<AdminSerialDetailResponse> getDetail(@PathVariable("id") Long id) {

    return ApiResponse.<AdminSerialDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết serial thành công")
        .data(adminSerialService.getDetail(id))
        .build();
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("@adminRoleService.hasModuleAction(principal, 'kho_hang', 'sua')")
  public ApiResponse<AdminSerialStatusResponse> updateStatus(
      @PathVariable("id") Long id,
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody AdminSerialStatusRequest request) {

    return ApiResponse.<AdminSerialStatusResponse>builder()
        .status(200)
        .message("Cập nhật trạng thái serial thành công")
        .data(warehouseOperations.changeSerialStatus(id, idempotencyKey, request))
        .build();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<AdminSerialDeleteBlockedResponse> delete(@PathVariable("id") Long id) {

    return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
        .body(adminSerialService.blockDelete(id));
  }
}
