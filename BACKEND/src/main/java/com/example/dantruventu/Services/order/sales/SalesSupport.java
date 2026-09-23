package com.example.dantruventu.Services.order.sales;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public final class SalesSupport {

  private static final BigDecimal MAX_MONEY = new BigDecimal("9999999999999");

  private SalesSupport() {}

  public static AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  public static AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }

  public static AppException notFound(String message) {
    return new AppException(ErrorCode.NOT_FOUND, message);
  }

  public static String text(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.strip();
  }

  public static BigDecimal money(BigDecimal value) {
    if (value == null || value.signum() < 0) {
      throw conflict("Giá hoặc số tiền trong dữ liệu không hợp lệ");
    }

    BigDecimal result = value.setScale(0, RoundingMode.HALF_UP);

    if (result.compareTo(MAX_MONEY) > 0) {
      throw conflict("Số tiền vượt giới hạn lưu trữ");
    }

    return result;
  }

  public static BigDecimal inputMoney(BigDecimal value) {
    if (value == null
        || value.signum() < 0
        || value.stripTrailingZeros().scale() > 0
        || value.compareTo(MAX_MONEY) > 0) {
      throw invalid("Số tiền phải là số đồng VND nguyên, không âm");
    }

    return value.setScale(0);
  }

  public static int quantity(long value) {
    if (value <= 0 || value > Integer.MAX_VALUE) {
      throw invalid("Số lượng sản phẩm vượt giới hạn");
    }

    return (int) value;
  }

  public static PageRequest page(String keyword, int page, int limit) {

    if (keyword != null && keyword.length() > 100) {
      throw invalid("Từ khóa tối đa 100 ký tự");
    }

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalid("page phải từ 0, limit từ 1 đến 100");
    }

    return PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "id"));
  }

  public static PaginationResponse pagination(Page<?> result) {
    return new PaginationResponse(
        result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
  }
}
