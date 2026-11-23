package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import com.example.dantruventu.Config.*;
import com.example.dantruventu.Controller.PcBuilderController;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.core.env.MapPropertySource;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;

class PcBuilderExportHttpTest {
  @Configuration
  @EnableWebMvc
  @org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
  @Import(SecurityConfig.class)
  static class Web {
    @Bean
    PcBuilderExportServiceTest.Fixture fixture() {
      return new PcBuilderExportServiceTest.Fixture();
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
    PcBuilderController controller(PcBuilderExportServiceTest.Fixture f) {
      return new PcBuilderController(f.builder, f.service);
    }
  }

  AnnotationConfigWebApplicationContext context;
  MockMvc mvc;
  PcBuilderExportServiceTest.Fixture fixture;

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
    fixture = context.getBean(PcBuilderExportServiceTest.Fixture.class);
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

  MvcResult send(String body) throws Exception {
    return mvc.perform(
            post("/api/v1/pc-builder/export").contentType(MediaType.APPLICATION_JSON).content(body))
        .andReturn();
  }

  @Test
  void previewReportsCpuSupportInsteadOfSocketAndDoesNotBlockBuying() throws Exception {
    fixture.data.get(201L).getSanPham().setThongSoKyThuat("{\"CPU hỗ trợ\":\"AMD\"}");
    var response =
        mvc.perform(
                post("/api/v1/pc-builder/preview")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(PcBuilderExportServiceTest.BODY))
            .andReturn()
            .getResponse();
    assertEquals(200, response.getStatus());
    var data = fixture.json.readTree(response.getContentAsString()).get("data");
    var check = data.get("kiem_tra_cpu_main");
    assertEquals("KHONG_KHOP_CPU_HO_TRO", check.get("trang_thai").asString());
    assertEquals("INTEL", check.get("hang_cpu").asString());
    assertEquals("AMD", check.get("cpu_ho_tro_main").asString());
    assertEquals("CPU_HO_TRO_MAIN", check.get("pham_vi").asString());
    assertTrue(data.get("co_the_gui_yeu_cau_them_gio").asBoolean());
    assertFalse(check.has("socket_cpu"));
  }

  @Test
  void productsAcceptNewFilterAndLegacyAliasAndRejectConflictingFlags() throws Exception {
    when(fixture.variants.findById(101L)).thenReturn(Optional.of(fixture.data.get(101L)));
    var row = mock(PhienBanSanPhamRepository.PcBuilderProduct.class);
    when(row.getThongSoKyThuat()).thenReturn("{\"CPU hỗ trợ\":\"Intel\"}");
    when(row.getTonCoTheBan()).thenReturn(1L);
    when(fixture.variants.findPcBuilderProducts(
            2L,
            1L,
            null,
            null,
            null,
            null,
            "TAT_CA",
            "INTEL",
            null,
            "MAC_DINH",
            PageRequest.of(0, 20)))
        .thenReturn(new PageImpl<>(java.util.List.of(row), PageRequest.of(0, 20), 1));
    for (String flag : java.util.List.of("chi_tuong_thich", "chi_khop_socket")) {
      var response =
          mvc.perform(
                  get("/api/v1/pc-builder/products")
                      .param("ma_hang_muc", "MAIN")
                      .param("phien_ban_doi_chieu_id", "101")
                      .param(flag, "true"))
              .andReturn()
              .getResponse();
      assertEquals(200, response.getStatus());
      var data = fixture.json.readTree(response.getContentAsString()).get("data");
      assertTrue(data.get("bo_loc_tuong_thich").get("dang_ap_dung").asBoolean());
      assertEquals(
          "KHOP_CPU_HO_TRO", data.get("items").get(0).get("ket_qua_tuong_thich").asString());
      assertFalse(data.get("items").get(0).has("ket_qua_socket"));
    }
    assertEquals(
        400,
        mvc.perform(
                get("/api/v1/pc-builder/products")
                    .param("ma_hang_muc", "MAIN")
                    .param("phien_ban_doi_chieu_id", "101")
                    .param("chi_tuong_thich", "true")
                    .param("chi_khop_socket", "false"))
            .andReturn()
            .getResponse()
            .getStatus());
  }

  @Test
  void anonymousExportWithoutIdempotencyKeyReturnsRealWorkbookAndHeaders() throws Exception {
    var response = send(PcBuilderExportServiceTest.BODY).getResponse();
    assertEquals(200, response.getStatus());
    assertEquals(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        response.getContentType());
    assertTrue(
        response
            .getHeader("Content-Disposition")
            .matches("attachment; filename=\"Ruventu_CauHinhPC_\\d{8}_\\d{6}\\.xlsx\""));
    assertEquals(response.getContentAsByteArray().length, response.getContentLength());
    try (var workbook =
        new XSSFWorkbook(new ByteArrayInputStream(response.getContentAsByteArray()))) {
      assertEquals(21460000, workbook.getSheetAt(0).getRow(12).getCell(6).getNumericCellValue());
    }
    verifyNoInteractions(
        context.getBean(JwtService.class), context.getBean(NguoiDungRepository.class));
  }

  @Test
  void changedPriceReturnsExactF02JsonWithoutFileHeaders() throws Exception {
    var response = send(PcBuilderExportServiceTest.BODY.replace("12490000", "1")).getResponse();
    assertEquals(409, response.getStatus());
    var root = fixture.json.readTree(response.getContentAsString());
    assertEquals("Giá linh kiện đã thay đổi, cần xác nhận lại", root.get("message").asString());
    assertTrue(root.get("data").isNull());
    var error = root.get("errors").get(0);
    assertEquals("items[0].don_gia_xac_nhan", error.get("field").asString());
    assertEquals("PRICE_CHANGED", error.get("code").asString());
    assertEquals("Lấy preview mới và xác nhận trước xuất", error.get("message").asString());
    assertNull(response.getHeader("Content-Disposition"));
    assertTrue(response.getContentType().startsWith("application/json"));
  }

  @Test
  void sourceFailureReturnsExactF03JsonWithoutPartialWorkbook() throws Exception {
    doThrow(new IOException("Lỗi kết xuất giả lập")).when(fixture.renderer).export(any(), anyMap());
    var response = send(PcBuilderExportServiceTest.BODY).getResponse();
    assertEquals(500, response.getStatus());
    var root = fixture.json.readTree(response.getContentAsString());
    assertEquals("Không tạo được file xuất từ dữ liệu nguồn", root.get("message").asString());
    assertEquals("source", root.get("errors").get(0).get("field").asString());
    assertEquals(
        "EXPORT_SOURCE_OR_RENDER_FAILED", root.get("errors").get(0).get("code").asString());
    assertTrue(root.get("data").isNull());
    assertNull(response.getHeader("Content-Disposition"));
  }

  @Test
  void unknownVariantReturnsExactF04Json() throws Exception {
    var response = send(PcBuilderExportServiceTest.BODY.replace("101", "999999")).getResponse();
    assertEquals(404, response.getStatus());
    var root = fixture.json.readTree(response.getContentAsString());
    assertEquals("Không tìm thấy linh kiện công khai để xuất", root.get("message").asString());
    var error = root.get("errors").get(0);
    assertEquals("items.phien_ban_id", error.get("field").asString());
    assertEquals("PUBLIC_VARIANT_NOT_FOUND", error.get("code").asString());
    assertEquals(
        "Không tìm thấy phiên bản được phép công bố trong công cụ",
        error.get("message").asString());
    assertTrue(root.get("data").isNull());
  }

  @Test
  void emptyMalformedUnknownAndMissingBodyReturn400() throws Exception {
    assertEquals(400, send("{\"items\":[]}").getResponse().getStatus());
    assertEquals(400, send("{").getResponse().getStatus());
    assertEquals(
        400,
        send(PcBuilderExportServiceTest.BODY.replace("\"items\"", "\"nguoi_dung_id\":1,\"items\""))
            .getResponse()
            .getStatus());
    assertEquals(
        400,
        mvc.perform(post("/api/v1/pc-builder/export").contentType(MediaType.APPLICATION_JSON))
            .andReturn()
            .getResponse()
            .getStatus());
  }

  @Test
  void stockAndCpuSupportWarningsStillReturnWorkbook() throws Exception {
    fixture.available.put(301L, 1L);
    fixture.data.get(201L).getSanPham().setThongSoKyThuat("{}");
    var response = send(PcBuilderExportServiceTest.BODY).getResponse();
    assertEquals(200, response.getStatus());
    String text = fixture.workbookText(response.getContentAsByteArray());
    assertTrue(text.contains("MAIN thiếu thông số CPU hỗ trợ"));
    assertTrue(text.contains("tổng nhu cầu 2, tồn có thể bán 1"));
  }
}
