package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.dantruventu.DTO.Request.order.AdminReturnPreviewRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

class AdminReturnPreviewRequestTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void documentedBodyAcceptsIntegerIdsAndQuantityAndNullApproval() {
    var request = mapper.readValue(body("1001", "2001", "1"), AdminReturnPreviewRequest.class);
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
          () -> mapper.readValue(body("1001", "2001", quantity), AdminReturnPreviewRequest.class));
    }
    assertThrows(
        JacksonException.class,
        () -> mapper.readValue(body("1001.5", "2001", "1"), AdminReturnPreviewRequest.class));
    assertThrows(
        JacksonException.class,
        () ->
            mapper.readValue(
                body("1001", "9223372036854775808", "1"), AdminReturnPreviewRequest.class));
  }

  @Test
  void clientSuppliedMoneyOrStatusIsRejected() {
    String topLevel =
        body("1001", "2001", "1")
            .replace(
                "\"phe_duyet_ngoai_le\":null", "\"phe_duyet_ngoai_le\":null,\"tong_tien_hoan\":1");
    assertThrows(
        JacksonException.class, () -> mapper.readValue(topLevel, AdminReturnPreviewRequest.class));
    String nested =
        body("1001", "2001", "1").replace("\"so_luong\":1", "\"so_luong\":1,\"don_gia_hoan\":1");
    assertThrows(
        JacksonException.class, () -> mapper.readValue(nested, AdminReturnPreviewRequest.class));
  }

  @Test
  void zeroQuantityAndNullLinesFailBeanValidation() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      assertTrue(
          !validator
              .validate(
                  mapper.readValue(body("1001", "2001", "0"), AdminReturnPreviewRequest.class))
              .isEmpty());
      assertTrue(
          !validator
              .validate(
                  mapper.readValue(
                      "{\"don_hang_id\":1001,\"chi_tiet_tra\":[null]}",
                      AdminReturnPreviewRequest.class))
              .isEmpty());
    }
  }

  private String body(String orderId, String lineId, String quantity) {
    return "{\"don_hang_id\":"
        + orderId
        + ",\"chi_tiet_tra\":[{\"chi_tiet_don_hang_id\":"
        + lineId
        + ",\"so_luong\":"
        + quantity
        + "}],\"phe_duyet_ngoai_le\":null}";
  }
}
