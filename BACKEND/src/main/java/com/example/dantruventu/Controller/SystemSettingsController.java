package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.SystemSettingsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SystemSettingsController {
  private final SystemSettingsService settings;

  public record Status(boolean maintenance, boolean canManage, int fontSize, String fontFamily) {}

  public record MaintenanceRequest(@NotNull Boolean enabled) {}

  @GetMapping("/system-settings/status")
  public ApiResponse<Status> status(Authentication authentication) {
    NguoiDung user =
        authentication != null && authentication.getPrincipal() instanceof NguoiDung n ? n : null;
    var typography = settings.getTypography();
    return response(
        new Status(
            settings.isMaintenance(),
            SystemSettingsService.isAdmin(user),
            typography.fontSize(),
            typography.fontFamily()));
  }

  @PutMapping("/admin/system-settings/maintenance")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<Status> maintenance(@Valid @RequestBody MaintenanceRequest request) {
    settings.setMaintenance(request.enabled());
    var typography = settings.getTypography();
    return response(
        new Status(request.enabled(), true, typography.fontSize(), typography.fontFamily()));
  }

  @GetMapping("/users/me/typography")
  public ApiResponse<SystemSettingsService.Typography> typography() {
    return response(settings.getTypography());
  }

  @PutMapping("/users/me/typography")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<SystemSettingsService.Typography> typography(
      Authentication authentication, @RequestBody SystemSettingsService.Typography request) {
    return response(settings.saveTypography((NguoiDung) authentication.getPrincipal(), request));
  }

  private <T> ApiResponse<T> response(T data) {
    return ApiResponse.<T>builder().status(200).message("Thành công").data(data).build();
  }
}
