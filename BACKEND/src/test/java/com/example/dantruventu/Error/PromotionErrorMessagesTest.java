package com.example.dantruventu.Error;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.dantruventu.Controller.promotion.AdminPromotionController;
import com.example.dantruventu.Controller.promotion.AdminPromotionOrdersController;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionConfigurationCreateRequest;
import com.example.dantruventu.Services.AdminPromotionOrdersService;
import com.example.dantruventu.Services.AdminPromotionService;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class PromotionErrorMessagesTest {
  private static final String URL = "/api/v1/admin/promotions";
  private static final String KEY = "6cd33970-e43c-4dd2-a8f0-225737b4cc70";
  private final AdminPromotionService service = mock(AdminPromotionService.class);
  private final AdminPromotionOrdersService orders = mock(AdminPromotionOrdersService.class);
  private final JsonMapper mapper = JsonMapper.builder().build();
  private MockMvc mvc;

  @BeforeEach
  void setup() {
    // Register both advices to verify actual precedence and scope, not just helper strings.
    mvc =
        MockMvcBuilders.standaloneSetup(
                new AdminPromotionController(service),
                new AdminPromotionOrdersController(orders),
                new OtherController())
            .setControllerAdvice(new GlobalExceptionHandler(), new PromotionExceptionHandler())
            .setMessageConverters(new JacksonJsonHttpMessageConverter(mapper))
            .build();
  }

  @ParameterizedTest
  @CsvSource({
    "trang_thai_ap_dung,SAI,Trạng thái lọc không hợp lệ. Vui lòng chọn lại.",
    "tu_ngay,abc,Ngày bắt đầu lọc không hợp lệ. Vui lòng chọn lại ngày.",
    "den_ngay,2026-02-30,Ngày kết thúc lọc không hợp lệ. Vui lòng chọn lại ngày.",
    "page,abc,Số trang không hợp lệ. Vui lòng chọn lại trang cần xem.",
    "limit,abc,Số kết quả mỗi trang phải từ 1 đến 100. Vui lòng chọn lại."
  })
  void orderQueryBindingErrorsAreReadable(String field, String value, String expected)
      throws Exception {
    mvc.perform(get(URL + "/2/orders").param(field, value))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.message").value(expected))
        .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()));
    verifyNoInteractions(orders);
  }

  @ParameterizedTest
  @CsvSource({
    "trang_thai_hien_thi,SAI,Trạng thái lọc không hợp lệ. Vui lòng chọn lại.",
    "trang_thai,abc,Trạng thái khuyến mại không hợp lệ. Vui lòng chọn bật hoặc tạm dừng.",
    "doi_tuong_khuyen_mai,SAI,Phạm vi áp dụng khuyến mại không hợp lệ. Vui lòng chọn lại."
  })
  void promotionListQueryErrorsAreReadable(String field, String value, String expected)
      throws Exception {
    mvc.perform(get(URL).param(field, value))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(expected));
    verifyNoInteractions(service);
  }

  @ParameterizedTest
  @CsvSource({
    "danh_muc_id,abc,Danh mục được chọn không hợp lệ. Vui lòng chọn lại.",
    "thuong_hieu_id,abc,Thương hiệu được chọn không hợp lệ. Vui lòng chọn lại.",
    "page,abc,Số trang không hợp lệ. Vui lòng chọn lại trang cần xem.",
    "limit,abc,Số kết quả mỗi trang phải từ 1 đến 100. Vui lòng chọn lại."
  })
  void variantQueryErrorsAreReadable(String field, String value, String expected) throws Exception {
    mvc.perform(get(URL + "/variants").param(field, value))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(expected));
    verifyNoInteractions(service);
  }

  @Test
  void warehouseRestrictionDoesNotShowUseCaseOrFieldNames() throws Exception {
    mvc.perform(get(URL + "/variants").param("kho_hang_id", "2"))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message")
                .value("Danh sách sản phẩm sử dụng kho mặc định. Vui lòng bỏ lựa chọn kho khác."));
  }

  @ParameterizedTest
  @ValueSource(strings = {"/abc", "/abc/orders"})
  void invalidPathIdsAreReadable(String suffix) throws Exception {
    mvc.perform(get(URL + suffix))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message").value("Khuyến mại được chọn không hợp lệ. Vui lòng chọn lại."));
  }

  @Test
  void invalidDeleteIdUsesTheSameReadableMessage() throws Exception {
    mvc.perform(delete(URL + "/abc"))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message").value("Khuyến mại được chọn không hợp lệ. Vui lòng chọn lại."));
  }

  @ParameterizedTest
  @CsvSource({
    "phuong_thuc_khuyen_mai,Hình thức khuyến mại không hợp lệ. Vui lòng chọn giảm giá hoặc tặng"
        + " quà.",
    "doi_tuong_khuyen_mai,Phạm vi áp dụng khuyến mại không hợp lệ. Vui lòng chọn lại.",
    "loai_chiet_khau,Cách giảm giá không hợp lệ. Vui lòng chọn giảm theo phần trăm hoặc số tiền.",
    "ngay_bat_dau,Ngày bắt đầu khuyến mại không hợp lệ. Vui lòng chọn lại ngày.",
    "ngay_ket_thuc,Ngày kết thúc khuyến mại không hợp lệ. Vui lòng chọn lại ngày.",
    "trang_thai,Trạng thái khuyến mại không hợp lệ. Vui lòng chọn bật hoặc tạm dừng.",
    "so_luong_ap_dung,Số lượt áp dụng không hợp lệ. Vui lòng nhập số nguyên lớn hơn 0."
  })
  void invalidCreateValuesNameTheInputInPlainVietnamese(String field, String expected)
      throws Exception {
    var body = validBody();
    body.put(field, "SAI");
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(expected));
    verifyNoInteractions(service);
  }

  @ParameterizedTest
  @CsvSource({
    "phien_ban_id,Sản phẩm được chọn không hợp lệ. Vui lòng chọn lại.",
    "loai_ap_dung,Vai trò của sản phẩm không hợp lệ. Vui lòng chọn sản phẩm mua hoặc quà tặng.",
    "so_luong,Số lượng sản phẩm không hợp lệ. Vui lòng nhập số nguyên lớn hơn 0."
  })
  void nestedGiftErrorsAreReadable(String field, String expected) throws Exception {
    var body = validBody();
    var line = body.putArray("chi_tiet_khuyen_mai").addObject();
    line.put("phien_ban_id", 702);
    line.put("loai_ap_dung", "SAN_PHAM_TANG");
    line.put("so_luong", 1);
    line.put(field, "SAI");
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(expected));
    verifyNoInteractions(service);
  }

  @ParameterizedTest
  @ValueSource(strings = {"{", "[]", "null", ""})
  void malformedOrMissingContentDoesNotExposeParserDetails(String body) throws Exception {
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(PromotionErrorMessages.INVALID_CONTENT));
    verifyNoInteractions(service);
  }

  @ParameterizedTest
  @ValueSource(strings = {"create", "update", "status", "nested"})
  void unsupportedFieldsAreNeverEchoedBack(String operation) throws Exception {
    var body =
        operation.equals("create") || operation.equals("nested")
            ? validBody()
            : mapper.createObjectNode();
    body.put("phien_ban_cau_hinh_xac_nhan", 1);
    // Unknown field strings may themselves contain private or malicious content.
    String unknown = "private_field_<script>";
    if (operation.equals("nested")) {
      body.remove("phien_ban_cau_hinh_xac_nhan");
      var line = body.putArray("chi_tiet_khuyen_mai").addObject();
      line.put("phien_ban_id", 702);
      line.put("loai_ap_dung", "SAN_PHAM_TANG");
      line.put("so_luong", 1);
      line.put(unknown, 1);
    } else {
      body.put(unknown, 1);
      if (operation.equals("create")) body.remove("phien_ban_cau_hinh_xac_nhan");
      if (operation.equals("status")) body.remove("phien_ban_cau_hinh_xac_nhan");
    }
    var request =
        switch (operation) {
          case "update" -> patch(URL + "/6");
          case "status" -> patch(URL + "/6/status");
          default -> post(URL);
        };
    mvc.perform(
            request
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(PromotionErrorMessages.UNSUPPORTED_CONTENT));
    verifyNoInteractions(service);
  }

  @ParameterizedTest
  @ValueSource(strings = {"create", "update"})
  void missingRequestConfirmationIsReadable(String operation) throws Exception {
    var request = operation.equals("create") ? post(URL) : patch(URL + "/6");
    mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(validBody().toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(PromotionErrorMessages.REQUEST_CONFIRMATION));
  }

  @Test
  void invalidRequestConfirmationFromSharedCodeIsTranslated() throws Exception {
    when(service.createPromotion(anyString(), any()))
        .thenThrow(new AppException(ErrorCode.INVALID_DATA, "Thiếu hoặc sai định dạng UUID"));
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", "bad")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validBody().toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(PromotionErrorMessages.REQUEST_CONFIRMATION));
  }

  @Test
  void beanValidationKeepsReadableMessagesAndMachineReadableErrorDetails() throws Exception {
    var body = validBody();
    body.put("ma_chuong_trinh", "");
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Mã chương trình không được để trống"))
        .andExpect(jsonPath("$.errors[0].code").value("NotBlank"))
        .andExpect(jsonPath("$.errors[0].message").value("Mã chương trình không được để trống"));
  }

  @Test
  void nullNestedProductsDoNotLeakDefaultEnglishValidation() throws Exception {
    var body = validBody();
    body.putArray("chi_tiet_khuyen_mai").addNull();
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message")
                .value("Danh sách sản phẩm khuyến mại không hợp lệ. Vui lòng kiểm tra lại."))
        .andExpect(jsonPath("$.errors[0].code").value("NotNull"))
        .andExpect(
            jsonPath("$.errors[0].message")
                .value("Danh sách sản phẩm khuyến mại không hợp lệ. Vui lòng kiểm tra lại."));
  }

  @ParameterizedTest
  @ValueSource(strings = {"1.5", "\"2\"", "true", "999999999999999999999999"})
  void invalidNumericStatusDoesNotExposeParserOrFieldDetails(String value) throws Exception {
    mvc.perform(
            patch(URL + "/6/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"trang_thai\":" + value + "}"))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message")
                .value("Trạng thái khuyến mại không hợp lệ. Vui lòng chọn bật hoặc tạm dừng."));
    verifyNoInteractions(service);
  }

  @Test
  void invalidUpdateConfirmationDoesNotShowItsInternalFieldName() throws Exception {
    mvc.perform(
            patch(URL + "/6")
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phien_ban_cau_hinh_xac_nhan\":1.5,\"ten_chuong_trinh\":\"Tên mới\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message")
                .value(
                    "Thông tin xác nhận đã thay đổi hoặc không hợp lệ. Vui lòng tải lại chương"
                        + " trình."));
    verifyNoInteractions(service);
  }

  @Test
  void invalidCategoryValidationDoesNotDescribeDatabaseIds() throws Exception {
    var body = validBody();
    body.put("danh_muc_id", 0);
    mvc.perform(
            post(URL)
                .header("Idempotency-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message").value("Danh mục được chọn không hợp lệ. Vui lòng chọn lại."))
        .andExpect(
            jsonPath("$.errors[0].message")
                .value("Danh mục được chọn không hợp lệ. Vui lòng chọn lại."));
    verifyNoInteractions(service);
  }

  @Test
  void ruleConflictKeepsStatusCodeAndFieldAndUsesTheSameMessageInDetails() throws Exception {
    String message = "Chương trình đã có đơn liên kết, không được sửa quy tắc";
    when(service.getPromotionDetail(2L))
        .thenThrow(
            new AppException(
                ErrorCode.CONFLICT, "gia_tri_khuyen_mai", "PROMOTION_RULE_LOCKED", message));
    mvc.perform(get(URL + "/2"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value(message))
        .andExpect(jsonPath("$.errors[0].field").value("gia_tri_khuyen_mai"))
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_RULE_LOCKED"))
        .andExpect(jsonPath("$.errors[0].message").value(message));
  }

  @Test
  void technicalBusinessMessagesAreSanitizedInBothPlaces() throws Exception {
    when(service.getPromotionDetail(2L))
        .thenThrow(
            new AppException(
                ErrorCode.CONFLICT,
                "gia_tri_khuyen_mai",
                "PROMOTION_RULE_LOCKED",
                "Sai gia_tri_khuyen_mai"));
    mvc.perform(get(URL + "/2"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value(PromotionErrorMessages.INVALID_CONTENT))
        .andExpect(jsonPath("$.errors[0].code").value("PROMOTION_RULE_LOCKED"))
        .andExpect(jsonPath("$.errors[0].message").value(PromotionErrorMessages.INVALID_CONTENT));
  }

  static Stream<Arguments> infrastructureErrors() {
    return Stream.of(
        Arguments.of(
            new PessimisticLockingFailureException("SQL request_key"),
            "Khuyến mại đang được cập nhật. Vui lòng tải lại và thử lại sau."),
        Arguments.of(
            new DataIntegrityViolationException("SQL constraint_name"),
            "Chưa thể lưu khuyến mại vì thông tin bị trùng hoặc không còn phù hợp. Vui lòng tải lại"
                + " và kiểm tra."));
  }

  @ParameterizedTest
  @MethodSource("infrastructureErrors")
  void infrastructureConflictsHaveNoDatabaseOrHeaderDetails(
      RuntimeException exception, String expected) throws Exception {
    when(service.getPromotionDetail(2L)).thenThrow(exception);
    mvc.perform(get(URL + "/2"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value(expected));
  }

  @Test
  void catalogExceptionsFromSharedServicesAlsoUseFriendlyMessages() throws Exception {
    when(service.getPromotionDetail(2L))
        .thenThrow(CatalogException.bad("phien_ban_id", "INVALID_VARIANT", "Sai phien_ban_id"));
    mvc.perform(get(URL + "/2"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(PromotionErrorMessages.INVALID_CONTENT))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_VARIANT"));
  }

  @Test
  void unrelatedControllersKeepTheirOriginalGlobalErrorBehavior() throws Exception {
    mvc.perform(get("/test/other").param("page", "abc"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Tham số không đúng kiểu dữ liệu: page"));
  }

  @Test
  void malformedPartialUpdateKeepsTheSpecificInputLabel() {
    var body = validBody();
    body.put("gia_tri_khuyen_mai", "SAI");
    var exception =
        assertThrows(
            RuntimeException.class,
            () -> mapper.treeToValue(body, AdminPromotionConfigurationCreateRequest.class));
    assertEquals(
        "Mức giảm giá không hợp lệ. Vui lòng nhập số tiền hoặc tỷ lệ giảm phù hợp.",
        PromotionErrorMessages.unreadable(exception));
  }

  private ObjectNode validBody() {
    return (ObjectNode)
        mapper.readTree(
            """
            {
              "ma_chuong_trinh":"MESSAGE_TEST",
              "ten_chuong_trinh":"Khuyến mại thử thông báo",
              "phuong_thuc_khuyen_mai":"CHIET_KHAU",
              "doi_tuong_khuyen_mai":"TONG_DON",
              "loai_chiet_khau":"SO_TIEN",
              "gia_tri_khuyen_mai":100000,
              "ngay_bat_dau":"2026-11-01T00:00:00+07:00",
              "ngay_ket_thuc":"2026-12-31T23:59:59+07:00",
              "chi_tiet_khuyen_mai":[]
            }
            """);
  }

  @RestController
  static class OtherController {
    @GetMapping("/test/other")
    String get(@RequestParam("page") int page) {
      return "ok";
    }
  }
}
