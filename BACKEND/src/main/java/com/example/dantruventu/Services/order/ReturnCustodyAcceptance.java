package com.example.dantruventu.Services.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnReceiveRequest;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** An inspection is custody evidence, never authorization to import an unidentified parcel. */
final class ReturnCustodyAcceptance {

  private ReturnCustodyAcceptance() {}

  private record ItemKey(long purchaseId, long variantId) {}

  static void verify(PhieuTraHang slip, AdminReturnReceiveRequest request) {
    Map<String, Object> saved = ReturnSnapshotJson.decode(slip.getDuLieuNhanHang());
    if (saved == null) return;
    Object raw = saved.get("hang_dang_giu");
    if (raw == null || raw instanceof List<?> empty && empty.isEmpty()) {
      if (Boolean.TRUE.equals(saved.get("dang_giu_hang"))) throw inconsistent();
      return; // Keep the existing TH08 direct-receipt path when there is no custody record.
    }
    if (!(raw instanceof List<?> held)) throw inconsistent();
    Map<ItemKey, Long> quantities = new HashMap<>();
    Map<ItemKey, Set<Long>> serials = new HashMap<>();
    Set<Long> devices = new HashSet<>();
    Set<String> codes = new HashSet<>();
    for (Object value : held) {
      if (!(value instanceof Map<?, ?> item)
          || !(item.get("ma_muc_nhan") instanceof String code)
          || code.isBlank()
          || !codes.add(code)) throw inconsistent();
      if (item.get("thiet_bi_id") == null || item.get("phien_ban_id") == null) {
        throw unverified();
      }
      long device = positive(item.get("thiet_bi_id"));
      long quantity = positive(item.get("so_luong"));
      if (quantity != 1 || !devices.add(device)) throw inconsistent();
      ItemKey key =
          new ItemKey(
              positive(item.get("chi_tiet_don_hang_id")), positive(item.get("phien_ban_id")));
      quantities.merge(key, quantity, Long::sum);
      Set<Long> ids = serials.computeIfAbsent(key, ignored -> new HashSet<>());
      if (item.get("so_serial_id") != null && !ids.add(positive(item.get("so_serial_id")))) {
        throw inconsistent();
      }
      if (item.get("ngay_tiep_nhan_thuc_te") instanceof String date) {
        try {
          if (request.getNgayNhanHang().isBefore(OffsetDateTime.parse(date))) {
            throw new AppException(
                ErrorCode.INVALID_DATA,
                "Ngày nhập trả không được trước thời điểm thực tiếp nhận hàng");
          }
        } catch (java.time.format.DateTimeParseException exception) {
          throw inconsistent();
        }
      }
    }
    Set<ItemKey> seen = new HashSet<>();
    for (var input : request.getHangNhan()) {
      ItemKey key = new ItemKey(input.getChiTietDonHangId(), input.getPhienBanId());
      long total = (long) input.getSoLuongNguyenVen() + input.getSoLuongLoi();
      Set<Long> selected = new HashSet<>();
      for (var serial : input.getSerials()) {
        if (!selected.add(serial.getSoSerialId())) throw unverified();
      }
      if (!seen.add(key)
          || quantities.getOrDefault(key, -1L) != total
          || !serials.getOrDefault(key, Set.of()).equals(selected)) throw unverified();
    }
    if (!seen.equals(quantities.keySet())) throw unverified();
  }

  private static long positive(Object value) {
    try {
      if (!(value instanceof Number number)) throw inconsistent();
      long result = new BigDecimal(number.toString()).longValueExact();
      if (result <= 0) throw inconsistent();
      return result;
    } catch (ArithmeticException | NumberFormatException exception) {
      throw inconsistent();
    }
  }

  private static AppException unverified() {
    return new AppException(
        ErrorCode.UNPROCESSABLE_ENTITY,
        "hang_nhan",
        "RETURN_CUSTODY_UNVERIFIED",
        "Hàng đang giữ chưa được xác minh hoặc chưa khớp đầy đủ danh sách nhập trả");
  }

  private static AppException inconsistent() {
    return new AppException(
        ErrorCode.CONFLICT,
        "id",
        "RETURN_CUSTODY_INCONSISTENT",
        "Dữ liệu hàng đang giữ không nhất quán; cần đối chiếu trước khi nhập trả");
  }
}
