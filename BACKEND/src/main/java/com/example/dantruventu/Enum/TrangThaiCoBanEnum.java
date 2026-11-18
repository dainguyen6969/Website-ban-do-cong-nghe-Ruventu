package com.example.dantruventu.Enum;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum TrangThaiCoBanEnum {
  HOAT_DONG((short) 1),
  NGUNG_HOAT_DONG((short) 0);

  private final short value;

  TrangThaiCoBanEnum(short value) {
    this.value = value;
  }

  @JsonValue
  public short getValue() {
    return value;
  }

  public static TrangThaiCoBanEnum fromValue(short value) {
    return switch (value) {
      case 1 -> HOAT_DONG;
      case 0 -> NGUNG_HOAT_DONG;
      default ->
          throw new IllegalArgumentException("Trạng thái cơ bản chỉ nhận 0 hoặc 1: " + value);
    };
  }

  @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
  public static TrangThaiCoBanEnum fromJson(Object value) {
    if (value == null) {
      return null;
    }

    if (value instanceof Number number) {
      String code = number.toString();

      if ("1".equals(code)) {
        return HOAT_DONG;
      }

      if ("0".equals(code)) {
        return NGUNG_HOAT_DONG;
      }
    }

    throw new IllegalArgumentException("Trạng thái cơ bản trong JSON phải là số 0 hoặc 1");
  }
}
