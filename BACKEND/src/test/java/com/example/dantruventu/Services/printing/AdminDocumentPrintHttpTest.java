package com.example.dantruventu.Services.printing;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.example.dantruventu.Config.JwtAccessDeniedHandler;
import com.example.dantruventu.Config.JwtAuthFilter;
import com.example.dantruventu.Config.JwtAuthenticationEntryPoint;
import com.example.dantruventu.Config.SecurityConfig;
import com.example.dantruventu.Controller.printing.AdminDocumentPrintController;
import com.example.dantruventu.Controller.printing.AdminPrintExceptionHandler;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Services.JwtService;
import com.example.dantruventu.Services.printing.AdminPrintService.Kind;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.MapPropertySource;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;

class AdminDocumentPrintHttpTest {
  private static final byte[] PDF =
      "%PDF-1.7\ncomplete-test-document\n%%EOF".getBytes(StandardCharsets.US_ASCII);
  private static final Map<Kind, String> PATHS =
      Map.of(
          Kind.GOODS_RECEIPT, "/purchase-orders/%s/goods-receipt/pdf",
          Kind.WAREHOUSE_ISSUE, "/orders/%s/warehouse-issue/pdf",
          Kind.SALES_SLIP, "/orders/%s/sales-slip/pdf",
          Kind.SALES_INVOICE, "/sales-invoices/%s/pdf",
          Kind.RECEIPT, "/receipts/%s/pdf",
          Kind.DISBURSEMENT, "/disbursements/%s/pdf",
          Kind.DELIVERY, "/deliveries/%s/pdf");

  @Configuration
  @EnableWebMvc
  @EnableWebSecurity
  @Import({SecurityConfig.class, AdminPrintExceptionHandler.class})
  static class Web {
    @Bean
    AdminPrintService printing() {
      return mock(AdminPrintService.class);
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
    AdminDocumentPrintController controller(AdminPrintService printing) {
      return new AdminDocumentPrintController(printing);
    }
  }

  private AnnotationConfigWebApplicationContext context;
  private MockMvc mvc;
  private AdminPrintService printing;

  @BeforeEach
  void start() {
    context = new AnnotationConfigWebApplicationContext();
    context.setServletContext(new MockServletContext());
    context
        .getEnvironment()
        .getPropertySources()
        .addFirst(
            new MapPropertySource(
                "offline",
                Map.of(
                    "jwt.secret", "test-only-offline-secret",
                    "jwt.access-token-expiration", "3600000",
                    "jwt.refresh-token-expiration", "86400000",
                    "jwt.refresh-token-remember-expiration", "172800000")));
    context.register(Web.class);
    context.refresh();
    printing = context.getBean(AdminPrintService.class);
    var jwt = context.getBean(JwtService.class);
    var users = context.getBean(NguoiDungRepository.class);
    for (String token : List.of("admin", "customer", "employee", "blocked")) {
      long userId = List.of("admin", "customer", "employee", "blocked").indexOf(token) + 1L;
      when(jwt.isAccessTokenValid(token)).thenReturn(true);
      when(jwt.getUserIdFromToken(token)).thenReturn(userId);
      when(users.findByIdWithVaiTro(userId))
          .thenReturn(
              Optional.of(
                  NguoiDung.builder()
                      .id(userId)
                      .trangThai(
                          "blocked".equals(token)
                              ? TrangThaiCoBanEnum.NGUNG_HOAT_DONG
                              : TrangThaiCoBanEnum.HOAT_DONG)
                      .vaiTro(
                          VaiTro.builder()
                              .id(userId)
                              .tenVaiTro(
                                  "customer".equals(token)
                                      ? "USER"
                                      : "employee".equals(token) ? "EMPLOYEE" : "ADMIN")
                              .build())
                      .build()));
    }
    mvc =
        MockMvcBuilders.webAppContextSetup(context)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();
  }

  @AfterEach
  void close() {
    SecurityContextHolder.clearContext();
    context.close();
  }

  @Test
  void everyRouteReturnsGeneratedPdfInlineByDefaultWithPrivateDownloadHeaders() throws Exception {
    for (Kind kind : Kind.values()) {
      when(printing.render(kind, 125L)).thenReturn(PDF);
      var response = send(route(kind, "125"), "admin");

      assertEquals(200, response.getStatus(), response.getContentAsString());
      assertEquals("application/pdf", response.getContentType());
      assertEquals(PDF.length, response.getContentLength());
      assertArrayEquals(PDF, response.getContentAsByteArray());
      assertEquals("no-store", response.getHeader(HttpHeaders.CACHE_CONTROL));
      assertEquals(
          "inline; filename=\"" + filename(kind, 125L) + "\"",
          response.getHeader(HttpHeaders.CONTENT_DISPOSITION));
      verify(printing).render(kind, 125L);
    }
    verifyNoMoreInteractions(printing);
  }

  @Test
  void explicitDownloadChoosesAttachmentAndFalseChoosesInline() throws Exception {
    when(printing.render(Kind.RECEIPT, 125L)).thenReturn(PDF);
    for (boolean download : List.of(true, false)) {
      var response =
          send(route(Kind.RECEIPT, "125").param("download", Boolean.toString(download)), "admin");

      assertEquals(200, response.getStatus());
      assertEquals(
          (download ? "attachment" : "inline") + "; filename=\"receipt-125.pdf\"",
          response.getHeader(HttpHeaders.CONTENT_DISPOSITION));
      assertArrayEquals(PDF, response.getContentAsByteArray());
    }
  }

  @Test
  void malformedNonpositiveAndOverflowIdsAreRejectedBeforeLoadingSources() throws Exception {
    for (Kind kind : Kind.values()) {
      for (String id : List.of("0", "-1", "abc", "1.5", "+1", "9223372036854775808")) {
        var response = send(route(kind, id), "admin");
        assertJsonError(response, 400);
      }
    }
    verifyNoInteractions(printing);
  }

  @Test
  void unknownDuplicateAndInvalidDownloadQueriesAreRejected() throws Exception {
    for (Kind kind : Kind.values()) {
      assertJsonError(send(route(kind, "125").param("page", "0"), "admin"), 400);
      assertJsonError(send(route(kind, "125").param("download", "false", "true"), "admin"), 400);
      for (String download : List.of("", "1", "yes", "FALSE", " true ")) {
        assertJsonError(send(route(kind, "125").param("download", download), "admin"), 400);
      }
    }
    verifyNoInteractions(printing);
  }

  @Test
  void everyRouteRequiresValidTokenActiveAccountAndAdminRole() throws Exception {
    for (Kind kind : Kind.values()) {
      assertJsonError(send(route(kind, "125"), null), 401);
      assertJsonError(send(route(kind, "125"), "expired"), 401);
      assertJsonError(send(route(kind, "125"), "customer"), 403);
      assertJsonError(send(route(kind, "125"), "employee"), 403);
      assertJsonError(send(route(kind, "125"), "blocked"), 403);
    }
    verifyNoInteractions(printing);
  }

  @Test
  void sourceErrorsStayJsonAndDoNotStartPdfResponse() throws Exception {
    for (ErrorCode code :
        List.of(ErrorCode.PRINT_RECORD_NOT_FOUND, ErrorCode.PRINT_HISTORY_CONFLICT)) {
      doThrow(new AppException(code)).when(printing).render(Kind.GOODS_RECEIPT, 125L);
      var response = send(route(Kind.GOODS_RECEIPT, "125"), "admin");
      assertJsonError(response, code.getStatus().value());
      assertTrue(response.getContentAsString().contains(code.getMessage()));
    }
  }

  @Test
  void generationFailureDoesNotReturnPartialPdfOrAttachment() throws Exception {
    when(printing.render(Kind.RECEIPT, 125L))
        .thenThrow(new IllegalStateException("Lỗi tạo PDF giả lập"));

    var response = send(route(Kind.RECEIPT, "125").param("download", "true"), "admin");

    assertJsonError(response, 500);
  }

  @Test
  void pdfOnlyAcceptStillReceivesJsonBusinessErrorsAndForbidden() throws Exception {
    for (ErrorCode code :
        List.of(
            ErrorCode.PRINT_RECORD_NOT_FOUND,
            ErrorCode.PRINT_HISTORY_CONFLICT,
            ErrorCode.PRINT_PDF_FAILED)) {
      doThrow(new AppException(code)).when(printing).render(Kind.RECEIPT, 125L);
      assertJsonError(
          send(route(Kind.RECEIPT, "125").header(HttpHeaders.ACCEPT, "application/pdf"), "admin"),
          code.getStatus().value());
    }
    assertJsonError(
        send(route(Kind.RECEIPT, "abc").header(HttpHeaders.ACCEPT, "application/pdf"), "admin"),
        400);
    assertJsonError(
        send(route(Kind.RECEIPT, "125").header(HttpHeaders.ACCEPT, "application/pdf"), "employee"),
        403);
  }

  @Test
  void salesSlipUsesExactConflictAndFailureMessagesFromApiContract() throws Exception {
    doThrow(new AppException(ErrorCode.PRINT_SALES_SLIP_CONFLICT))
        .when(printing)
        .render(Kind.SALES_SLIP, 125L);
    var conflict =
        send(route(Kind.SALES_SLIP, "125").header(HttpHeaders.ACCEPT, "application/pdf"), "admin");
    assertJsonError(conflict, 409);
    assertTrue(
        conflict
            .getContentAsString()
            .contains("Dữ liệu đơn bán không đủ hoặc không nhất quán để in đúng lịch sử."));
    doThrow(new AppException(ErrorCode.PRINT_PDF_FAILED))
        .when(printing)
        .render(Kind.SALES_SLIP, 125L);
    var failure =
        send(route(Kind.SALES_SLIP, "125").header(HttpHeaders.ACCEPT, "application/pdf"), "admin");
    assertJsonError(failure, 500);
    assertTrue(failure.getContentAsString().contains("Không tạo được PDF phiếu."));
  }

  @Test
  void temporaryInvoiceUsesItsOwnNotFoundNotReadyAndFailureMessages() throws Exception {
    for (ErrorCode code :
        List.of(
            ErrorCode.PRINT_SALES_INVOICE_NOT_FOUND,
            ErrorCode.PRINT_SALES_INVOICE_NOT_READY,
            ErrorCode.PRINT_SALES_INVOICE_PDF_FAILED)) {
      doThrow(new AppException(code)).when(printing).render(Kind.SALES_INVOICE, 130L);
      var response =
          send(
              route(Kind.SALES_INVOICE, "130").header(HttpHeaders.ACCEPT, "application/pdf"),
              "admin");
      assertJsonError(response, code.getStatus().value());
      assertTrue(response.getContentAsString().contains(code.getMessage()));
    }
  }

  private MockHttpServletRequestBuilder route(Kind kind, String id) {
    return get("/api/v1/admin" + PATHS.get(kind).formatted(id));
  }

  private MockHttpServletResponse send(MockHttpServletRequestBuilder request, String token)
      throws Exception {
    SecurityContextHolder.clearContext();
    if (token != null) request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    return mvc.perform(request).andReturn().getResponse();
  }

  private void assertJsonError(MockHttpServletResponse response, int expected) throws Exception {
    assertEquals(expected, response.getStatus(), response.getContentAsString());
    assertTrue(response.getContentType().startsWith("application/json"));
    assertNull(response.getHeader(HttpHeaders.CONTENT_DISPOSITION));
    var json = new ObjectMapper().readTree(response.getContentAsString());
    assertEquals(expected, json.get("status").asInt());
    assertTrue(json.get("data").isNull());
  }

  private String filename(Kind kind, Long id) {
    return kind.name().toLowerCase(Locale.ROOT).replace('_', '-') + "-" + id + ".pdf";
  }
}
