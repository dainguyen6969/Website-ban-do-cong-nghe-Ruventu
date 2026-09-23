package com.example.dantruventu.Enum;

import lombok.Getter;

@Getter
public enum TrangThaiCoBanEnum {
  HOAT_DONG((short) 1),
  NGUNG_HOAT_DONG((short) 0);

  private final short value;

  TrangThaiCoBanEnum(short value) {
    this.value = value;
  }

  public static TrangThaiCoBanEnum fromValue(short value) {
    for (TrangThaiCoBanEnum trangThai : TrangThaiCoBanEnum.values()) {
      if (trangThai.value == value) {
        return trangThai;
      }
    }

    throw new IllegalArgumentException("Trang thai khong hop le: " + value);
  }
}
