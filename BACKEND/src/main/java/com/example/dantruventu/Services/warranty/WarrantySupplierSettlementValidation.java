package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantySupplierSettlementRequest;
import com.example.dantruventu.Error.*;
import java.math.BigDecimal;
import java.util.*;

final class WarrantySupplierSettlementValidation {
  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_SUPPLIER_SETTLEMENT;

  private WarrantySupplierSettlementValidation() {}

  static Map<String, Object> validate(AdminWarrantySupplierSettlementRequest request) {
    if (request == null) throw invalid();
    var raw = request.fields();
    String action = text(raw.get("hanh_dong"), true, 50);
    var allowed = new HashSet<>(Set.of("hanh_dong", "chung_tu_urls"));
    allowed.addAll(
        switch (action) {
          case "GHI_NGHIA_VU" ->
              Set.of("nha_cung_cap_id", "giao_dich_xuat_the_kho_id", "so_luong_can_bu", "can_cu");
          case "GUI_THIET_BI_CU" ->
              Set.of(
                  "nghia_vu_lich_su_id",
                  "thiet_bi_cu_id",
                  "nha_cung_cap_id",
                  "ten_don_vi",
                  "phu_kien",
                  "thoi_diem");
          case "DON_VI_NHAN_THIET_BI_CU" ->
              Set.of("nghia_vu_lich_su_id", "lan_gui_lich_su_id", "nguoi_nhan", "thoi_diem");
          case "NHAN_HANG_BU" ->
              Set.of(
                  "nghia_vu_lich_su_id",
                  "phien_ban_id",
                  "so_luong",
                  "serials",
                  "quyen_so_huu",
                  "tinh_trang",
                  "thoi_diem",
                  "can_cu_so_huu",
                  "so_luong_ban_lai",
                  "so_luong_can_xu_ly");
          case "NHAN_THIET_BI_CU" ->
              Set.of(
                  "nghia_vu_lich_su_id", "thiet_bi_id", "tinh_trang", "quyen_so_huu", "thoi_diem");
          case "CHOT_PHUONG_AN_KHAC" ->
              Set.of(
                  "nghia_vu_lich_su_id",
                  "noi_dung",
                  "can_cu",
                  "so_luong_quy_doi_duoc_chot",
                  "so_tien_nghia_vu",
                  "hinh_thuc_doi_soat",
                  "thiet_bi_id",
                  "nhan_thiet_bi_cu_lich_su_id",
                  "quyen_so_huu",
                  "can_cu_so_huu",
                  "phien_ban_id",
                  "so_luong",
                  "so_luong_ban_lai",
                  "so_luong_can_xu_ly",
                  "ket_qua_kiem_tra");
          case "GHI_NCC_TU_CHOI" ->
              Set.of("nghia_vu_lich_su_id", "ly_do", "quyet_dinh_xu_ly", "can_cu");
          default -> throw invalid();
        });
    if (!allowed.containsAll(raw.keySet())) throw invalid();
    var result = new LinkedHashMap<String, Object>();
    result.put("hanh_dong", action);
    result.put("chung_tu_urls", urls(raw.get("chung_tu_urls")));
    boolean oldConversion = "THIET_BI_CU_LAM_HANG_BU".equals(raw.get("hinh_thuc_doi_soat"));
    if (action.equals("CHOT_PHUONG_AN_KHAC")) {
      if (raw.get("hinh_thuc_doi_soat") != null
          && !oldConversion
          && !"TIEN".equals(raw.get("hinh_thuc_doi_soat"))) throw invalid();
      result.put("hinh_thuc_doi_soat", oldConversion ? "THIET_BI_CU_LAM_HANG_BU" : "TIEN");
      for (String field :
          List.of(
              "thiet_bi_id",
              "nhan_thiet_bi_cu_lich_su_id",
              "quyen_so_huu",
              "can_cu_so_huu",
              "phien_ban_id",
              "so_luong",
              "so_luong_ban_lai",
              "so_luong_can_xu_ly",
              "ket_qua_kiem_tra")) {
        if (!oldConversion && raw.containsKey(field)) throw invalid();
        if (!oldConversion) allowed.remove(field);
      }
      result.put("so_tien_nghia_vu", money(raw.get("so_tien_nghia_vu")));
      if (oldConversion
          ? ((BigDecimal) result.get("so_tien_nghia_vu")).signum() != 0
          : ((BigDecimal) result.get("so_tien_nghia_vu")).signum() <= 0) throw invalid();
    }
    for (String field :
        List.of(
            "nghia_vu_lich_su_id",
            "nha_cung_cap_id",
            "giao_dich_xuat_the_kho_id",
            "thiet_bi_cu_id",
            "thiet_bi_id",
            "lan_gui_lich_su_id",
            "nhan_thiet_bi_cu_lich_su_id",
            "phien_ban_id"))
      if (allowed.contains(field))
        result.put(
            field,
            WarrantyWriteValidation.id(
                raw.get(field), !field.equals("giao_dich_xuat_the_kho_id"), INVALID));
    for (String field :
        List.of(
            "can_cu",
            "ten_don_vi",
            "nguoi_nhan",
            "tinh_trang",
            "noi_dung",
            "ly_do",
            "quyet_dinh_xu_ly",
            "can_cu_so_huu",
            "ket_qua_kiem_tra"))
      if (allowed.contains(field)) result.put(field, text(raw.get(field), true, 16000));
    if (allowed.contains("quyen_so_huu")) {
      String owner = text(raw.get("quyen_so_huu"), true, 50);
      if (!Set.of("CUA_HANG", "CHUA_XAC_DINH", "KHACH_HANG", "DON_VI_BAO_HANH").contains(owner))
        throw invalid();
      result.put("quyen_so_huu", owner);
    }
    for (String field : List.of("so_luong_can_bu", "so_luong", "so_luong_quy_doi_duoc_chot"))
      if (allowed.contains(field))
        result.put(field, number(raw.get(field), field.equals("so_luong_can_bu") ? 0 : 1));
    if (allowed.contains("thoi_diem"))
      result.put(
          "thoi_diem", WarrantyWriteValidation.time(text(raw.get("thoi_diem"), true, 64), INVALID));
    if (allowed.contains("serials")) {
      if (!(raw.get("serials") instanceof List<?> serials) || serials.size() > 100) throw invalid();
      var values = serials.stream().map(s -> text(s, true, 100)).toList();
      if (values.stream().map(s -> s.toLowerCase(Locale.ROOT)).distinct().count() != values.size())
        throw invalid();
      result.put("serials", values);
    }
    if (allowed.contains("so_luong_ban_lai")) {
      int quantity = (Integer) result.get("so_luong");
      boolean supplied =
          raw.containsKey("so_luong_ban_lai") || raw.containsKey("so_luong_can_xu_ly");
      int good = supplied ? number(raw.get("so_luong_ban_lai"), 0) : quantity;
      int bad = supplied ? number(raw.get("so_luong_can_xu_ly"), 0) : 0;
      if ((long) good + bad != quantity) throw invalid();
      result.put("so_luong_ban_lai", good);
      result.put("so_luong_can_xu_ly", bad);
    }
    if (allowed.contains("phu_kien")) {
      if (!(raw.get("phu_kien") instanceof List<?> accessories) || accessories.size() > 100)
        throw invalid();
      var values = new ArrayList<Map<String, Object>>();
      for (Object value : accessories) {
        if (!(value instanceof Map<?, ?> m) || !m.keySet().equals(Set.of("ten", "so_luong")))
          throw invalid();
        values.add(
            Map.of("ten", text(m.get("ten"), true, 255), "so_luong", number(m.get("so_luong"), 1)));
      }
      result.put("phu_kien", values);
    }
    return result;
  }

  private static int number(Object value, int minimum) {
    if (!(value instanceof Integer || value instanceof Long)
        || ((Number) value).longValue() < minimum
        || ((Number) value).longValue() > 100) throw invalid();
    return ((Number) value).intValue();
  }

  private static String text(Object value, boolean required, int max) {
    if (value != null && !(value instanceof String)) throw invalid();
    return WarrantyWriteValidation.text((String) value, required, max, INVALID);
  }

  private static List<String> urls(Object value) {
    if (!(value instanceof List<?> list) || list.isEmpty() || list.size() > 100) throw invalid();
    return list.stream().map(v -> text(v, true, 2048)).toList();
  }

  private static BigDecimal money(Object value) {
    try {
      if (!(value instanceof Number)) throw invalid();
      BigDecimal n =
          new BigDecimal(value.toString()).setScale(2, java.math.RoundingMode.UNNECESSARY);
      if (n.signum() < 0 || n.precision() > 15) throw invalid();
      return n;
    } catch (ArithmeticException e) {
      throw invalid();
    }
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
