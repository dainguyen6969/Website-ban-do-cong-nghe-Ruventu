package com.example.dantruventu.Config;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TrangThaiCoBanConverter implements AttributeConverter<TrangThaiCoBanEnum, Short> {

  @Override
  public Short convertToDatabaseColumn(TrangThaiCoBanEnum attribute) {
    return attribute == null ? null : attribute.getValue();
  }

  @Override
  public TrangThaiCoBanEnum convertToEntityAttribute(Short dbData) {
    return dbData == null ? null : TrangThaiCoBanEnum.fromValue(dbData);
  }
}
