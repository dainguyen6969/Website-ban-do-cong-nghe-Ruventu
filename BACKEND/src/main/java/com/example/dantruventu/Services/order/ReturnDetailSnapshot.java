package com.example.dantruventu.Services.order;

import com.example.dantruventu.Enum.TrangThaiTraHang;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Reads the saved receipt record without changing it or looking up current devices. */
record ReturnDetailSnapshot(
    String endPurpose,
    Object inspection,
    List<?> heldItems,
    List<?> acceptedItems,
    Object handover,
    Object exceptionApproval) {

  static ReturnDetailSnapshot read(Map<String, Object> saved) {
    Map<String, Object> data = saved == null ? Map.of() : saved;
    return new ReturnDetailSnapshot(
        data.get("muc_dich_ket_thuc") instanceof String value ? value : null,
        data.get("ket_qua_kiem_tra"),
        items(data, "hang_dang_giu"),
        items(data, "hang_da_nhan"),
        data.get("ban_giao_lai"),
        data.get("phe_duyet_ngoai_le"));
  }

  List<String> allowedActions(
      TrangThaiTraHang status,
      BigDecimal totalRefund,
      LocalDateTime acceptedAt,
      LocalDateTime endedAt,
      boolean hasExpense) {
    if (endedAt != null || hasExpense) {
      return List.of();
    }
    if (status == TrangThaiTraHang.CHO_TIEP_NHAN && acceptedAt == null && acceptedItems.isEmpty()) {
      return List.of("TIEP_NHAN_KIEM_TRA", "NHAN_HANG", "HUY", "TU_CHOI");
    }
    if (status == TrangThaiTraHang.DA_NHAN_HANG
        && acceptedAt != null
        && !acceptedItems.isEmpty()
        && totalRefund != null
        && totalRefund.signum() > 0) {
      return List.of("HOAN_TIEN");
    }
    if (status == TrangThaiTraHang.CHO_TRA_KHACH
        && acceptedAt == null
        && acceptedItems.isEmpty()
        && !heldItems.isEmpty()
        && ("HUY".equals(endPurpose) || "TU_CHOI".equals(endPurpose))) {
      return List.of("BAN_GIAO_LAI");
    }
    return List.of();
  }

  private static List<?> items(Map<String, Object> data, String key) {
    return data.get(key) instanceof List<?> values ? values : List.of();
  }
}
