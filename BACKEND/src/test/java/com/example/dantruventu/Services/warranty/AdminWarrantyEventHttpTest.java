package com.example.dantruventu.Services.warranty;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.*;
import com.example.dantruventu.Controller.warranty.AdminWarrantyController;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Services.JwtService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.core.env.MapPropertySource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;

class AdminWarrantyEventHttpTest {
  @Configuration
  @EnableWebMvc
  @org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
  @Import(SecurityConfig.class)
  static class Web {
    @Bean
    AdminWarrantyEventServiceTest.Fixture fixture() {
      return new AdminWarrantyEventServiceTest.Fixture();
    }

    @Bean
    JwtService jwt() {
      return mock(JwtService.class);
    }

    @Bean
    NguoiDungRepository users() {
      return mock(NguoiDungRepository.class);
    }

    @Bean
    JwtAuthFilter filter(JwtService jwt, NguoiDungRepository users) {
      return new JwtAuthFilter(jwt, users);
    }

    @Bean
    JwtAuthenticationEntryPoint entry() {
      return new JwtAuthenticationEntryPoint(new ObjectMapper());
    }

    @Bean
    JwtAccessDeniedHandler denied() {
      return new JwtAccessDeniedHandler(new ObjectMapper());
    }

    @Bean
    GlobalExceptionHandler errors() {
      return new GlobalExceptionHandler();
    }

    @Bean
    AdminWarrantyController controller(AdminWarrantyEventServiceTest.Fixture f) {
      return new AdminWarrantyController(
          mock(AdminWarrantyService.class),
          mock(AdminWarrantyLookupService.class),
          mock(AdminWarrantyDetailService.class),
          mock(AdminWarrantyCreateService.class),
          mock(AdminWarrantyIntakeResultService.class),
          mock(AdminWarrantyStatusService.class),
          f.service);
    }
  }

  private static MockHttpServletResponse request(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post("/api/v1/admin/warranties/" + id + "/events")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  @Test
  void routeUsesExistingJwtAndRoleRulesAndGlobalErrors() throws Exception {
    try (var context = new AnnotationConfigWebApplicationContext()) {
      context.setServletContext(new MockServletContext());
      context
          .getEnvironment()
          .getPropertySources()
          .addFirst(
              new MapPropertySource(
                  "offline",
                  Map.of(
                      "jwt.secret",
                      "test-only-offline-secret",
                      "jwt.access-token-expiration",
                      "3600000",
                      "jwt.refresh-token-expiration",
                      "86400000",
                      "jwt.refresh-token-remember-expiration",
                      "172800000")));
      context.register(Web.class);
      context.refresh();
      var jwt = context.getBean(JwtService.class);
      var users = context.getBean(NguoiDungRepository.class);
      for (int n = 0; n < 3; n++) {
        String token = List.of("admin", "user", "blocked").get(n);
        long id = 8L + n;
        when(jwt.isAccessTokenValid(token)).thenReturn(true);
        when(jwt.getUserIdFromToken(token)).thenReturn(id);
        when(users.findByIdWithVaiTro(id))
            .thenReturn(
                Optional.of(
                    NguoiDung.builder()
                        .id(id)
                        .trangThai(
                            n == 2
                                ? TrangThaiCoBanEnum.NGUNG_HOAT_DONG
                                : TrangThaiCoBanEnum.HOAT_DONG)
                        .vaiTro(
                            VaiTro.builder()
                                .id((long) n + 1)
                                .tenVaiTro(n == 1 ? "USER" : "ADMIN")
                                .build())
                        .build()));
      }
      var mvc =
          MockMvcBuilders.webAppContextSetup(context)
              .apply(SecurityMockMvcConfigurers.springSecurity())
              .build();
      var body = AdminWarrantyEventServiceTest.conclusion(false);
      String key = AdminWarrantyEventServiceTest.KEY;
      assertEquals(401, request(mvc, null, key, "501", body).getStatus());
      assertEquals(401, request(mvc, "expired", key, "501", body).getStatus());
      assertEquals(403, request(mvc, "user", key, "501", body).getStatus());
      assertEquals(403, request(mvc, "blocked", key, "501", body).getStatus());
      assertEquals(400, request(mvc, "admin", null, "501", body).getStatus());
      var forbidden = new LinkedHashMap<>(body);
      forbidden.put("trang_thai_xu_ly", null);
      assertEquals(400, request(mvc, "admin", key, "501", forbidden).getStatus());
      var f = context.getBean(AdminWarrantyEventServiceTest.Fixture.class);
      when(f.workflow.ticketOrigin(999L))
          .thenThrow(
              WarrantyReadException.notFound(
                  ErrorCode.WARRANTY_NOT_FOUND, "path.id", "WARRANTY_NOT_FOUND"));
      var notFound = request(mvc, "admin", UUID.randomUUID().toString(), "999", body);
      assertEquals(404, notFound.getStatus());
      assertTrue(notFound.getContentAsString().contains("WARRANTY_NOT_FOUND"));
      var success = request(mvc, "admin", key, "501", body);
      assertEquals(200, success.getStatus(), success.getContentAsString());
      var json = AdminWarrantyEventServiceTest.JSON.readTree(success.getContentAsString());
      assertEquals(200, json.get("status").asInt());
      assertEquals("DANG_KIEM_TRA", json.at("/data/trang_thai_xu_ly").asString());
      assertTrue(json.at("/data/chi_phi_ncc_xac_nhan").isNull());
      var conflict =
          request(mvc, "admin", key, "501", AdminWarrantyEventServiceTest.conclusion(true));
      assertEquals(409, conflict.getStatus());
      assertTrue(conflict.getContentAsString().contains("IDEMPOTENCY_KEY_REUSED"));
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
