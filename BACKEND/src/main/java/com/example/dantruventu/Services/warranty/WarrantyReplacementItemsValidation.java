package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyReplacementItemsRequest;
import com.example.dantruventu.Error.*;
import java.util.*;

final class WarrantyReplacementItemsValidation {
  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_REPLACEMENT_ITEMS;

  private WarrantyReplacementItemsValidation() {}

  static Map<String, Object> validate(AdminWarrantyReplacementItemsRequest request) {
    if (request == null) throw invalid();
    var raw = request.fields();
    String action = text(raw.get("hanh_dong"), true, 50);
    var allowed = new HashSet<String>(Set.of("hanh_dong"));
    switch (action) {
      case "GIU_CHO_HANG_CUA_HANG" ->
          allowed.addAll(
              List.of("phien_ban_phuong_an", "so_serial_id", "phien_ban_id", "so_luong"));
      case "XUAT_HANG_DOI" ->
          allowed.addAll(
              List.of(
                  "phien_ban_phuong_an",
                  "giu_cho_lich_su_id",
                  "dau_hieu_nhan_dang",
                  "thoi_diem",
                  "chung_tu_urls"));
      case "NHAN_HANG_DON_VI" ->
          allowed.addAll(
              List.of(
                  "phien_ban_phuong_an",
                  "nha_cung_cap_id",
                  "phien_ban_thuc_nhan_id",
                  "so_serial_thuc_nhan",
                  "dau_hieu_nhan_dang",
                  "tinh_trang",
                  "phu_kien",
                  "thoi_diem",
                  "chung_tu_urls",
                  "sai_lech"));
      case "HOAN_XUAT_HANG_DOI" ->
          allowed.addAll(
              List.of(
                  "giao_dich_xuat_the_kho_id",
                  "so_serial_thuc_nhan",
                  "dau_hieu_nhan_dang",
                  "thoi_diem",
                  "so_luong_ban_lai",
                  "so_luong_can_xu_ly",
                  "ket_qua_kiem_tra",
                  "chung_tu_urls"));
      case "TRA_HANG_CAP_RIENG_DON_VI" ->
          allowed.addAll(
              List.of("thiet_bi_id", "nha_cung_cap_id", "ly_do", "thoi_diem", "chung_tu_urls"));
      default -> throw invalid();
    }
    if (!allowed.containsAll(raw.keySet())) throw invalid();
    var input = new LinkedHashMap<String, Object>();
    input.put("hanh_dong", action);
    for (String field :
        List.of(
            "phien_ban_phuong_an",
            "so_serial_id",
            "phien_ban_id",
            "so_luong",
            "giu_cho_lich_su_id",
            "nha_cung_cap_id",
            "phien_ban_thuc_nhan_id",
            "giao_dich_xuat_the_kho_id",
            "thiet_bi_id")) {
      if (!allowed.contains(field)) continue;
      boolean required =
          Set.of(
                  "phien_ban_phuong_an",
                  "giu_cho_lich_su_id",
                  "nha_cung_cap_id",
                  "phien_ban_thuc_nhan_id",
                  "giao_dich_xuat_the_kho_id",
                  "thiet_bi_id")
              .contains(field);
      input.put(field, WarrantyWriteValidation.id(raw.get(field), required, INVALID));
      if (field.equals("phien_ban_phuong_an") && (Long) input.get(field) > Integer.MAX_VALUE)
        throw invalid();
    }
    if (action.equals("GIU_CHO_HANG_CUA_HANG")) {
      boolean serial = input.get("so_serial_id") != null;
      if (serial && (input.get("phien_ban_id") != null || input.get("so_luong") != null)
          || !serial
              && (input.get("phien_ban_id") == null
                  || !Long.valueOf(1).equals(input.get("so_luong")))) throw invalid();
    }
    if (!action.equals("GIU_CHO_HANG_CUA_HANG")) {
      input.put(
          "thoi_diem", WarrantyWriteValidation.time(text(raw.get("thoi_diem"), true, 64), INVALID));
      if (!(raw.get("chung_tu_urls") instanceof List<?> urls)
          || urls.isEmpty()
          || urls.size() > 100) throw invalid();
      input.put("chung_tu_urls", urls.stream().map(v -> text(v, true, 2048)).toList());
    }
    for (String field :
        List.of(
            "dau_hieu_nhan_dang",
            "so_serial_thuc_nhan",
            "tinh_trang",
            "ket_qua_kiem_tra",
            "ly_do")) {
      if (!allowed.contains(field)) continue;
      input.put(
          field,
          text(
              raw.get(field),
              Set.of("tinh_trang", "ket_qua_kiem_tra", "ly_do").contains(field),
              field.equals("so_serial_thuc_nhan") ? 100 : 16000));
    }
    if (action.equals("HOAN_XUAT_HANG_DOI")) {
      int good = zeroOrOne(raw.get("so_luong_ban_lai")),
          bad = zeroOrOne(raw.get("so_luong_can_xu_ly"));
      if (good + bad != 1) throw invalid();
      input.put("so_luong_ban_lai", good);
      input.put("so_luong_can_xu_ly", bad);
    }
    if (action.equals("NHAN_HANG_DON_VI")) {
      if (!(raw.get("phu_kien") instanceof List<?> accessories) || accessories.size() > 100)
        throw invalid();
      var items = new ArrayList<Map<String, Object>>();
      for (var item : accessories) {
        if (!(item instanceof Map<?, ?> m) || !m.keySet().equals(Set.of("ten", "so_luong")))
          throw invalid();
        Long quantity = WarrantyWriteValidation.id(m.get("so_luong"), true, INVALID);
        if (quantity > Integer.MAX_VALUE) throw invalid();
        items.add(Map.of("ten", text(m.get("ten"), true, 255), "so_luong", quantity));
      }
      input.put("phu_kien", items);
      var differences = new ArrayList<Map<String, Object>>();
      if (raw.get("sai_lech") != null) {
        if (!(raw.get("sai_lech") instanceof List<?> list) || list.size() > 100) throw invalid();
        for (var item : list) {
          if (!(item instanceof Map<?, ?> m) || !m.keySet().equals(Set.of("loai", "noi_dung")))
            throw invalid();
          differences.add(
              Map.of(
                  "loai",
                  text(m.get("loai"), true, 50),
                  "noi_dung",
                  text(m.get("noi_dung"), true, 16000)));
        }
      }
      input.put("sai_lech", differences);
    }
    return input;
  }

  private static int zeroOrOne(Object value) {
    if (!(value instanceof Integer || value instanceof Long)
        || ((Number) value).longValue() < 0
        || ((Number) value).longValue() > 1) throw invalid();
    return ((Number) value).intValue();
  }

  static String text(Object value, boolean required, int max) {
    if (value != null && !(value instanceof String)) throw invalid();
    return WarrantyWriteValidation.text((String) value, required, max, INVALID);
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
