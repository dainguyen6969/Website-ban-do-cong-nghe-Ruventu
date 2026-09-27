package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.employee.CreateEmployeeRequest;
import com.example.dantruventu.DTO.Request.employee.UpdateEmployeeRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.employee.AdminEmployeeListResponse;
import com.example.dantruventu.DTO.Response.employee.EmployeeListItemResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.AdminEmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/employees")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminEmployeeController {

  private final AdminEmployeeService adminEmployeeService;

  @GetMapping
  public ApiResponse<AdminEmployeeListResponse> getEmployees(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai", required = false) Short trangThai,
      @RequestParam(name = "vai_tro_id", required = false) Long vaiTroId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {

    return ApiResponse.<AdminEmployeeListResponse>builder()
        .status(200)
        .message("Lấy danh sách nhân viên thành công")
        .data(adminEmployeeService.getEmployees(keyword, trangThai, vaiTroId, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<EmployeeListItemResponse> getEmployeeDetail(@PathVariable Long id) {

    return ApiResponse.<EmployeeListItemResponse>builder()
        .status(200)
        .message("Lấy chi tiết nhân viên thành công")
        .data(adminEmployeeService.getEmployeeDetail(id))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<EmployeeListItemResponse>> createEmployee(
      @Valid @RequestBody CreateEmployeeRequest request) {

    var response =
        ApiResponse.<EmployeeListItemResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Thêm nhân viên thành công")
            .data(adminEmployeeService.createEmployee(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PutMapping("/{id}")
  public ApiResponse<EmployeeListItemResponse> updateEmployee(
      @PathVariable Long id,
      @Valid @RequestBody UpdateEmployeeRequest request,
      Authentication authentication) {

    Long currentAdminId = null;
    if (authentication != null && authentication.getPrincipal() instanceof NguoiDung principal) {
      currentAdminId = principal.getId();
    }

    return ApiResponse.<EmployeeListItemResponse>builder()
        .status(200)
        .message("Cập nhật nhân viên thành công")
        .data(adminEmployeeService.updateEmployee(id, request, currentAdminId))
        .build();
  }
}
