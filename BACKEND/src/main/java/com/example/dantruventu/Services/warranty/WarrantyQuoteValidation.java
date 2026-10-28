package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyQuoteRequest;
import com.example.dantruventu.Enum.TrangThaiDieuKienBaoHanh;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;

final class WarrantyQuoteValidation {
  private WarrantyQuoteValidation() {}

  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_QUOTE;
  private static final Set<String> ROOT =
      Set.of(
          "thay_the_phien_ban",
          "ket_luan_lich_su_id",
          "hang_muc",
          "thoi_gian_du_kien",
          "han_phan_hoi",
          "dieu_kien_dat_coc",
          "dieu_kien_thanh_toan",
          "ly_do");
  private static final Set<String> ITEM =
      Set.of(
          "ma_hang_muc",
          "noi_dung",
          "so_luong",
          "don_gia_khach",
          "chi_phi_ncc_du_kien",
          "dieu_kien_bao_hanh",
          "ben_chiu_phi",
          "van_phat_sinh_khi_khong_sua");

  static Map<String, Object> validate(AdminWarrantyQuoteRequest request) {
    if (request == null || !ROOT.containsAll(request.fields().keySet())) throw invalid();
    var raw = request.fields();
    Long replaces = WarrantyWriteValidation.id(raw.get("thay_the_phien_ban"), false, INVALID);
    if (replaces != null && replaces > Integer.MAX_VALUE) throw invalid();
    Long conclusion = WarrantyWriteValidation.id(raw.get("ket_luan_lich_su_id"), true, INVALID);
    if (!(raw.get("hang_muc") instanceof List<?> source) || source.isEmpty() || source.size() > 100)
      throw invalid();
    List<Map<String, Object>> items = new ArrayList<>();
    Set<String> codes = new HashSet<>();
    BigDecimal total = money(BigDecimal.ZERO);
    for (Object value : source) {
      var item = object(value);
      if (!ITEM.containsAll(item.keySet())) throw invalid();
      String code = text(item.get("ma_hang_muc"), true, 100);
      if (!codes.add(code)) throw invalid();
      Long quantity = WarrantyWriteValidation.id(item.get("so_luong"), true, INVALID);
      if (quantity > Integer.MAX_VALUE) throw invalid();
      BigDecimal price = money(item.get("don_gia_khach"));
      BigDecimal cost =
          item.get("chi_phi_ncc_du_kien") == null ? null : money(item.get("chi_phi_ncc_du_kien"));
      String condition = text(item.get("dieu_kien_bao_hanh"), true, 50);
      try {
        TrangThaiDieuKienBaoHanh.valueOf(condition);
      } catch (IllegalArgumentException e) {
        throw invalid();
      }
      String payer = text(item.get("ben_chiu_phi"), true, 50);
      if (!WarrantyEventValidation.PAYERS.contains(payer)
          || !(item.get("van_phat_sinh_khi_khong_sua") instanceof Boolean)) throw invalid();
      if (price.signum() > 0
          && (!"KHACH_HANG".equals(payer) || !"KHONG_DU_DIEU_KIEN".equals(condition)))
        throw invalid();
      BigDecimal lineTotal = money(price.multiply(BigDecimal.valueOf(quantity)));
      total = money(total.add(lineTotal));
      var normalized =
          fields(
              "ma_hang_muc",
              code,
              "noi_dung",
              text(item.get("noi_dung"), true, 255),
              "so_luong",
              quantity.intValue(),
              "don_gia_khach",
              price,
              "chi_phi_ncc_du_kien",
              cost,
              "dieu_kien_bao_hanh",
              condition,
              "ben_chiu_phi",
              payer,
              "van_phat_sinh_khi_khong_sua",
              item.get("van_phat_sinh_khi_khong_sua"),
              "thanh_tien_khach",
              lineTotal);
      items.add(normalized);
    }
    var deposit = object(raw.get("dieu_kien_dat_coc"));
    if (!deposit.keySet().equals(Set.of("so_tien_toi_thieu"))) throw invalid();
    BigDecimal minimum = money(deposit.get("so_tien_toi_thieu"));
    if (minimum.compareTo(total) > 0) throw invalid();
    OffsetDateTime deadline;
    try {
      deadline =
          OffsetDateTime.parse(text(raw.get("han_phan_hoi"), true, 64))
              .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
              .toOffsetDateTime();
    } catch (DateTimeException e) {
      throw invalid();
    }
    // Check expiry after idempotency replay: a successful retry must survive a later deadline.
    return fields(
        "thay_the_phien_ban",
        replaces == null ? null : replaces.intValue(),
        "ket_luan_lich_su_id",
        conclusion,
        "hang_muc",
        items,
        "tong_tien_khach",
        total,
        "thoi_gian_du_kien",
        text(raw.get("thoi_gian_du_kien"), true, 255),
        "han_phan_hoi",
        deadline,
        "dieu_kien_dat_coc",
        fields("so_tien_toi_thieu", minimum),
        "dieu_kien_thanh_toan",
        text(raw.get("dieu_kien_thanh_toan"), true, 16000),
        "ly_do",
        text(raw.get("ly_do"), true, 16000));
  }

  private static String text(Object raw, boolean required, int max) {
    if (raw != null && !(raw instanceof String)) throw invalid();
    return WarrantyWriteValidation.text((String) raw, required, max, INVALID);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> object(Object raw) {
    if (!(raw instanceof Map<?, ?> map)
        || map.keySet().stream().anyMatch(k -> !(k instanceof String))) throw invalid();
    return (Map<String, Object>) map;
  }

  static BigDecimal money(Object raw) {
    if (!(raw instanceof Number)) throw invalid();
    try {
      BigDecimal value = new BigDecimal(raw.toString()).setScale(2, RoundingMode.UNNECESSARY);
      if (value.signum() < 0 || value.precision() > 15) throw invalid();
      return value;
    } catch (NumberFormatException | ArithmeticException e) {
      throw invalid();
    }
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
