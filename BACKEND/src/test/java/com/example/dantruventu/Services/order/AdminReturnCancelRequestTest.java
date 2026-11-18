package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;

import com.example.dantruventu.DTO.Request.order.AdminReturnCancelRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

class AdminReturnCancelRequestTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void documentedBodyIsAccepted() {
    var request =
        mapper.readValue(
            "{\"ly_do\":\"Khách yêu cầu dừng trả hàng\"}", AdminReturnCancelRequest.class);
    assertEquals("Khách yêu cầu dừng trả hàng", request.getLyDo());
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertTrue(factory.getValidator().validate(request).isEmpty());
    }
  }

  @Test
  void missingNullAndWhitespaceReasonFailValidation() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      for (String json : new String[] {"{}", "{\"ly_do\":null}", "{\"ly_do\":\" \"}"}) {
        var request = mapper.readValue(json, AdminReturnCancelRequest.class);
        assertFalse(factory.getValidator().validate(request).isEmpty());
      }
    }
  }

  @Test
  void clientCannotSupplyCustodyStatusActorOrMoney() {
    for (String field :
        new String[] {
          "dang_giu_hang",
          "trang_thai_tra_hang",
          "nguoi_thuc_hien_id",
          "so_tien",
          "ngay_ket_thuc",
          "da_giai_phong_quyen_tra"
        }) {
      String json = "{\"ly_do\":\"Hủy\",\"" + field + "\":false}";
      assertThrows(
          JacksonException.class,
          () -> mapper.readValue(json, AdminReturnCancelRequest.class),
          field);
    }
  }
}
