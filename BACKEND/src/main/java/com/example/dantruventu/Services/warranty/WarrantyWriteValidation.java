package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.DateTimeException;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

final class WarrantyWriteValidation {
  private WarrantyWriteValidation() {}

  static Long id(Object raw, boolean required, ErrorCode error) {
    if (raw == null) {
      if (required) throw new AppException(error);
      return null;
    }
    if (!(raw instanceof Integer || raw instanceof Long || raw instanceof BigInteger))
      throw new AppException(error);
    try {
      long id = new BigDecimal(raw.toString()).longValueExact();
      if (id <= 0) throw new AppException(error);
      return id;
    } catch (ArithmeticException failure) {
      throw new AppException(error);
    }
  }

  static String text(String value, boolean required, int max, ErrorCode error) {
    String normalized = value == null ? null : value.strip();
    if (normalized != null && normalized.isEmpty()) normalized = null;
    if ((required && normalized == null) || (normalized != null && normalized.length() > max))
      throw new AppException(error);
    return normalized;
  }

  static String phone(String value, ErrorCode error) {
    String phone = text(value, true, 20, error);
    if (!phone.matches("\\+?[0-9][0-9 .()-]{6,19}")) throw new AppException(error);
    return phone;
  }

  static List<String> urls(List<String> value, ErrorCode error) {
    if (value == null) return List.of();
    if (value.size() > 100) throw new AppException(error);
    return value.stream().map(url -> text(url, true, 2048, error)).toList();
  }

  static OffsetDateTime time(String value, ErrorCode error) {
    try {
      OffsetDateTime time =
          OffsetDateTime.parse(value)
              .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
              .toOffsetDateTime();
      if (time.isAfter(OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))))
        throw new AppException(error);
      return time;
    } catch (DateTimeException | NullPointerException failure) {
      throw new AppException(error);
    }
  }
}
