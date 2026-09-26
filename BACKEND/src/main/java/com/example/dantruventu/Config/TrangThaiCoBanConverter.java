package com.example.dantruventu.Config;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TrangThaiCoBanConverter implements AttributeConverter<TrangThaiCoBanEnum, String> {

  @Override
  public String convertToDatabaseColumn(TrangThaiCoBanEnum attribute) {
    if (attribute == null) {
      return null;
    }
    return attribute.name();
  }

  @Override
  public TrangThaiCoBanEnum convertToEntityAttribute(String dbData) {
    if (dbData == null) {
      return null;
    }

    try {
        return TrangThaiCoBanEnum.valueOf(dbData);
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
