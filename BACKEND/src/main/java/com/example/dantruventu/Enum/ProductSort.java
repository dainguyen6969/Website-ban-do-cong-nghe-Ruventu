package com.example.dantruventu.Enum;

import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum ProductSort {

    MOI_NHAT("moi_nhat"),
    GIA_TANG_DAN("gia_tang_dan"),
    GIA_GIAM_DAN("gia_giam_dan"),
    BAN_CHAY("ban_chay");

    private final String value;

    public static ProductSort fromValue(String value) {

        if (value == null || value.isBlank()) {
            return MOI_NHAT;
        }

        return Arrays.stream(values())
                .filter(productSort ->
                        productSort.value.equalsIgnoreCase(value.trim())
                )
                .findFirst()
                .orElseThrow(() ->
                        new AppException(ErrorCode.INVALID_DATA)
                );
    }
}