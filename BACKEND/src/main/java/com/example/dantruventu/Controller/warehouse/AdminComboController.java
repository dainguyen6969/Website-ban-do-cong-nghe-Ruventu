package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminComboCreateRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminComboUpdateRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warehouse.*;
import com.example.dantruventu.Services.AdminComboService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/combos")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminComboController {

  private final AdminComboService adminComboService;

  @GetMapping
  public ApiResponse<AdminComboListResponse> getCombos(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) Short trangThai,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminComboListResponse>builder()
        .status(200)
        .message("Lấy danh sách Combo thành công")
        .data(adminComboService.getCombos(keyword, trangThai, page, limit))
        .build();
  }

  @GetMapping("/component-options")
  public ApiResponse<AdminComboComponentOptionListResponse> getComponentOptions(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminComboComponentOptionListResponse>builder()
        .status(200)
        .message("Lấy danh sách phiên bản thành phần thành công")
        .data(adminComboService.getComponentOptions(keyword, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminComboDetailResponse> getDetail(@PathVariable("id") Long id) {

    return ApiResponse.<AdminComboDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết Combo thành công")
        .data(adminComboService.getDetail(id))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminComboMutationResponse>> create(
      @Valid @RequestBody AdminComboCreateRequest request) {

    var response =
        ApiResponse.<AdminComboMutationResponse>builder()
            .status(201)
            .message("Thêm combo thành công")
            .data(adminComboService.create(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PutMapping("/{id}")
  public ApiResponse<AdminComboMutationResponse> update(
      @PathVariable("id") Long id, @Valid @RequestBody AdminComboUpdateRequest request) {

    return ApiResponse.<AdminComboMutationResponse>builder()
        .status(200)
        .message("Cập nhật Combo thành công")
        .data(adminComboService.update(id, request))
        .build();
  }

  @DeleteMapping("/{id}")
  public ApiResponse<AdminComboStatusResponse> delete(@PathVariable("id") Long id) {

    return ApiResponse.<AdminComboStatusResponse>builder()
        .status(200)
        .message("Ngừng kinh doanh Combo thành công")
        .data(adminComboService.softDelete(id))
        .build();
  }
}
