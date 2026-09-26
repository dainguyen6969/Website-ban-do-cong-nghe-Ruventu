package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.role.CreateRoleRequest;
import com.example.dantruventu.DTO.Request.role.UpdateRoleRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.role.AdminRoleListResponse;
import com.example.dantruventu.DTO.Response.role.RoleListItemResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminRoleService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/roles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRoleController {

  private final AdminRoleService adminRoleService;
  private final ObjectMapper objectMapper;
  private final Validator validator;

  @GetMapping
  public ApiResponse<AdminRoleListResponse> getRoles(
      @RequestParam(required = false) String keyword,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {

    return ApiResponse.<AdminRoleListResponse>builder()
        .status(200)
        .message("Lấy danh sách vai trò thành công")
        .data(adminRoleService.getRoles(keyword, page, limit))
        .build();
  }

  @PostMapping
  public ResponseEntity<ApiResponse<RoleListItemResponse>> createRole(
      @Valid @RequestBody CreateRoleRequest request) {

    var response =
        ApiResponse.<RoleListItemResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Thêm vai trò thành công")
            .data(adminRoleService.createRole(request))
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping("/{id}")
  public ApiResponse<RoleListItemResponse> getRole(@PathVariable Long id) {

    return ApiResponse.<RoleListItemResponse>builder()
        .status(200)
        .message("Lấy chi tiết vai trò thành công")
        .data(adminRoleService.getRole(id))
        .build();
  }

  @PutMapping("/{id}")
  public ApiResponse<RoleListItemResponse> updateRole(
      @PathVariable Long id, @RequestBody JsonNode jsonNode) {

    boolean hasMoTa = jsonNode != null && jsonNode.has("mo_ta");
    UpdateRoleRequest request;
    try {
      request = objectMapper.treeToValue(jsonNode, UpdateRoleRequest.class);
    } catch (Exception e) {
      throw new AppException(
          ErrorCode.ROLE_NAME_REQUIRED, "Tên vai trò để trống hoặc dữ liệu không hợp lệ.");
    }

    if (request == null) {
      throw new AppException(
          ErrorCode.ROLE_NAME_REQUIRED, "Tên vai trò để trống hoặc dữ liệu không hợp lệ.");
    }

    Set<ConstraintViolation<UpdateRoleRequest>> violations = validator.validate(request);
    if (!violations.isEmpty()) {
      throw new AppException(
          ErrorCode.ROLE_NAME_REQUIRED, violations.iterator().next().getMessage());
    }

    return ApiResponse.<RoleListItemResponse>builder()
        .status(200)
        .message("Cập nhật vai trò thành công")
        .data(adminRoleService.updateRole(id, request, hasMoTa))
        .build();
  }
}
