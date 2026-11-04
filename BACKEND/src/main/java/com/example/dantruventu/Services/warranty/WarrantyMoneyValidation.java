package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyMoneyRequest;
import com.example.dantruventu.Error.*;
import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.*;

final class WarrantyMoneyValidation {
  private WarrantyMoneyValidation() {}

  static final ErrorCode INVALID = ErrorCode.INVALID_WARRANTY_MONEY;

  static Map<String, Object> validate(AdminWarrantyMoneyRequest request) {
    if (request == null) throw invalid();
    var raw = request.fields();
    String type = text(raw.get("loai"), 50);
    Set<String> allowed =
        new HashSet<>(
            Set.of(
                "loai",
                "so_tien",
                "phuong_thuc_thanh_toan",
                "ten_nguoi_nop_nhan",
                "ngay_ghi_nhan",
                "ma_chung_tu_tham_chieu",
                "chung_tu_urls"));
    switch (type) {
      case "THU_KHACH", "HOAN_KHACH" -> allowed.add("hoa_don_bao_hanh_id");
      case "CHI_DON_VI" -> allowed.addAll(Set.of("nha_cung_cap_id", "chi_phi_lich_su_id"));
      case "THU_HOAN_DON_VI" -> allowed.addAll(Set.of("nha_cung_cap_id", "giao_dich_chi_goc_id"));
      case "THU_DOI_SOAT_DON_VI" ->
          allowed.addAll(Set.of("nha_cung_cap_id", "nghia_vu_lich_su_id"));
      default -> throw invalid();
    }
    if (!allowed.containsAll(raw.keySet())) throw invalid();
    BigDecimal amount;
    try {
      amount = WarrantyQuoteValidation.money(raw.get("so_tien"));
    } catch (AppException e) {
      throw invalid();
    }
    if (amount.signum() <= 0) throw invalid();
    String method = text(raw.get("phuong_thuc_thanh_toan"), 50);
    if (!Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE").contains(method)) throw invalid();
    if (!(raw.get("chung_tu_urls") instanceof List<?> urls) || urls.isEmpty() || urls.size() > 100)
      throw invalid();
    var result = new LinkedHashMap<String, Object>();
    result.put("loai", type);
    result.put("so_tien", amount);
    result.put("phuong_thuc_thanh_toan", method);
    result.put("ten_nguoi_nop_nhan", text(raw.get("ten_nguoi_nop_nhan"), 150));
    result.put("ma_chung_tu_tham_chieu", text(raw.get("ma_chung_tu_tham_chieu"), 100));
    result.put(
        "ngay_ghi_nhan",
        WarrantyWriteValidation.time(text(raw.get("ngay_ghi_nhan"), 64), INVALID)
            .truncatedTo(ChronoUnit.SECONDS));
    result.put("chung_tu_urls", urls.stream().map(u -> text(u, 2048)).toList());
    for (String name :
        List.of(
            "hoa_don_bao_hanh_id",
            "nha_cung_cap_id",
            "chi_phi_lich_su_id",
            "giao_dich_chi_goc_id",
            "nghia_vu_lich_su_id"))
      if (allowed.contains(name))
        result.put(name, WarrantyWriteValidation.id(raw.get(name), true, INVALID));
    return result;
  }

  private static String text(Object raw, int max) {
    if (!(raw instanceof String s)) throw invalid();
    return WarrantyWriteValidation.text(s, true, max, INVALID);
  }

  static AppException invalid() {
    return new AppException(INVALID);
  }
}
