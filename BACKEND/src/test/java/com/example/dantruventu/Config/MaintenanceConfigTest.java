package com.example.dantruventu.Config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Services.SystemSettingsService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class MaintenanceConfigTest {
  private final SystemSettingsService settings = mock(SystemSettingsService.class);
  private final MaintenanceConfig gate = new MaintenanceConfig(settings);

  @AfterEach
  void clear() {
    SecurityContextHolder.clearContext();
  }

  private void role(String role) {
    var user =
        NguoiDung.builder()
            .vaiTro(VaiTro.builder().tenVaiTro(role).build())
            .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
            .build();
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
  }

  private boolean request(String method, String path) {
    var request = new MockHttpServletRequest(method, path);
    request.setServletPath(path);
    return gate.preHandle(request, new MockHttpServletResponse(), new Object());
  }

  @Test
  void anonymousAndExistingUserSessionsAreBlockedWhileAdminCanDisableMaintenance() {
    when(settings.isMaintenance()).thenReturn(true);
    assertThrows(AppException.class, () -> request("GET", "/api/v1/products"));
    role("USER");
    assertThrows(AppException.class, () -> request("GET", "/api/v1/users/me"));
    role("ADMIN");
    assertTrue(request("PUT", "/api/v1/admin/system-settings/maintenance"));
    assertTrue(request("GET", "/api/v1/users/me"));
    role("STAFF");
    assertThrows(AppException.class, () -> request("GET", "/api/v1/products"));
  }

  @Test
  void everyPurchasePathIsBlockedEvenForAdminAndWorksAgainWhenDisabled() {
    role("ADMIN");
    var paths =
        List.of(
            "/api/v1/orders/checkout",
            "/api/v1/admin/orders",
            "/api/v1/admin/pos/checkout",
            "/api/v1/admin/orders/123/payment/confirm");
    when(settings.isMaintenance()).thenReturn(true);
    for (String path : paths) {
      var error = assertThrows(AppException.class, () -> request("POST", path));
      assertEquals(503, error.getErrorCode().getStatus().value());
      assertEquals("SYSTEM_MAINTENANCE", error.getCode());
    }
    when(settings.isMaintenance()).thenReturn(false);
    for (String path : paths) assertTrue(request("POST", path));
  }

  @Test
  void recoveryEntryPointsStayAvailableForTheirOwnCredentialChecks() {
    when(settings.isMaintenance()).thenReturn(true);
    assertTrue(request("GET", "/api/v1/system-settings/status"));
    assertTrue(request("POST", "/api/v1/auth/login"));
    assertTrue(request("POST", "/api/v1/auth/refresh"));
    assertTrue(request("POST", "/api/v1/auth/logout"));
    assertTrue(request("OPTIONS", "/api/v1/products"));
  }
}
