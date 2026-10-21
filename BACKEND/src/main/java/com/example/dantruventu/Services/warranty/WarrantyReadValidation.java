package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public final class WarrantyReadValidation {
  private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

  private WarrantyReadValidation() {}

  public static Long id(String raw, ErrorCode error) {
    if (raw == null || !raw.trim().matches("[0-9]+")) throw new AppException(error);
    try {
      long id = Long.parseLong(raw.trim());
      if (id <= 0) throw new AppException(error);
      return id;
    } catch (NumberFormatException failure) {
      throw new AppException(error);
    }
  }

  public static int page(String raw, int defaultValue, ErrorCode error) {
    return integer(raw, defaultValue, error);
  }

  public static int pageSize(String raw, int defaultValue, ErrorCode error) {
    int value = integer(raw, defaultValue, error);
    if (value < 1 || value > 100) throw new AppException(error);
    return value;
  }

  private static int integer(String raw, int defaultValue, ErrorCode error) {
    if (raw == null) return defaultValue;
    if (!raw.trim().matches("[0-9]+")) throw new AppException(error);
    try {
      return Integer.parseInt(raw.trim());
    } catch (NumberFormatException failure) {
      throw new AppException(error);
    }
  }

  public static void validateOffset(int page, int limit, ErrorCode error) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw new AppException(error);
    }
  }

  public static PaginationResponse pagination(int page, int limit, long total) {
    long pages = total == 0 ? 0 : 1 + (total - 1) / limit;
    if (pages > Integer.MAX_VALUE) throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    return PaginationResponse.builder()
        .page(page)
        .limit(limit)
        .totalElements(total)
        .totalPages((int) pages)
        .build();
  }

  public static OffsetDateTime time(LocalDateTime value) {
    return value == null ? null : value.atZone(VIETNAM).toOffsetDateTime();
  }
}
