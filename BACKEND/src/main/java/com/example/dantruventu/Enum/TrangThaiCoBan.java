package com.example.dantruventu.Enum;

import lombok.Getter;

@Getter
public enum TrangThaiCoBan {

    HOAT_DONG((short) 1),
    NGUNG_HOAT_DONG((short) 0);

    private final short value;

    TrangThaiCoBan(short value) {
        this.value = value;
    }

    public static TrangThaiCoBan fromValue(short value) {
        for (TrangThaiCoBan trangThai : TrangThaiCoBan.values()) {
            if (trangThai.value == value) {
                return trangThai;
            }
        }

        throw new IllegalArgumentException("Trang thai khong hop le: " + value);
    }
}