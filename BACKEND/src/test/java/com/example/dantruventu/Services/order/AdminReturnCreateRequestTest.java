package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.dantruventu.DTO.Request.order.AdminReturnCreateRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

class AdminReturnCreateRequestTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void documentedBodyAcceptsIntegerIdsAndQuantityAndNullApproval() {
    var request = mapper.readValue(body("1001", "2001", "1"), AdminReturnCreateRequest.class);
    assertEquals(1001L, request.getDonHangId());
    assertEquals(1, request.getChiTietTra().getFirst().getSoLuong());
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertTrue(factory.getValidator().validate(request).isEmpty());
    }
  }

  @Test
  void fractionalOrStringNumbersAreNotSilentlyCoerced() {
    for (String quantity : new String[] {"1.5", "1.0", "\"1\"", "true", "2147483648"}) {
      assertThrows(
          JacksonException.class,
          () -> mapper.readValue(body("1001", "2001", quantity), AdminReturnCreateRequest.class));
    }
    assertThrows(
        JacksonException.class,
        () -> mapper.readValue(body("1001.5", "2001", "1"), AdminReturnCreateRequest.class));
    assertThrows(
        JacksonException.class,
        () ->
            mapper.readValue(
                body("1001", "9223372036854775808", "1"), AdminReturnCreateRequest.class));
  }

  @Test
  void clientSuppliedMoneyStatusReceiptCustomerOrActorIsRejected() {
    for (String field :
        new String[] {
          "tong_tien",
          "tong_tien_hoan",
          "trang_thai_tra_hang",
          "da_nhan_hang",
          "hang_nhan",
          "khach_hang_id",
          "nguoi_tao_id",
          "ngay_tao",
          "du_lieu_nhan_hang"
        }) {
      String json =
          body("1001", "2001", "1")
              .replace(
                  "\"phe_duyet_ngoai_le\":null", "\"phe_duyet_ngoai_le\":null,\"" + field + "\":1");
      assertThrows(
          JacksonException.class,
          () -> mapper.readValue(json, AdminReturnCreateRequest.class),
          field);
    }
    String nested =
        body("1001", "2001", "1").replace("\"so_luong\":1", "\"so_luong\":1,\"don_gia_hoan\":1");
    assertThrows(
        JacksonException.class, () -> mapper.readValue(nested, AdminReturnCreateRequest.class));
  }

  @Test
  void nestedZeroQuantityAndNullLinesFailTheirOwnValidation() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      var zero = mapper.readValue(body("1001", "2001", "0"), AdminReturnCreateRequest.class);
      assertTrue(
          validator.validate(zero).stream()
              .anyMatch(
                  error -> error.getPropertyPath().toString().equals("chiTietTra[0].soLuong")));
      var nullLine = mapper.readValue(body("1001", "2001", "1"), AdminReturnCreateRequest.class);
      nullLine.setChiTietTra(java.util.Collections.singletonList(null));
      assertTrue(
          validator.validate(nullLine).stream()
              .anyMatch(error -> error.getPropertyPath().toString().startsWith("chiTietTra[0]")));
    }
  }

  @Test
  void contactReasonAndRefundMethodAreMandatoryForGuestOrders() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      var request = mapper.readValue(body("1001", "2001", "1"), AdminReturnCreateRequest.class);
      request.setTenNguoiLienHe(null);
      request.setSdtNguoiLienHe(" ");
      request.setLyDoTra("");
      request.setHinhThucHoanTien(null);
      var paths =
          validator.validate(request).stream()
              .map(error -> error.getPropertyPath().toString())
              .collect(java.util.stream.Collectors.toSet());
      assertTrue(
          paths.containsAll(
              java.util.Set.of("tenNguoiLienHe", "sdtNguoiLienHe", "lyDoTra", "hinhThucHoanTien")));
    }
  }

  @Test
  void contactLengthsAndSupportedPaymentMethodsFollowTheContract() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      var request = mapper.readValue(body("1001", "2001", "1"), AdminReturnCreateRequest.class);
      request.setHinhThucHoanTien("CHUYEN_KHOAN");
      assertTrue(validator.validate(request).isEmpty());
      request.setTenNguoiLienHe("A".repeat(101));
      request.setSdtNguoiLienHe("1".repeat(21));
      request.setHinhThucHoanTien("THE");
      var paths =
          validator.validate(request).stream()
              .map(error -> error.getPropertyPath().toString())
              .collect(java.util.stream.Collectors.toSet());
      assertTrue(
          paths.containsAll(
              java.util.Set.of("tenNguoiLienHe", "sdtNguoiLienHe", "hinhThucHoanTien")));
    }
  }

  private String body(String orderId, String lineId, String quantity) {
    return "{\"don_hang_id\":"
        + orderId
        + ",\"ten_nguoi_lien_he\":\"Nguyễn Văn An\",\"sdt_nguoi_lien_he\":\"0912345678\""
        + ",\"ly_do_tra\":\"Không còn nhu cầu\",\"hinh_thuc_hoan_tien\":\"TIEN_MAT\""
        + ",\"chi_tiet_tra\":[{\"chi_tiet_don_hang_id\":"
        + lineId
        + ",\"so_luong\":"
        + quantity
        + "}],\"phe_duyet_ngoai_le\":null}";
  }
}
