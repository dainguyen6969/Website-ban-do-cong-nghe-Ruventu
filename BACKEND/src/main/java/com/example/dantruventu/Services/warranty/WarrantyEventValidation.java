package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyEventRequest;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.util.*;

final class WarrantyEventValidation {
  private WarrantyEventValidation() {}

  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_EVENT;
  // API business values only; no Entity/database status enum is changed.
  static final Set<String> PAYERS = Set.of("KHACH_HANG", "CUA_HANG", "DON_VI_BAO_HANH");
  private static final Map<String, Set<String>> FIELDS =
      Map.of(
          "GHI_KET_LUAN", Set.of("su_kien", "noi_dung", "hang_muc", "bang_chung_urls"),
          "GHI_CHI_PHI_DON_VI",
              Set.of(
                  "su_kien",
                  "nha_cung_cap_id",
                  "hang_muc",
                  "xac_nhan_nghia_vu",
                  "can_cu",
                  "chung_tu_urls"),
          "GUI_DON_VI",
              Set.of(
                  "su_kien",
                  "nha_cung_cap_id",
                  "ten_don_vi",
                  "thiet_bi_id",
                  "noi_dung_yeu_cau",
                  "phu_kien",
                  "thoi_diem",
                  "chung_tu_urls"),
          "DON_VI_TIEP_NHAN",
              Set.of("su_kien", "lan_gui_lich_su_id", "nguoi_nhan", "thoi_diem", "chung_tu_urls"),
          "BAT_DAU_CONG_VIEC",
              Set.of(
                  "su_kien",
                  "noi_xu_ly",
                  "phien_ban_bao_gia",
                  "chi_tiet_phi_ids",
                  "ket_luan_lich_su_id",
                  "ma_hang_muc",
                  "thoi_diem",
                  "ghi_chu"),
          "CAP_NHAT_TIEN_DO",
              Set.of("su_kien", "noi_dung", "chi_tiet_phi_ids", "thoi_diem", "bang_chung_urls"),
          "YEU_CAU_DUNG", Set.of("su_kien", "ly_do", "thoi_diem", "bang_chung_urls"),
          "YEU_CAU_THU_HOI",
              Set.of("su_kien", "ly_do", "lan_gui_lich_su_id", "thoi_diem", "chung_tu_urls"),
          "NHAN_LAI",
              Set.of(
                  "su_kien",
                  "lan_gui_lich_su_id",
                  "loai_thiet_bi",
                  "thiet_bi_id",
                  "so_serial_thuc_nhan",
                  "tinh_trang",
                  "phu_kien",
                  "thoi_diem",
                  "chung_tu_urls",
                  "sai_lech"));

  static Map<String, Object> validate(AdminWarrantyEventRequest request) {
    if (request == null) throw invalid();
    Map<String, Object> raw = request.fields();
    String event = text(raw.get("su_kien"), true, 50);
    Set<String> allowed = FIELDS.get(event);
    if (allowed == null || !allowed.containsAll(raw.keySet())) throw invalid();
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("su_kien", event);
    for (String key :
        List.of(
            "noi_dung",
            "can_cu",
            "ten_don_vi",
            "noi_dung_yeu_cau",
            "nguoi_nhan",
            "ly_do",
            "tinh_trang"))
      if (allowed.contains(key)) result.put(key, text(raw.get(key), true, 16000));
    for (String key : List.of("nha_cung_cap_id", "thiet_bi_id", "lan_gui_lich_su_id"))
      if (allowed.contains(key))
        result.put(key, WarrantyWriteValidation.id(raw.get(key), true, INVALID));
    for (String key : List.of("bang_chung_urls", "chung_tu_urls"))
      if (allowed.contains(key)) result.put(key, urls(raw.get(key)));
    if (allowed.contains("thoi_diem"))
      result.put(
          "thoi_diem", WarrantyWriteValidation.time(text(raw.get("thoi_diem"), true, 64), INVALID));
    if (allowed.contains("phu_kien")) result.put("phu_kien", accessories(raw.get("phu_kien")));
    if (event.equals("GHI_KET_LUAN") || event.equals("GHI_CHI_PHI_DON_VI")) {
      List<Map<String, Object>> items = new ArrayList<>();
      Set<String> codes = new HashSet<>();
      for (Object value : list(raw.get("hang_muc"), true, 100)) {
        Map<String, Object> item = object(value);
        Set<String> fields =
            event.equals("GHI_KET_LUAN")
                ? Set.of(
                    "ma_hang_muc",
                    "loi",
                    "dieu_kien_bao_hanh",
                    "noi_dung_xu_ly",
                    "ben_chiu_phi",
                    "ly_do",
                    "can_cu",
                    "don_vi_ket_luan")
                : Set.of("ma_hang_muc", "chi_phi", "ben_chiu_phi");
        if (!fields.equals(item.keySet())) throw invalid();
        Map<String, Object> normalized = new LinkedHashMap<>();
        for (String field : fields)
          normalized.put(
              field,
              field.equals("chi_phi")
                  ? money(item.get(field))
                  : text(item.get(field), true, field.equals("ma_hang_muc") ? 100 : 16000));
        if (!codes.add(normalized.get("ma_hang_muc").toString())
            || !PAYERS.contains(normalized.get("ben_chiu_phi"))) throw invalid();
        if (event.equals("GHI_KET_LUAN")
            && !Set.of("DU_DIEU_KIEN", "KHONG_DU_DIEU_KIEN", "CHUA_XAC_MINH")
                .contains(normalized.get("dieu_kien_bao_hanh"))) throw invalid();
        items.add(normalized);
      }
      result.put("hang_muc", items);
    }
    if (event.equals("GHI_CHI_PHI_DON_VI")) {
      if (!(raw.get("xac_nhan_nghia_vu") instanceof Boolean)) throw invalid();
      result.put("xac_nhan_nghia_vu", raw.get("xac_nhan_nghia_vu"));
    }
    if (event.equals("BAT_DAU_CONG_VIEC")) {
      String location = text(raw.get("noi_xu_ly"), true, 50);
      if (!Set.of("CUA_HANG", "DON_VI_BAO_HANH").contains(location)) throw invalid();
      result.put("noi_xu_ly", location);
      Long version = WarrantyWriteValidation.id(raw.get("phien_ban_bao_gia"), false, INVALID);
      if (version != null && version > Integer.MAX_VALUE) throw invalid();
      result.put("phien_ban_bao_gia", version);
      result.put("ghi_chu", text(raw.get("ghi_chu"), false, 16000));
      if (version != null) {
        if (raw.containsKey("ket_luan_lich_su_id") || raw.containsKey("ma_hang_muc"))
          throw invalid();
        result.put("chi_tiet_phi_ids", ids(raw.get("chi_tiet_phi_ids")));
      } else {
        if (raw.containsKey("chi_tiet_phi_ids")) throw invalid();
        result.put(
            "ket_luan_lich_su_id",
            WarrantyWriteValidation.id(raw.get("ket_luan_lich_su_id"), true, INVALID));
        List<String> codes =
            list(raw.get("ma_hang_muc"), true, 100).stream().map(v -> text(v, true, 100)).toList();
        if (new HashSet<>(codes).size() != codes.size()) throw invalid();
        result.put("ma_hang_muc", codes);
      }
    }
    if (event.equals("CAP_NHAT_TIEN_DO"))
      result.put("chi_tiet_phi_ids", ids(raw.get("chi_tiet_phi_ids")));
    if (event.equals("NHAN_LAI")) {
      if (!"THIET_BI_CU".equals(raw.get("loai_thiet_bi")))
        throw new AppException(INVALID, "Nhận sản phẩm thay thế dùng API replacement-items.");
      result.put("loai_thiet_bi", "THIET_BI_CU");
      result.put("so_serial_thuc_nhan", text(raw.get("so_serial_thuc_nhan"), false, 100));
      List<Map<String, Object>> differences = new ArrayList<>();
      for (Object value : list(raw.get("sai_lech"), false, 100)) {
        Map<String, Object> item = object(value);
        if (!item.keySet().equals(Set.of("loai", "noi_dung"))) throw invalid();
        differences.add(
            Map.of(
                "loai",
                text(item.get("loai"), true, 50),
                "noi_dung",
                text(item.get("noi_dung"), true, 16000)));
      }
      result.put("sai_lech", differences);
    }
    return result;
  }

  static List<Map<String, Object>> accessories(Object raw) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Object value : list(raw, false, 100)) {
      Map<String, Object> item = object(value);
      if (!item.keySet().equals(Set.of("ten", "so_luong"))) throw invalid();
      Long quantity = WarrantyWriteValidation.id(item.get("so_luong"), true, INVALID);
      if (quantity > Integer.MAX_VALUE) throw invalid();
      result.add(Map.of("ten", text(item.get("ten"), true, 255), "so_luong", quantity));
    }
    return result;
  }

  static List<Long> ids(Object raw) {
    List<Long> result =
        list(raw, true, 100).stream()
            .map(v -> WarrantyWriteValidation.id(v, true, INVALID))
            .toList();
    if (new HashSet<>(result).size() != result.size()) throw invalid();
    return result;
  }

  static String text(Object value, boolean required, int max) {
    if (value != null && !(value instanceof String)) throw invalid();
    return WarrantyWriteValidation.text((String) value, required, max, INVALID);
  }

  static BigDecimal money(Object raw) {
    if (!(raw instanceof Number) || raw instanceof Double d && !Double.isFinite(d)) throw invalid();
    try {
      BigDecimal value =
          new BigDecimal(raw.toString()).setScale(2, java.math.RoundingMode.UNNECESSARY);
      if (value.signum() < 0 || value.precision() > 15) throw invalid();
      return value;
    } catch (NumberFormatException | ArithmeticException e) {
      throw invalid();
    }
  }

  @SuppressWarnings("unchecked")
  static Map<String, Object> object(Object raw) {
    if (!(raw instanceof Map<?, ?> map)
        || map.keySet().stream().anyMatch(k -> !(k instanceof String))) throw invalid();
    return (Map<String, Object>) map;
  }

  static List<?> list(Object raw, boolean nonEmpty, int max) {
    if (!(raw instanceof List<?> list) || list.size() > max || nonEmpty && list.isEmpty())
      throw invalid();
    return list;
  }

  private static List<String> urls(Object raw) {
    if (raw == null) return List.of();
    return list(raw, false, 100).stream().map(v -> text(v, true, 2048)).toList();
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
