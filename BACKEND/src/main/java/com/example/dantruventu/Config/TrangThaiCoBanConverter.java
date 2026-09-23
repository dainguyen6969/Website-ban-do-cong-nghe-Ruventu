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

    return TrangThaiCoBanEnum.fromValue(dbData);
  }
}
