package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;

import com.example.dantruventu.DTO.Request.order.AdminReturnRejectRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

class AdminReturnRejectRequestTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void documentedBodyIsAccepted() {
    var request =
        mapper.readValue(
            """
        {"ly_do":"Hàng thực nhận không đúng thiết bị được yêu cầu",
         "can_cu":"Đối chiếu serial và hóa đơn",
         "bang_chung_urls":["/uploads/tu-choi-300.jpg"]}
        """,
            AdminReturnRejectRequest.class);
    assertEquals("Đối chiếu serial và hóa đơn", request.getCanCu());
    assertEquals(java.util.List.of("/uploads/tu-choi-300.jpg"), request.getBangChungUrls());
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertTrue(factory.getValidator().validate(request).isEmpty());
    }
  }

  @Test
  void reasonAndBasisAreBothRequired() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      for (String json :
          new String[] {
            "{}",
            "{\"ly_do\":\"Sai hàng\"}",
            "{\"can_cu\":\"Biên bản\"}",
            "{\"ly_do\":null,\"can_cu\":\"Biên bản\"}",
            "{\"ly_do\":\"Sai hàng\",\"can_cu\":null}",
            "{\"ly_do\":\" \",\"can_cu\":\"Biên bản\"}",
            "{\"ly_do\":\"Sai hàng\",\"can_cu\":\" \"}"
          }) {
        var request = mapper.readValue(json, AdminReturnRejectRequest.class);
        assertFalse(factory.getValidator().validate(request).isEmpty(), json);
      }
    }
  }

  @Test
  void optionalEvidenceDoesNotMakeAnEmptyArrayMandatory() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      for (String suffix :
          new String[] {"", ",\"bang_chung_urls\":null", ",\"bang_chung_urls\":[]"}) {
        String json = "{\"ly_do\":\"Sai hàng\",\"can_cu\":\"Biên bản\"" + suffix + "}";
        var request = mapper.readValue(json, AdminReturnRejectRequest.class);
        assertTrue(factory.getValidator().validate(request).isEmpty());
      }
    }
  }

  @Test
  void nullAndBlankEvidenceEntriesAreNotValidEvidence() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      for (String entry : new String[] {"null", "\"\"", "\" \""}) {
        var request =
            mapper.readValue(
                "{\"ly_do\":\"Sai hàng\",\"can_cu\":\"Biên bản\",\"bang_chung_urls\":["
                    + entry
                    + "]}",
                AdminReturnRejectRequest.class);
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
          "da_giai_phong_quyen_tra",
          "muc_dich_ket_thuc",
          "du_lieu_nhan_hang"
        }) {
      String json = "{\"ly_do\":\"Sai hàng\",\"can_cu\":\"Biên bản\",\"" + field + "\":false}";
      assertThrows(
          JacksonException.class,
          () -> mapper.readValue(json, AdminReturnRejectRequest.class),
          field);
    }
  }

  @Test
  void evidenceObjectCannotBePassedAsArrayOfUrls() {
    assertThrows(
        JacksonException.class,
        () ->
            mapper.readValue(
                """
        {"ly_do":"Sai hàng","can_cu":"Biên bản","bang_chung_urls":{"url":"/uploads/a.jpg"}}
        """,
                AdminReturnRejectRequest.class));
  }
}
