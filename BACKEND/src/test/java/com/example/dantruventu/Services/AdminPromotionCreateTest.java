package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.promotion.AdminPromotionController;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionConfigurationCreateRequest;
import com.example.dantruventu.Entity.ChiTietKhuyenMai;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Entity.ThuongHieu;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository.Entry;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionDetailRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;

class AdminPromotionCreateTest {
  private static final String URL = "/api/v1/admin/promotions";
  private static final String KEY = "8f4b6a10-8632-4c37-8797-b47f371f14fa";
  private static final String OTHER_KEY = "3fbc6d72-5220-4a08-a9b6-6285edc02831";
  private static final String PURCHASE =
      """
      {"phien_ban_id":2,"loai_ap_dung":"SAN_PHAM_MUA","so_luong":2}
      """;
  private static final String GIFT =
      """
      {"phien_ban_id":2,"loai_ap_dung":"SAN_PHAM_TANG","so_luong":1}
      """;

  private final AdminPromotionRepository programs = mock(AdminPromotionRepository.class);
  private final AdminPromotionDetailRepository details = mock(AdminPromotionDetailRepository.class);
  private final PhienBanSanPhamRepository variants = mock(PhienBanSanPhamRepository.class);
  private final DanhMucRepository categories = mock(DanhMucRepository.class);
  private final ThuongHieuRepository brands = mock(ThuongHieuRepository.class);
  private final SalesContext context = mock(SalesContext.class);
  private final SalesIdempotencyRepository idempotency = mock(SalesIdempotencyRepository.class);
  private final JsonMapper mapper = JsonMapper.builder().build();
  private final AtomicReference<Entry> saved = new AtomicReference<>();

  private final AdminPromotionService service =
      new AdminPromotionService(
          programs,
          details,
          variants,
          new SalesProperties(),
          categories,
          brands,
          null,
          context,
          idempotency,
          mapper,
          null);

  private final MockMvc mvc =
      MockMvcBuilders.standaloneSetup(new AdminPromotionController(service))
          .setControllerAdvice(new GlobalExceptionHandler())
          .setMessageConverters(new JacksonJsonHttpMessageConverter(mapper))
          .build();

  @BeforeEach
  void setup() {
    when(context.actor()).thenReturn(NguoiDung.builder().id(1L).build());
    when(idempotency.acquire(startsWith("PROMO:CREATE:"), eq(1L), anyString()))
        .thenAnswer(
            invocation -> {
              var entry = saved.get();
              return entry == null ? new Entry(1L, invocation.getArgument(2), null) : entry;
            });
    when(programs.saveAndFlush(any()))
        .thenAnswer(
            invocation -> {
              KhuyenMai program = invocation.getArgument(0);
              program.setId(10L);
              return program;
            });
    var nextLineId = new AtomicLong(20L);
    when(details.saveAllAndFlush(any()))
        .thenAnswer(
            invocation -> {
              List<ChiTietKhuyenMai> rows = invocation.getArgument(0);
              rows.forEach(row -> row.setId(nextLineId.getAndIncrement()));
              return rows;
            });
    var active = TrangThaiCoBanEnum.HOAT_DONG;
    var variant =
        PhienBanSanPham.builder()
            .id(2L)
            .trangThai(active)
            .sanPham(SanPham.builder().trangThai(active).build())
            .build();
    when(variants.findAllById(any())).thenReturn(List.of(variant));
    when(categories.findById(1L))
        .thenReturn(Optional.of(DanhMuc.builder().id(1L).trangThai(active).build()));
    when(brands.findById(1L))
        .thenReturn(Optional.of(ThuongHieu.builder().id(1L).trangThai(active).build()));
  }

  @ParameterizedTest
  @CsvSource({
    "CHIET_KHAU, DANH_MUC, PHAN_TRAM, 0",
    "CHIET_KHAU, TONG_DON, SO_TIEN, 0",
    "CHIET_KHAU, TUNG_SAN_PHAM, SO_TIEN, 1",
    "CHIET_KHAU, THUONG_HIEU, PHAN_TRAM, 0",
    "TANG_SAN_PHAM, TUNG_SAN_PHAM, NULL, 2",
    "TANG_SAN_PHAM, TONG_DON, NULL, 1"
  })
  void createsEveryKm03Configuration(String method, String scope, String type, int lineCount)
      throws Exception {
    String purchase = scope.equals("TUNG_SAN_PHAM") ? PURCHASE : "";
    boolean gift = method.equals("TANG_SAN_PHAM");
    String lines = gift ? purchase + (purchase.isEmpty() ? "" : ",") + GIFT : purchase;
    String config =
        switch (scope) {
          case "DANH_MUC" -> ",\"danh_muc_id\":1";
          case "THUONG_HIEU" -> ",\"thuong_hieu_id\":1";
          default -> "";
        };
    if (!gift) {
      config += ",\"loai_chiet_khau\":\"" + type + "\"";
      config +=
          type.equals("PHAN_TRAM")
              ? ",\"gia_tri_khuyen_mai\":100,\"muc_giam_toi_da\":300000"
              : ",\"gia_tri_khuyen_mai\":50000";
    }
    if (!scope.equals("TONG_DON") || gift) {
      config += ",\"so_luong_ap_dung\":100";
    }
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(method, scope, lines, config)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.id").value(10))
        .andExpect(jsonPath("$.data.phien_ban_cau_hinh").value(1))
        .andExpect(jsonPath("$.data.so_luong_da_dung").value(0))
        .andExpect(jsonPath("$.data.so_luong_dang_giu").value(0))
        .andExpect(jsonPath("$.data.so_luong_da_giai_phong").value(0))
        .andExpect(jsonPath("$.data.co_the_sua_cau_hinh").value(true))
        .andExpect(jsonPath("$.data.co_the_xoa").value(true))
        .andExpect(jsonPath("$.data.chi_tiet_khuyen_mai.length()").value(lineCount))
        .andExpect(jsonPath("$.data.loai_chiet_khau").value(gift ? null : type))
        .andExpect(
            jsonPath("$.data.so_luong_con_lai")
                .value(scope.equals("TONG_DON") && !gift ? null : 100));
    verify(idempotency).complete(eq("PROMO:CREATE:" + KEY), anyString());
  }

  @Test
  void replaysOriginalResponseAndRejectsOtherPayloadWithTheSameKey() throws Exception {
    var request =
        mapper.readValue(wholeOrderDiscount(""), AdminPromotionConfigurationCreateRequest.class);
    var response = service.createPromotion(KEY, request);
    var captured = ArgumentCaptor.forClass(String.class);
    verify(idempotency).acquire(eq("PROMO:CREATE:" + KEY), eq(1L), captured.capture());
    saved.set(new Entry(1L, captured.getValue(), mapper.writeValueAsString(response)));
    var replay = service.createPromotion(KEY.toUpperCase(Locale.ROOT), request);
    assertEquals(mapper.writeValueAsString(response), mapper.writeValueAsString(replay));
    assertEquals(response.getNgayBatDau(), replay.getNgayBatDau());
    verify(programs, times(1)).saveAndFlush(any());
    request.setTenChuongTrinh("Tên mới");
    var exception = assertThrows(AppException.class, () -> service.createPromotion(KEY, request));
    assertTrue(exception.getMessage().contains("nội dung khác"));
  }

  @Test
  void replaysLargeResponsesWithinTheStorageLimit() throws Exception {
    var active = TrangThaiCoBanEnum.HOAT_DONG;
    var product = SanPham.builder().trangThai(active).build();
    when(variants.findAllById(any()))
        .thenReturn(
            LongStream.rangeClosed(1, 1000)
                .mapToObj(
                    id ->
                        PhienBanSanPham.builder().id(id).trangThai(active).sanPham(product).build())
                .toList());
    String lines =
        LongStream.rangeClosed(1, 1000)
            .mapToObj(id -> PURCHASE.replace("\"phien_ban_id\":2", "\"phien_ban_id\":" + id))
            .collect(Collectors.joining(","));
    var request =
        mapper.readValue(
            body(
                "CHIET_KHAU",
                "TUNG_SAN_PHAM",
                lines,
                ",\"loai_chiet_khau\":\"SO_TIEN\",\"gia_tri_khuyen_mai\":50000"),
            AdminPromotionConfigurationCreateRequest.class);
    var response = service.createPromotion(KEY, request);
    var hash = ArgumentCaptor.forClass(String.class);
    var snapshot = ArgumentCaptor.forClass(String.class);
    verify(idempotency).acquire(eq("PROMO:CREATE:" + KEY), eq(1L), hash.capture());
    verify(idempotency).complete(eq("PROMO:CREATE:" + KEY), snapshot.capture());
    assertTrue(snapshot.getValue().startsWith("gzip:"));
    assertTrue(snapshot.getValue().getBytes(StandardCharsets.UTF_8).length <= 65_535);
    saved.set(new Entry(1L, hash.getValue(), snapshot.getValue()));
    assertEquals(
        mapper.writeValueAsString(response),
        mapper.writeValueAsString(service.createPromotion(KEY, request)));
  }

  @Test
  void doesNotCompleteIdempotencyWhenSavingDetailsFails() {
    var request =
        mapper.readValue(
            body(
                "CHIET_KHAU",
                "TUNG_SAN_PHAM",
                PURCHASE,
                ",\"loai_chiet_khau\":\"SO_TIEN\",\"gia_tri_khuyen_mai\":50000"),
            AdminPromotionConfigurationCreateRequest.class);
    doThrow(new DataIntegrityViolationException("write failed"))
        .when(details)
        .saveAllAndFlush(any());
    assertThrows(
        DataIntegrityViolationException.class, () -> service.createPromotion(KEY, request));
    verify(idempotency, never()).complete(anyString(), anyString());
  }

  @Test
  void rejectsDuplicateCodeWithNewKey() throws Exception {
    when(programs.existsByMaChuongTrinhIgnoreCase("KM03TEST")).thenReturn(true);
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", OTHER_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(wholeOrderDiscount("")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errors[0].field").value("ma_chuong_trinh"))
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_CODE_EXISTS"));
    verify(programs, never()).saveAndFlush(any());
    verify(idempotency, never()).complete(anyString(), anyString());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        ",\"phien_ban_cau_hinh\":2",
        ",\"so_luong_dang_giu\":5",
        ",\"danh_muc_id\":1",
        ",\"muc_giam_toi_da\":1",
        ",\"so_luong_ap_dung\":0",
        ",\"so_luong_ap_dung\":1.5",
        ",\"so_luong_mua_toi_thieu\":-1",
        ",\"trang_thai\":2"
      })
  void rejectsInvalidFields(String invalidFields) throws Exception {
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(wholeOrderDiscount(invalidFields)))
        .andExpect(status().isBadRequest());
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void rejectsSameVariantTwiceInTheSameRole() throws Exception {
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    body("TANG_SAN_PHAM", "TUNG_SAN_PHAM", PURCHASE + "," + GIFT + "," + GIFT, "")))
        .andExpect(status().isBadRequest());
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void distinguishesMissingAndInactiveReferences() throws Exception {
    var request =
        post(URL)
            .header("Idempotency-Key", KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                body(
                    "CHIET_KHAU",
                    "DANH_MUC",
                    "",
                    ",\"danh_muc_id\":20,\"loai_chiet_khau\":\"PHAN_TRAM\",\"gia_tri_khuyen_mai\":10"));
    mvc.perform(request).andExpect(status().isNotFound());
    when(categories.findById(20L))
        .thenReturn(
            Optional.of(
                DanhMuc.builder().id(20L).trangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG).build()));
    mvc.perform(request).andExpect(status().isConflict());
    verify(programs, never()).saveAndFlush(any());
  }

  @Test
  void rejectsMissingOrMalformedIdempotencyKey() throws Exception {
    mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(wholeOrderDiscount("")))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", "bad")
                .contentType(MediaType.APPLICATION_JSON)
                .content(wholeOrderDiscount("")))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(idempotency);
  }

  private String wholeOrderDiscount(String extra) {
    return body(
        "CHIET_KHAU",
        "TONG_DON",
        "",
        ",\"loai_chiet_khau\":\"SO_TIEN\",\"gia_tri_khuyen_mai\":50000" + extra);
  }

  private String body(String method, String scope, String lines, String extra) {
    return """
    {
      "ma_chuong_trinh":"km03test",
      "ten_chuong_trinh":"Chương trình test KM03",
      "phuong_thuc_khuyen_mai":"%s",
      "doi_tuong_khuyen_mai":"%s",
      "gia_tri_hang_toi_thieu":2000000,
      "ngay_bat_dau":"2026-10-12T00:00:00+07:00",
      "ngay_ket_thuc":"2026-12-01T00:00:00+07:00",
      "chi_tiet_khuyen_mai":[%s]%s
    }
    """
        .formatted(method, scope, lines, extra);
  }
}
