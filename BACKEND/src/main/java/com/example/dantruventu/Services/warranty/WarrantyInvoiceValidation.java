package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyInvoiceRequest;
import com.example.dantruventu.Error.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

final class WarrantyInvoiceValidation {
  private WarrantyInvoiceValidation() {}

  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_INVOICE;

  static Map<String, Object> validate(AdminWarrantyInvoiceRequest request) {
    if (request == null) throw invalid();
    var raw = request.fields();
    String action = text(raw.get("hanh_dong"), 50);
    Set<String> allowed =
        switch (action) {
          case "AP_DUNG_BAO_GIA_DA_DUYET" -> Set.of("hanh_dong", "phien_ban_bao_gia", "ly_do");
          case "HUY" -> Set.of("hanh_dong", "hoa_don_id", "ly_do", "can_cu", "bang_chung_urls");
          case "DUYET_MIEN_GIAM" ->
              Set.of("hanh_dong", "hoa_don_id", "so_tien_mien_giam", "ly_do", "can_cu");
          case "DUYET_CONG_NO" ->
              Set.of(
                  "hanh_dong", "hoa_don_id", "so_tien_cong_no_toi_da", "han_thanh_toan", "ly_do");
          default -> throw invalid();
        };
    if (!allowed.containsAll(raw.keySet())) throw invalid();
    var result = new LinkedHashMap<String, Object>();
    result.put("hanh_dong", action);
    result.put("ly_do", text(raw.get("ly_do"), 16000));
    if (action.equals("AP_DUNG_BAO_GIA_DA_DUYET")) {
      Long version = WarrantyWriteValidation.id(raw.get("phien_ban_bao_gia"), true, INVALID);
      if (version > Integer.MAX_VALUE) throw invalid();
      result.put("phien_ban_bao_gia", version.intValue());
    } else {
      result.put("hoa_don_id", WarrantyWriteValidation.id(raw.get("hoa_don_id"), true, INVALID));
    }
    if (Set.of("HUY", "DUYET_MIEN_GIAM").contains(action))
      result.put("can_cu", text(raw.get("can_cu"), 16000));
    if (action.equals("HUY")) {
      if (!(raw.get("bang_chung_urls") instanceof List<?> urls)
          || urls.isEmpty()
          || urls.size() > 100) throw invalid();
      result.put("bang_chung_urls", urls.stream().map(v -> text(v, 2048)).toList());
    }
    if (action.equals("DUYET_MIEN_GIAM"))
      result.put("so_tien_mien_giam", money(raw.get("so_tien_mien_giam")));
    if (action.equals("DUYET_CONG_NO")) {
      result.put("so_tien_cong_no_toi_da", money(raw.get("so_tien_cong_no_toi_da")));
      String due = text(raw.get("han_thanh_toan"), 10);
      try {
        if (!due.matches("\\d{4}-\\d{2}-\\d{2}")) throw invalid();
        LocalDate.parse(due);
      } catch (DateTimeException e) {
        throw invalid();
      }
      // Compare with today's VN date only after replay, so successful retries remain valid.
      result.put("han_thanh_toan", due);
    }
    return result;
  }

  private static BigDecimal money(Object raw) {
    try {
      BigDecimal value = WarrantyQuoteValidation.money(raw);
      if (value.signum() <= 0) throw invalid();
      return value;
    } catch (AppException e) {
      throw invalid();
    }
  }

  private static String text(Object raw, int max) {
    if (!(raw instanceof String s)) throw invalid();
    return WarrantyWriteValidation.text(s, true, max, INVALID);
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
