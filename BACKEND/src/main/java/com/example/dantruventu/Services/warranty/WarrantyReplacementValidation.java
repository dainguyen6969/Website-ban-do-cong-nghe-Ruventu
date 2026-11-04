package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyReplacementPlanRequest;
import com.example.dantruventu.Error.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

final class WarrantyReplacementValidation {
  private WarrantyReplacementValidation() {}

  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_REPLACEMENT;

  static Map<String, Object> validate(AdminWarrantyReplacementPlanRequest request) {
    if (request == null) throw invalid();
    var raw = request.fields();
    String action = text(raw.get("hanh_dong"), true, 50);
    Set<String> allowed =
        switch (action) {
          case "LAP_PHIEN_BAN" ->
              Set.of(
                  "hanh_dong",
                  "thay_the_phien_ban",
                  "ket_luan_lich_su_id",
                  "ly_do",
                  "can_cu",
                  "don_vi_phe_duyet",
                  "phien_ban_thay_the_id",
                  "tinh_trang_hang",
                  "phu_kien",
                  "nguon",
                  "cach_tinh_han",
                  "han_moi_xac_nhan",
                  "can_cu_han",
                  "bao_gia_phien_ban",
                  "huong_xu_ly_thiet_bi_cu",
                  "chung_tu_urls");
          case "PHE_DUYET" -> Set.of("hanh_dong", "phien_ban_phuong_an", "ly_do", "can_cu");
          case "QUYET_DINH_KHACH" ->
              Set.of(
                  "hanh_dong",
                  "phien_ban_phuong_an",
                  "quyet_dinh",
                  "thoi_diem",
                  "kenh",
                  "bang_chung_urls",
                  "ly_do");
          case "HUY" -> Set.of("hanh_dong", "phien_ban_phuong_an", "ly_do");
          default -> throw invalid();
        };
    if (!allowed.containsAll(raw.keySet())) throw invalid();
    var input = new LinkedHashMap<String, Object>();
    input.put("hanh_dong", action);
    if (!action.equals("LAP_PHIEN_BAN"))
      input.put("phien_ban_phuong_an", version(raw.get("phien_ban_phuong_an"), true));
    if (action.equals("LAP_PHIEN_BAN")) {
      input.put("thay_the_phien_ban", version(raw.get("thay_the_phien_ban"), false));
      input.put("bao_gia_phien_ban", version(raw.get("bao_gia_phien_ban"), false));
      for (String field : List.of("ket_luan_lich_su_id", "phien_ban_thay_the_id"))
        input.put(field, WarrantyWriteValidation.id(raw.get(field), true, INVALID));
      for (String field :
          List.of(
              "ly_do",
              "can_cu",
              "don_vi_phe_duyet",
              "tinh_trang_hang",
              "can_cu_han",
              "huong_xu_ly_thiet_bi_cu"))
        input.put(
            field, text(raw.get(field), true, field.equals("don_vi_phe_duyet") ? 150 : 16000));
      String source = text(raw.get("nguon"), true, 50),
          expiry = text(raw.get("cach_tinh_han"), true, 50);
      if (!Set.of("DON_VI_BAO_HANH", "TON_KHO_CUA_HANG").contains(source)
          || !Set.of("GIU_HAN_CON_LAI", "HAN_MOI_XAC_NHAN").contains(expiry)) throw invalid();
      input.put("nguon", source);
      input.put("cach_tinh_han", expiry);
      OffsetDateTime deadline = null;
      if (expiry.equals("HAN_MOI_XAC_NHAN")) {
        try {
          deadline =
              OffsetDateTime.parse(text(raw.get("han_moi_xac_nhan"), true, 64))
                  .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
                  .toOffsetDateTime()
                  .truncatedTo(ChronoUnit.SECONDS);
        } catch (DateTimeException e) {
          throw invalid();
        }
      } else if (raw.get("han_moi_xac_nhan") != null) throw invalid();
      input.put("han_moi_xac_nhan", deadline);
      if (!(raw.get("phu_kien") instanceof List<?> accessories) || accessories.size() > 100)
        throw invalid();
      List<Map<String, Object>> items = new ArrayList<>();
      for (Object item : accessories) {
        if (!(item instanceof Map<?, ?> m) || !m.keySet().equals(Set.of("ten", "so_luong")))
          throw invalid();
        Long quantity = WarrantyWriteValidation.id(m.get("so_luong"), true, INVALID);
        if (quantity > Integer.MAX_VALUE) throw invalid();
        items.add(Map.of("ten", text(m.get("ten"), true, 255), "so_luong", quantity));
      }
      input.put("phu_kien", items);
      input.put("chung_tu_urls", urls(raw.get("chung_tu_urls")));
    } else if (action.equals("QUYET_DINH_KHACH")) {
      String decision = text(raw.get("quyet_dinh"), true, 50),
          channel = text(raw.get("kenh"), true, 50);
      if (!Set.of("DONG_Y", "TU_CHOI").contains(decision)
          || !Set.of("TAI_QUAY", "DIEN_THOAI", "EMAIL", "TIN_NHAN", "KHAC").contains(channel))
        throw invalid();
      input.put("quyet_dinh", decision);
      input.put("kenh", channel);
      input.put(
          "thoi_diem", WarrantyWriteValidation.time(text(raw.get("thoi_diem"), true, 64), INVALID));
      input.put("bang_chung_urls", urls(raw.get("bang_chung_urls")));
      input.put("ly_do", text(raw.get("ly_do"), decision.equals("TU_CHOI"), 16000));
    } else {
      input.put("ly_do", text(raw.get("ly_do"), true, 16000));
      if (action.equals("PHE_DUYET")) input.put("can_cu", text(raw.get("can_cu"), true, 16000));
    }
    return input;
  }

  private static Integer version(Object raw, boolean required) {
    Long n = WarrantyWriteValidation.id(raw, required, INVALID);
    if (n != null && n > Integer.MAX_VALUE) throw invalid();
    return n == null ? null : n.intValue();
  }

  private static String text(Object raw, boolean required, int max) {
    if (raw != null && !(raw instanceof String)) throw invalid();
    return WarrantyWriteValidation.text((String) raw, required, max, INVALID);
  }

  private static List<String> urls(Object raw) {
    if (!(raw instanceof List<?> list) || list.isEmpty() || list.size() > 100) throw invalid();
    return list.stream().map(v -> text(v, true, 2048)).toList();
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
