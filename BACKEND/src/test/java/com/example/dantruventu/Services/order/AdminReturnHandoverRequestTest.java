package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;

import com.example.dantruventu.DTO.Request.order.AdminReturnHandoverRequest;
import jakarta.validation.Validation;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

class AdminReturnHandoverRequestTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void documentedInputBindsOffsetDateAndPassesValidation() {
    var request = parse(body());
    assertTrue(request.getXacNhanTraDuHang());
    assertEquals("+07:00", request.getNgayBanGiao().getOffset().toString());
    assertEquals(1, request.getHangBanGiao().getFirst().getSoLuong());
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertTrue(factory.getValidator().validate(request).isEmpty());
    }
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "xac_nhan_tra_du_hang",
        "ten_nguoi_nhan",
        "sdt_nguoi_nhan",
        "ngay_ban_giao",
        "hang_ban_giao",
        "bang_chung_urls"
      })
  void missingAndNullRequiredFieldsAreRejected(String field) {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var body = body();
      body.remove(field);
      assertFalse(factory.getValidator().validate(parse(body)).isEmpty());
      body.put(field, null);
      assertFalse(factory.getValidator().validate(parse(body)).isEmpty());
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"ma_muc_nhan", "so_luong", "tinh_trang"})
  void missingItemIdentityQuantityAndConditionAreRejected(String field) {
    var body = body();
    var item = item();
    item.remove(field);
    body.put("hang_ban_giao", List.of(item));
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertFalse(factory.getValidator().validate(parse(body)).isEmpty());
    }
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "trang_thai_tra_hang",
        "muc_dich_ket_thuc",
        "nguoi_thuc_hien_id",
        "ngay_ket_thuc",
        "dang_giu_hang",
        "da_giai_phong_quyen_tra",
        "so_tien",
        "phieu_chi",
        "du_lieu_nhan_hang"
      })
  void clientCannotChooseServerManagedFields(String field) {
    var body = body();
    body.put(field, "HUY");
    assertThrows(JacksonException.class, () -> parse(body));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "thiet_bi_id",
        "phien_ban_id",
        "so_serial_id",
        "chi_tiet_tra_hang_id",
        "kho_hang_id",
        "nguoi_thuc_hien_id"
      })
  void itemCannotInjectDeviceWarehouseOrActor(String field) {
    var body = body();
    var item = item();
    item.put(field, 999);
    body.put("hang_ban_giao", List.of(item));
    assertThrows(JacksonException.class, () -> parse(body));
  }

  @ParameterizedTest
  @ValueSource(strings = {"1.5", "2147483648", "\"1\"", "true", "{}", "[]"})
  void quantityIsNotSilentlyTruncatedOrCoercedFromAnotherJsonType(String quantity) {
    String json =
        mapper.writeValueAsString(body()).replace("\"so_luong\":1", "\"so_luong\":" + quantity);
    assertThrows(
        JacksonException.class, () -> mapper.readValue(json, AdminReturnHandoverRequest.class));
  }

  @ParameterizedTest
  @ValueSource(strings = {"1", "\"true\"", "{}", "[]"})
  void confirmationMustBeAJsonBoolean(String confirmation) {
    String json =
        mapper
            .writeValueAsString(body())
            .replace("\"xac_nhan_tra_du_hang\":true", "\"xac_nhan_tra_du_hang\":" + confirmation);
    assertThrows(
        JacksonException.class, () -> mapper.readValue(json, AdminReturnHandoverRequest.class));
  }

  @Test
  void falseConfirmationAndEmptyEvidenceAreInvalid() {
    var body = body();
    body.put("xac_nhan_tra_du_hang", false);
    body.put("bang_chung_urls", List.of());
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var errors = factory.getValidator().validate(parse(body));
      assertTrue(
          errors.stream().anyMatch(e -> e.getPropertyPath().toString().equals("xacNhanTraDuHang")));
      assertTrue(
          errors.stream().anyMatch(e -> e.getPropertyPath().toString().equals("bangChungUrls")));
    }
  }

  @Test
  void emptyAccessoryListIsSupportedAndNullOrBlankEntriesAreNot() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var body = body();
      var item = item();
      item.put("phu_kien", List.of());
      body.put("hang_ban_giao", List.of(item));
      assertTrue(factory.getValidator().validate(parse(body)).isEmpty());
      item.put("phu_kien", null);
      assertFalse(factory.getValidator().validate(parse(body)).isEmpty());
      item.put("phu_kien", List.of(" "));
      assertFalse(factory.getValidator().validate(parse(body)).isEmpty());
    }
  }

  @Test
  void dateMustContainTimezoneAndEvidenceMustBeAnArray() {
    var invalidDate = body();
    invalidDate.put("ngay_ban_giao", "2026-10-12T12:30:00");
    assertThrows(JacksonException.class, () -> parse(invalidDate));
    var invalid = body();
    invalid.put("bang_chung_urls", Map.of("url", "/uploads/a.jpg"));
    assertThrows(JacksonException.class, () -> parse(invalid));
  }

  private AdminReturnHandoverRequest parse(Map<String, Object> body) {
    return mapper.readValue(mapper.writeValueAsString(body), AdminReturnHandoverRequest.class);
  }

  private Map<String, Object> body() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("xac_nhan_tra_du_hang", true);
    body.put("ten_nguoi_nhan", "Nguyễn Văn An");
    body.put("sdt_nguoi_nhan", "0912345678");
    body.put("ngay_ban_giao", "2026-10-12T12:30:00+07:00");
    body.put("hang_ban_giao", List.of(item()));
    body.put("bang_chung_urls", List.of("/uploads/ban-giao-lai-300.jpg"));
    return body;
  }

  private Map<String, Object> item() {
    return new LinkedHashMap<>(
        Map.of(
            "ma_muc_nhan",
            "HN-1",
            "so_luong",
            1,
            "tinh_trang",
            "Theo biên bản kiểm tra",
            "phu_kien",
            List.of("Hộp")));
  }
}
