package com.example.dantruventu.Config;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TrangThaiCoBanConverter implements AttributeConverter<TrangThaiCoBanEnum, Short> {

  @Override
  public Short convertToDatabaseColumn(TrangThaiCoBanEnum attribute) {
    if (attribute == null) {
      return null;
    }
    return attribute.getValue();
  }

  @Override
  public TrangThaiCoBanEnum convertToEntityAttribute(Short dbData) {
    if (dbData == null) {
      return null;
    }

    try {
      return TrangThaiCoBanEnum.fromValue(dbData);
    } catch (IllegalArgumentException e) {
      // Proceed to fallbacks
    }

    if ("1".equals(dbData) || "DANG_HOAT_DONG".equals(dbData)) {
      return TrangThaiCoBanEnum.HOAT_DONG;
    }

    if ("0".equals(dbData) || "NGUNG_HOAT_DONG".equals(dbData)) {
      return TrangThaiCoBanEnum.NGUNG_HOAT_DONG;
    }

    return TrangThaiCoBanEnum.HOAT_DONG;
  }
}
