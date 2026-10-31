package com.example.dantruventu.Config;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.SystemSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class MaintenanceConfig implements WebMvcConfigurer, HandlerInterceptor {
  private final SystemSettingsService settings;
  private static final Set<String> ENTRY_POINTS =
      Set.of(
          "/api/v1/system-settings/status", "/api/v1/auth/login",
          "/api/v1/auth/refresh", "/api/v1/auth/logout");

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(this).addPathPatterns("/api/**");
  }

  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {
    String path = request.getServletPath();
    if ("OPTIONS".equals(request.getMethod())
        || ENTRY_POINTS.contains(path)
        || !settings.isMaintenance()) return true;

    var authentication = SecurityContextHolder.getContext().getAuthentication();
    NguoiDung user =
        authentication != null && authentication.getPrincipal() instanceof NguoiDung n ? n : null;
    if (!SystemSettingsService.isAdmin(user) || isPurchase(request.getMethod(), path)) {
      throw SystemSettingsService.maintenanceError();
    }
    return true;
  }

  static boolean isPurchase(String method, String path) {
    if (!"POST".equals(method)) return false;
    return path.equals("/api/v1/orders/checkout")
        || path.equals("/api/v1/admin/pos/checkout")
        || path.equals("/api/v1/admin/orders")
        || path.matches("/api/v1/admin/orders/[^/]+/payment/confirm");
  }
}
