package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.TrangThaiBaoGiaBaoHanh;
import com.example.dantruventu.Error.*;
import java.math.BigDecimal;
import java.util.*;

/** Shared immutable quote reconstruction and approved-fee guard for both quote writers. */
final class WarrantyQuoteSnapshots {
  private WarrantyQuoteSnapshots() {}

  static TreeMap<Integer, Map<String, Object>> load(
      WarrantyHistorySupport history,
      PhieuBaoHanh ticket,
      List<LichSuBaoHanh> events,
      List<ChiTietPhiBaoHanh> fees) {
    TreeMap<Integer, Map<String, Object>> result = new TreeMap<>();
    for (var event : events) {
      var quote = history.object(history.payload(event).get("bao_gia"));
      if (quote == null) continue;
      Long raw = history.id(quote.get("phien_ban"));
      if (raw == null || raw > Integer.MAX_VALUE) throw invalidHistory();
      int version = raw.intValue();
      var merged = new LinkedHashMap<>(result.getOrDefault(version, Map.of()));
      var oldDecision = history.object(merged.get("quyet_dinh"));
      if (oldDecision != null) {
        var decision = history.object(quote.get("quyet_dinh"));
        if (decision != null && !oldDecision.equals(decision)) throw invalidHistory();
        for (String immutable : List.of("hang_muc", "tong_tien_khach", "dieu_kien_dat_coc"))
          if (quote.containsKey(immutable)
              && !Objects.equals(merged.get(immutable), quote.get(immutable)))
            throw invalidHistory();
      }
      merged.putAll(quote);
      if (oldDecision != null) merged.put("quyet_dinh", oldDecision);
      result.put(version, merged);
    }
    Map<Long, ChiTietPhiBaoHanh> byId = new HashMap<>();
    for (var fee : fees) {
      if (fee.getId() == null
          || fee.getPhieuBaoHanh() == null
          || !ticket.getId().equals(fee.getPhieuBaoHanh().getId())
          || fee.getPhienBanBaoGia() == null
          || !result.containsKey(fee.getPhienBanBaoGia())
          || fee.getSoLuong() == null
          || fee.getSoLuong() <= 0
          || byId.put(fee.getId(), fee) != null) throw invalidHistory();
    }
    Set<Long> used = new HashSet<>();
    for (var entry : result.entrySet()) {
      var quote = entry.getValue();
      String state = history.text(quote.get("trang_thai"));
      if (state == null) throw invalidHistory();
      try {
        TrangThaiBaoGiaBaoHanh.valueOf(state);
      } catch (IllegalArgumentException e) {
        throw invalidHistory();
      }
      var decision = history.object(quote.get("quyet_dinh"));
      if (decision != null && !state.equals(decision.get("quyet_dinh"))) throw invalidHistory();
      if (Set.of("DONG_Y", "TU_CHOI").contains(state)
          && (decision == null || history.time(decision.get("thoi_diem")) == null))
        throw invalidHistory();
      BigDecimal total = BigDecimal.ZERO;
      Set<String> codes = new HashSet<>();
      if (history.array(quote.get("hang_muc")).isEmpty()) throw invalidHistory();
      for (Object raw : history.array(quote.get("hang_muc"))) {
        var item = history.object(raw);
        Long feeId = item == null ? null : history.id(item.get("id"));
        var fee = byId.get(feeId);
        String code = item == null ? null : history.text(item.get("ma_hang_muc"));
        if (fee == null
            || !used.add(feeId)
            || code == null
            || !codes.add(code)
            || !entry.getKey().equals(fee.getPhienBanBaoGia())
            || !Objects.equals(item.get("noi_dung"), fee.getNoiDung())
            || !Objects.equals(history.id(item.get("so_luong")), fee.getSoLuong().longValue())
            || amount(item.get("don_gia_khach")).compareTo(amount(fee.getDonGiaKhach())) != 0
            || amount(item.get("thanh_tien_khach")).compareTo(amount(fee.getThanhTienKhach())) != 0
            || amount(fee.getThanhTienKhach())
                    .compareTo(
                        amount(fee.getDonGiaKhach()).multiply(BigDecimal.valueOf(fee.getSoLuong())))
                != 0) throw invalidHistory();
        total = total.add(fee.getThanhTienKhach());
      }
      if (amount(quote.get("tong_tien_khach")).compareTo(total) != 0) throw invalidHistory();
    }
    if (!used.equals(byId.keySet())) throw invalidHistory();
    return result;
  }

  static void preserveApprovedFees(
      WarrantyHistorySupport history,
      TreeMap<Integer, Map<String, Object>> versions,
      List<Map<String, Object>> items) {
    Map<String, Map<String, Object>> proposed = new HashMap<>();
    for (var item : items) proposed.put(item.get("ma_hang_muc").toString(), item);
    // Full snapshots replace totals, never sum versions. Keep separately accepted earlier fees too.
    // No adjustment/evidence input exists on this API: reductions need a separate authorized flow.
    for (var quote : versions.values()) {
      if (!"DONG_Y".equals(quote.get("trang_thai"))) continue;
      for (Object raw : history.array(quote.get("hang_muc"))) {
        var old = history.object(raw);
        if (amount(old.get("thanh_tien_khach")).signum() == 0) continue;
        var item = proposed.get(history.text(old.get("ma_hang_muc")));
        if (item == null
            || !"KHACH_HANG".equals(item.get("ben_chiu_phi"))
            || amount(item.get("thanh_tien_khach")).compareTo(amount(old.get("thanh_tien_khach")))
                < 0
            || Boolean.TRUE.equals(old.get("van_phat_sinh_khi_khong_sua"))
                && !Boolean.TRUE.equals(item.get("van_phat_sinh_khi_khong_sua")))
          throw WarrantyReadException.of(
              ErrorCode.APPROVED_FEE_REMOVAL_UNJUSTIFIED,
              "hang_muc",
              "APPROVED_FEE_REMOVAL_UNJUSTIFIED");
      }
    }
  }

  static BigDecimal amount(Object raw) {
    try {
      return WarrantyQuoteValidation.money(raw);
    } catch (AppException e) {
      throw invalidHistory();
    }
  }

  static AppException invalidHistory() {
    return new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
  }
}
