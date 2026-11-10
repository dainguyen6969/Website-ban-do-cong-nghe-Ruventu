package com.example.dantruventu.Services.order;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.dantruventu.Config.JwtAccessDeniedHandler;
import com.example.dantruventu.Config.JwtAuthFilter;
import com.example.dantruventu.Config.JwtAuthenticationEntryPoint;
import com.example.dantruventu.Config.SecurityConfig;
import com.example.dantruventu.Controller.order.AdminReturnCancelController;
import com.example.dantruventu.Controller.order.AdminReturnController;
import com.example.dantruventu.Controller.order.AdminReturnHandoverController;
import com.example.dantruventu.Controller.order.AdminReturnInspectionController;
import com.example.dantruventu.Controller.order.AdminReturnRejectController;
import com.example.dantruventu.DTO.Response.order.AdminReturnHandoverResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Services.JwtService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.support.TestPropertySourceUtils;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;

class AdminReturnHandoverSecurityTest {

  private static final String KEY = "8f4b6a10-8632-4c37-8797-b47f371f14fa";
  private static final String BODY =
      """
      {"xac_nhan_tra_du_hang":true,"ten_nguoi_nhan":"Nguyễn Văn An",
       "sdt_nguoi_nhan":"0912345678","ngay_ban_giao":"2026-10-12T12:30:00+07:00",
       "hang_ban_giao":[{"ma_muc_nhan":"HN-1","so_luong":1,
          "tinh_trang":"Theo biên bản","phu_kien":["Hộp"]}],
       "bang_chung_urls":["/uploads/ban-giao.jpg"]}
      """;

  private static AnnotationConfigWebApplicationContext context;
  private static MockMvc mvc;
  private NguoiDungRepository users;
  private AdminReturnHandoverService handovers;
  private AdminReturnCancelService cancels;
  private AdminReturnRejectService rejects;
  private AdminReturnInspectionService inspections;
  private JwtService jwt;
  private NguoiDung admin;

  @BeforeAll
  static void startContext() {
    // Real project SecurityFilterChain, JWT signing/validation and method security;
    // mocked business/database boundaries, no external MySQL or Redis required.
    context = new AnnotationConfigWebApplicationContext();
    context.setServletContext(new MockServletContext());
    context.register(WebConfig.class);
    TestPropertySourceUtils.addInlinedPropertiesToEnvironment(
        context,
        "jwt.secret=TH12-only-test-key-not-production-0123456789-abcdefghijklmnopqrstuvwxyz",
        "jwt.access-token-expiration=60000",
        "jwt.refresh-token-expiration=60000",
        "jwt.refresh-token-remember-expiration=120000");
    context.refresh();
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  }

  @AfterAll
  static void closeContext() {
    if (context != null) context.close();
    SecurityContextHolder.clearContext();
  }

  @BeforeEach
  void setup() {
    users = context.getBean(NguoiDungRepository.class);
    handovers = context.getBean(AdminReturnHandoverService.class);
    cancels = context.getBean(AdminReturnCancelService.class);
    rejects = context.getBean(AdminReturnRejectService.class);
    inspections = context.getBean(AdminReturnInspectionService.class);
    jwt = context.getBean(JwtService.class);
    reset(users, handovers, cancels, rejects, inspections);
    SecurityContextHolder.clearContext();
    admin = user(7L, "ADMIN", TrangThaiCoBanEnum.HOAT_DONG);
    when(users.findByIdWithVaiTro(7L)).thenReturn(Optional.of(admin));
  }

  @ParameterizedTest
  @ValueSource(strings = {"handover", "cancel", "reject", "inspection"})
  void noAuthorizationHeaderIs401BeforeAnyBusinessCall(String operation) throws Exception {
    mvc.perform(
            post(url(operation))
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", KEY)
                .content(body(operation)))
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(handovers, cancels, rejects, inspections);
  }

  @ParameterizedTest
  @ValueSource(strings = {"Bearer invalid-token", "Basic ignored", "Bearer "})
  void invalidAuthorizationIs401(String header) throws Exception {
    mvc.perform(
            post(url("handover"))
                .header("Authorization", header)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(handovers);
  }

  @Test
  void refreshTokenCannotAuthorizeTheHandoverEndpoint() throws Exception {
    mvc.perform(
            post(url("handover"))
                .header("Authorization", "Bearer " + jwt.generateRefreshToken(admin, false))
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(handovers);
  }

  @Test
  void expiredAccessTokenIs401() throws Exception {
    String token;
    ReflectionTestUtils.setField(jwt, "accessTokenExpiration", -1000L);
    try {
      token = jwt.generateAccessToken(admin);
    } finally {
      ReflectionTestUtils.setField(jwt, "accessTokenExpiration", 60000L);
    }
    mvc.perform(
            post(url("handover"))
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(handovers);
  }

  @ParameterizedTest
  @ValueSource(strings = {"handover", "cancel", "reject", "inspection"})
  void activeNonAdminIs403(String operation) throws Exception {
    var customer = user(8L, "USER", TrangThaiCoBanEnum.HOAT_DONG);
    when(users.findByIdWithVaiTro(8L)).thenReturn(Optional.of(customer));
    mvc.perform(
            post(url(operation))
                .header("Authorization", "Bearer " + jwt.generateAccessToken(customer))
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(operation)))
        .andExpect(status().isForbidden());
    verifyNoInteractions(handovers, cancels, rejects, inspections);
  }

  @Test
  void lockedAdminIs403EvenWithAValidSignedToken() throws Exception {
    admin.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    mvc.perform(
            post(url("handover"))
                .header("Authorization", "Bearer " + jwt.generateAccessToken(admin))
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
        .andExpect(status().isForbidden());
    verifyNoInteractions(handovers);
  }

  @Test
  void tokenForDeletedAccountIs401() throws Exception {
    when(users.findByIdWithVaiTro(7L)).thenReturn(Optional.empty());
    mvc.perform(
            post(url("handover"))
                .header("Authorization", "Bearer " + jwt.generateAccessToken(admin))
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(handovers);
  }

  @Test
  void validAdminReachesHandoverWithAuthenticatedActorAndDocumentedEnvelope() throws Exception {
    OffsetDateTime handedAt = OffsetDateTime.parse("2026-10-12T12:30:00+07:00");
    var response =
        new AdminReturnHandoverResponse(
            300L,
            TrangThaiTraHang.TU_CHOI,
            handedAt,
            false,
            true,
            new AdminReturnHandoverResponse.Handover(
                "Nguyễn Văn An",
                "0912345678",
                handedAt,
                List.of(
                    new AdminReturnHandoverResponse.Item(
                        "HN-1", 1, "Theo biên bản", List.of("Hộp"))),
                List.of("/uploads/ban-giao.jpg")),
            null);
    when(handovers.handover(eq(300L), eq(KEY), any(), same(admin))).thenReturn(response);
    mvc.perform(
            post(url("handover"))
                .header("Authorization", "Bearer " + jwt.generateAccessToken(admin))
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value(200))
        .andExpect(jsonPath("$.message").value("Bàn giao lại hàng thành công"))
        .andExpect(jsonPath("$.data.ngay_ket_thuc").value("2026-10-12T12:30:00+07:00"))
        .andExpect(jsonPath("$.data.ban_giao_lai.hang_ban_giao[0].ma_muc_nhan").value("HN-1"))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("\"phieu_chi\":null")));
    verify(handovers).handover(eq(300L), eq(KEY), any(), same(admin));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "missing-evidence",
        "false-confirmation",
        "missing-item-code",
        "fractional-quantity",
        "client-status",
        "date-without-offset"
      })
  void invalidAuthenticatedJsonIs400WithoutCallingTheService(String variant) throws Exception {
    String body =
        switch (variant) {
          case "missing-evidence" -> BODY.replace("[\"/uploads/ban-giao.jpg\"]", "[]");
          case "false-confirmation" ->
              BODY.replace("\"xac_nhan_tra_du_hang\":true", "\"xac_nhan_tra_du_hang\":false");
          case "missing-item-code" -> BODY.replace("\"ma_muc_nhan\":\"HN-1\",", "");
          case "fractional-quantity" -> BODY.replace("\"so_luong\":1", "\"so_luong\":1.5");
          case "client-status" ->
              BODY.replace(
                  "\"xac_nhan_tra_du_hang\":true",
                  "\"trang_thai_tra_hang\":\"HUY\",\"xac_nhan_tra_du_hang\":true");
          case "date-without-offset" ->
              BODY.replace("2026-10-12T12:30:00+07:00", "2026-10-12T12:30:00");
          default -> throw new IllegalArgumentException();
        };
    mvc.perform(
            post(url("handover"))
                .header("Authorization", "Bearer " + jwt.generateAccessToken(admin))
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(handovers);
  }

  @Test
  void allTwelveUc027RoutesAreRegisteredTogetherWithoutDuplicateMappings() {
    var mapping =
        context.getBean(
            org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping
                .class);
    var routes = new java.util.HashSet<String>();
    mapping
        .getHandlerMethods()
        .keySet()
        .forEach(
            info -> {
              for (var path : info.getPatternValues()) {
                if (path.startsWith("/api/v1/admin/returns")) {
                  info.getMethodsCondition()
                      .getMethods()
                      .forEach(method -> routes.add(method.name() + " " + path));
                }
              }
            });
    org.junit.jupiter.api.Assertions.assertEquals(
        java.util.Set.of(
            "GET /api/v1/admin/returns",
            "GET /api/v1/admin/returns/eligible-orders",
            "GET /api/v1/admin/returns/eligible-orders/{orderId}",
            "POST /api/v1/admin/returns/preview",
            "POST /api/v1/admin/returns",
            "GET /api/v1/admin/returns/{id}",
            "POST /api/v1/admin/returns/{id}/inspection",
            "POST /api/v1/admin/returns/{id}/receive",
            "POST /api/v1/admin/returns/{id}/refund",
            "POST /api/v1/admin/returns/{id}/cancel",
            "POST /api/v1/admin/returns/{id}/reject",
            "POST /api/v1/admin/returns/{id}/handover"),
        routes);
  }

  @Test
  void anAdminCanRecordInspectionWithTheAuthenticatedActor() throws Exception {
    var received = java.time.OffsetDateTime.parse("2026-10-12T11:30:00+07:00");
    var result =
        new com.example.dantruventu.DTO.Response.order.AdminReturnInspectionResponse(
            300L,
            TrangThaiTraHang.CHO_TIEP_NHAN,
            received,
            true,
            List.of(
                new com.example.dantruventu.DTO.Response.order.AdminReturnInspectionResponse.Item(
                    "HN-1",
                    500L,
                    null,
                    1,
                    "MA-KHONG-KHOP",
                    "Tem kiện",
                    "Đang kiểm tra",
                    List.of("Hộp"))),
            false,
            null,
            "Chưa kết luận nhận trả",
            List.of("/uploads/intake.jpg"));
    when(inspections.inspect(eq(300L), eq(KEY), any(), same(admin))).thenReturn(result);
    mvc.perform(
            post(url("inspection"))
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + jwt.generateAccessToken(admin))
                .header("Idempotency-Key", KEY)
                .content(body("inspection")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.trang_thai_tra_hang").value("CHO_TIEP_NHAN"))
        .andExpect(jsonPath("$.data.da_nhap_kho").value(false))
        .andExpect(jsonPath("$.data.hang_thuc_nhan[0].ma_muc_nhan").value("HN-1"));
    verify(inspections).inspect(eq(300L), eq(KEY), any(), same(admin));
  }

  private String url(String operation) {
    return "/api/v1/admin/returns/300/" + operation;
  }

  private String body(String operation) {
    return switch (operation) {
      case "inspection" -> AdminReturnInspectionRequestTest.BODY;
      case "handover" -> BODY;
      case "cancel" -> "{\"ly_do\":\"Khách yêu cầu hủy\"}";
      case "reject" -> "{\"ly_do\":\"Sai hàng\",\"can_cu\":\"Biên bản\",\"bang_chung_urls\":[]}";
      default -> throw new IllegalArgumentException();
    };
  }

  private NguoiDung user(Long id, String role, TrangThaiCoBanEnum status) {
    return NguoiDung.builder()
        .id(id)
        .vaiTro(VaiTro.builder().tenVaiTro(role).build())
        .trangThai(status)
        .build();
  }

  @TestConfiguration
  @EnableWebMvc
  @EnableWebSecurity
  @Import({
    SecurityConfig.class,
    JwtAuthFilter.class,
    JwtAuthenticationEntryPoint.class,
    JwtAccessDeniedHandler.class,
    GlobalExceptionHandler.class,
    AdminReturnHandoverController.class,
    AdminReturnCancelController.class,
    AdminReturnRejectController.class,
    AdminReturnInspectionController.class,
    AdminReturnController.class
  })
  static class WebConfig {
    @Bean
    ObjectMapper objectMapper() {
      return new ObjectMapper();
    }

    @Bean
    NguoiDungRepository users() {
      return mock(NguoiDungRepository.class);
    }

    @Bean
    AdminReturnHandoverService handovers() {
      return mock(AdminReturnHandoverService.class);
    }

    @Bean
    AdminReturnCancelService cancels() {
      return mock(AdminReturnCancelService.class);
    }

    @Bean
    AdminReturnRejectService rejects() {
      return mock(AdminReturnRejectService.class);
    }

    @Bean
    AdminReturnInspectionService inspections() {
      return mock(AdminReturnInspectionService.class);
    }

    @Bean
    AdminReturnService returns() {
      return mock(AdminReturnService.class);
    }

    @Bean
    JwtService jwtService() {
      return new JwtService();
    }
  }
}
