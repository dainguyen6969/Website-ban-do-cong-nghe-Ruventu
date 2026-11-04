package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyHandoverRequest;
import com.example.dantruventu.Error.*;
import java.util.*;

final class WarrantyHandoverValidation {
  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_HANDOVER;

  private WarrantyHandoverValidation() {}

  static Map<String, Object> validate(AdminWarrantyHandoverRequest request) {
    if (request == null) throw invalid();
    var raw = request.fields();
    var allowed =
        Set.of(
            "thiet_bi_ban_giao_id",
            "ten_nguoi_nhan",
            "sdt_nguoi_nhan",
            "thoi_diem",
            "tinh_trang",
            "phu_kien",
            "xac_nhan_khach",
            "bang_chung_urls",
            "phe_duyet_cong_no_lich_su_id",
            "ghi_chu",
            "phien_ban_phuong_an");
    if (!allowed.containsAll(raw.keySet()) || !Boolean.TRUE.equals(raw.get("xac_nhan_khach")))
      throw invalid();
    var result = new LinkedHashMap<String, Object>();
    result.put(
        "thiet_bi_ban_giao_id",
        WarrantyWriteValidation.id(raw.get("thiet_bi_ban_giao_id"), true, INVALID));
    result.put(
        "phe_duyet_cong_no_lich_su_id",
        WarrantyWriteValidation.id(raw.get("phe_duyet_cong_no_lich_su_id"), false, INVALID));
    Long version = WarrantyWriteValidation.id(raw.get("phien_ban_phuong_an"), false, INVALID);
    if (version != null && version > Integer.MAX_VALUE) throw invalid();
    result.put("phien_ban_phuong_an", version);
    result.put("ten_nguoi_nhan", text(raw.get("ten_nguoi_nhan"), true, 100));
    result.put(
        "sdt_nguoi_nhan",
        WarrantyWriteValidation.phone(text(raw.get("sdt_nguoi_nhan"), true, 20), INVALID));
    result.put("tinh_trang", text(raw.get("tinh_trang"), true, 16000));
    result.put("ghi_chu", text(raw.get("ghi_chu"), false, 16000));
    result.put(
        "thoi_diem", WarrantyWriteValidation.time(text(raw.get("thoi_diem"), true, 64), INVALID));
    result.put("xac_nhan_khach", true);
    if (!(raw.get("bang_chung_urls") instanceof List<?> urls)
        || urls.isEmpty()
        || urls.size() > 100) throw invalid();
    result.put("bang_chung_urls", urls.stream().map(v -> text(v, true, 2048)).toList());
    if (!(raw.get("phu_kien") instanceof List<?> accessories) || accessories.size() > 100)
      throw invalid();
    var values = new ArrayList<Map<String, Object>>();
    for (Object value : accessories) {
      if (!(value instanceof Map<?, ?> item) || !item.keySet().equals(Set.of("ten", "so_luong")))
        throw invalid();
      Long quantity = WarrantyWriteValidation.id(item.get("so_luong"), true, INVALID);
      if (quantity > Integer.MAX_VALUE) throw invalid();
      values.add(Map.of("ten", text(item.get("ten"), true, 255), "so_luong", quantity));
    }
    result.put("phu_kien", values);
    return result;
  }

  private static String text(Object value, boolean required, int max) {
    if (value != null && !(value instanceof String)) throw invalid();
    return WarrantyWriteValidation.text((String) value, required, max, INVALID);
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
