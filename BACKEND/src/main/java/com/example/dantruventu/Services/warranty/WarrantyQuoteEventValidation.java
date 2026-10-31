package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyQuoteEventRequest;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.util.*;

final class WarrantyQuoteEventValidation {
  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_QUOTE_EVENT;

  private WarrantyQuoteEventValidation() {}

  static Map<String, Object> validate(AdminWarrantyQuoteEventRequest request) {
    if (request == null) throw invalid();
    var raw = request.fields();
    String action = text(raw.get("hanh_dong"), true, 50);
    Set<String> allowed =
        switch (action) {
          case "GUI" -> Set.of("hanh_dong", "kenh", "thoi_diem", "bang_chung_urls");
          case "QUYET_DINH_KHACH" ->
              Set.of("hanh_dong", "quyet_dinh", "kenh", "thoi_diem", "bang_chung_urls", "ly_do");
          case "THU_HOI" -> Set.of("hanh_dong", "ly_do", "thoi_diem");
          default -> throw invalid();
        };
    if (!allowed.containsAll(raw.keySet())) throw invalid();
    var result =
        fields(
            "hanh_dong",
            action,
            "thoi_diem",
            WarrantyWriteValidation.time(text(raw.get("thoi_diem"), true, 64), INVALID));
    if (!action.equals("THU_HOI")) {
      result.put("kenh", text(raw.get("kenh"), true, 100));
      if (!(raw.get("bang_chung_urls") instanceof List<?> urls)
          || urls.isEmpty()
          || urls.size() > 100) throw invalid();
      result.put("bang_chung_urls", urls.stream().map(u -> text(u, true, 2048)).toList());
    }
    if (action.equals("QUYET_DINH_KHACH")) {
      String decision = text(raw.get("quyet_dinh"), true, 50);
      if (!Set.of("DONG_Y", "TU_CHOI").contains(decision)) throw invalid();
      result.put("quyet_dinh", decision);
      result.put("ly_do", text(raw.get("ly_do"), false, 16000));
    } else if (action.equals("THU_HOI")) result.put("ly_do", text(raw.get("ly_do"), true, 16000));
    return result;
  }

  private static String text(Object raw, boolean required, int max) {
    if (raw != null && !(raw instanceof String)) throw invalid();
    return WarrantyWriteValidation.text((String) raw, required, max, INVALID);
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
