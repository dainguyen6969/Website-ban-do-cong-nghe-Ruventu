package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;

import com.example.dantruventu.DTO.Request.order.AdminReturnInspectionRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

class AdminReturnInspectionRequestTest {

  static final String BODY =
      """
      {"ngay_tiep_nhan_thuc_te":"2026-10-12T11:30:00+07:00",
       "nguoi_giao":"Nguyễn Văn An","hang_thuc_nhan":[{
       "chi_tiet_tra_hang_id":500,"thiet_bi_id":null,"so_luong":1,
       "so_serial":"MA-KHONG-KHOP","dau_hieu_nhan_dang":"Tem kiện",
       "tinh_trang":"Đang kiểm tra","phu_kien":["Hộp"]}],
       "ket_qua_kiem_tra":"Chưa kết luận nhận trả","bang_chung_urls":["/uploads/intake.jpg"]}
      """;
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void documentedBodyRetainsAnUnknownDeviceAndTheSuppliedOffset() {
    var input = json.readValue(BODY, AdminReturnInspectionRequest.class);
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertTrue(factory.getValidator().validate(input).isEmpty());
    }
    assertNull(input.getHangThucNhan().getFirst().getThietBiId());
    assertEquals("+07:00", input.getNgayTiepNhanThucTe().getOffset().toString());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "fraction",
        "quantity-string",
        "quantity-overflow",
        "line-fraction",
        "device-fraction",
        "unknown-root",
        "unknown-item",
        "client-code",
        "local-date"
      })
  void malformedJsonCannotChangeTheContract(String variant) {
    String input =
        switch (variant) {
          case "fraction" -> BODY.replace("\"so_luong\":1", "\"so_luong\":1.5");
          case "quantity-string" -> BODY.replace("\"so_luong\":1", "\"so_luong\":\"1\"");
          case "quantity-overflow" -> BODY.replace("\"so_luong\":1", "\"so_luong\":2147483648");
          case "line-fraction" ->
              BODY.replace("\"chi_tiet_tra_hang_id\":500", "\"chi_tiet_tra_hang_id\":500.5");
          case "device-fraction" -> BODY.replace("\"thiet_bi_id\":null", "\"thiet_bi_id\":801.5");
          case "unknown-root" ->
              BODY.replace("\"nguoi_giao\":", "\"dang_giu_hang\":false,\"nguoi_giao\":");
          case "unknown-item" ->
              BODY.replace("\"thiet_bi_id\":null", "\"kho_hang_id\":1,\"thiet_bi_id\":null");
          case "client-code" ->
              BODY.replace(
                  "\"thiet_bi_id\":null", "\"ma_muc_nhan\":\"HN-FAKE\",\"thiet_bi_id\":null");
          case "local-date" -> BODY.replace("2026-10-12T11:30:00+07:00", "2026-10-12T11:30:00");
          default -> throw new IllegalArgumentException();
        };
    assertThrows(
        RuntimeException.class, () -> json.readValue(input, AdminReturnInspectionRequest.class));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "no-time",
        "no-person",
        "no-items",
        "null-item",
        "zero-line",
        "zero-quantity",
        "no-condition",
        "null-accessories",
        "blank-accessory",
        "no-conclusion",
        "no-proof",
        "blank-proof"
      })
  void incompleteBodiesFailBeanValidation(String variant) {
    String input =
        switch (variant) {
          case "no-time" -> BODY.replace("\"2026-10-12T11:30:00+07:00\"", "null");
          case "no-person" -> BODY.replace("Nguyễn Văn An", " ");
          case "no-items" ->
              BODY.replace(BODY.substring(BODY.indexOf("[{"), BODY.indexOf("}],") + 2), "[]");
          case "null-item" ->
              BODY.replace(BODY.substring(BODY.indexOf("[{"), BODY.indexOf("}],") + 2), "[null]");
          case "zero-line" ->
              BODY.replace("\"chi_tiet_tra_hang_id\":500", "\"chi_tiet_tra_hang_id\":0");
          case "zero-quantity" -> BODY.replace("\"so_luong\":1", "\"so_luong\":0");
          case "no-condition" -> BODY.replace("Đang kiểm tra", " ");
          case "null-accessories" -> BODY.replace("[\"Hộp\"]", "null");
          case "blank-accessory" -> BODY.replace("[\"Hộp\"]", "[\" \"]");
          case "no-conclusion" -> BODY.replace("Chưa kết luận nhận trả", " ");
          case "no-proof" -> BODY.replace("[\"/uploads/intake.jpg\"]", "[]");
          case "blank-proof" -> BODY.replace("[\"/uploads/intake.jpg\"]", "[null]");
          default -> throw new IllegalArgumentException();
        };
    var request = json.readValue(input, AdminReturnInspectionRequest.class);
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertFalse(factory.getValidator().validate(request).isEmpty());
    }
  }
}
