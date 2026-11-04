package com.example.dantruventu.Services.order;

import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Reads the recorded physical configuration. It never consults the current combo catalog. */
final class SoldConfigurationSnapshot {

  private SoldConfigurationSnapshot() {}

  record Snapshot(Set<Long> variantIds, Set<String> unitCodes) {}

  record Identity(Long deviceId, Long orderLineId, String unitCode) {}

  record Replacement(Long previousDeviceId, Long replacementDeviceId) {}

  static Map<Long, String> resolveUnitCodes(
      Map<Long, Snapshot> snapshots, List<Identity> identities, List<Replacement> replacements) {
    Map<Long, String> codes = new HashMap<>();
    for (Identity identity : identities) {
      Snapshot snapshot =
          identity.orderLineId() == null ? null : snapshots.get(identity.orderLineId());
      if (snapshot == null
          || identity.deviceId() == null
          || identity.deviceId() <= 0
          || identity.unitCode() == null
          || !snapshot.unitCodes().contains(identity.unitCode())) {
        throw missing();
      }
      String previous = codes.putIfAbsent(identity.deviceId(), identity.unitCode());
      if (previous != null && !previous.equals(identity.unitCode())) {
        throw missing();
      }
    }
    for (Replacement replacement : replacements) {
      if (replacement.previousDeviceId() == null
          || replacement.replacementDeviceId() == null
          || replacement.previousDeviceId() <= 0
          || replacement.replacementDeviceId() <= 0
          || replacement.previousDeviceId().equals(replacement.replacementDeviceId())) {
        throw missing();
      }
    }

    // Only completed, handed-over replacements are passed by the read-only repository.
    boolean changed;
    do {
      changed = false;
      for (Replacement replacement : replacements) {
        String code = codes.get(replacement.previousDeviceId());
        if (code == null) {
          continue;
        }
        String previous = codes.putIfAbsent(replacement.replacementDeviceId(), code);
        if (previous == null) {
          changed = true;
        } else if (!previous.equals(code)) {
          throw missing();
        }
      }
    } while (changed);
    return Map.copyOf(codes);
  }

  static Snapshot read(Map<String, Object> value, int soldSets) {
    if (value == null
        || integer(value.get("schema_version")) != 1
        || integer(value.get("so_luong_bo")) != soldSets
        || soldSets <= 0
        || !(value.get("thanh_phan") instanceof List<?> components)
        || components.isEmpty()) {
      throw missing();
    }

    Set<Long> variantIds = new HashSet<>();
    Set<String> unitCodes = new HashSet<>();
    for (Object item : components) {
      if (!(item instanceof Map<?, ?> component)) {
        throw missing();
      }
      long variantId = integer(component.get("phien_ban_id"));
      long quantity = integer(component.get("so_luong_moi_bo"));
      if (variantId <= 0
          || quantity <= 0
          || quantity > Integer.MAX_VALUE
          || !variantIds.add(variantId)
          || !(component.get("ma_don_vi_vat_ly") instanceof List<?> codes)
          || quantity * soldSets != codes.size()) {
        throw missing();
      }
      for (Object itemCode : codes) {
        if (!(itemCode instanceof String code)
            || code.isBlank()
            || !code.equals(code.trim())
            || code.length() > 100
            || !unitCodes.add(code)) {
          throw missing();
        }
      }
    }
    return new Snapshot(Set.copyOf(variantIds), Set.copyOf(unitCodes));
  }

  private static long integer(Object value) {
    if (!(value instanceof Number number)) {
      throw missing();
    }
    try {
      return new BigDecimal(number.toString()).longValueExact();
    } catch (ArithmeticException | NumberFormatException exception) {
      throw missing();
    }
  }

  static AppException missing() {
    return new AppException(
        ErrorCode.UNPROCESSABLE_ENTITY,
        "orderId",
        "SALE_PHYSICAL_SNAPSHOT_MISSING",
        "Cần xác minh bản chụp hàng vật lý đã giao trước khi lập phiếu trả");
  }
}
