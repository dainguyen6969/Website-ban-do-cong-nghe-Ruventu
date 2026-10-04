package com.example.dantruventu.Config;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class TrangThaiDoiTacVanChuyenConverter
    implements AttributeConverter<TrangThaiCoBanEnum, String> {

  @Override
  public String convertToDatabaseColumn(TrangThaiCoBanEnum attribute) {
    if (attribute == null) {
      return null;
    }
    return switch (attribute) {
      case HOAT_DONG -> "DANG_HOAT_DONG";
      case NGUNG_HOAT_DONG -> "NGUNG_HOAT_DONG";
    };
  }

  @Override
  public TrangThaiCoBanEnum convertToEntityAttribute(String dbData) {
    if (dbData == null) {
      return null;
    }
    return switch (dbData) {
      case "DANG_HOAT_DONG" -> TrangThaiCoBanEnum.HOAT_DONG;
      case "NGUNG_HOAT_DONG" -> TrangThaiCoBanEnum.NGUNG_HOAT_DONG;
      default -> throw new IllegalArgumentException("Trang thai doi tac khong hop le: " + dbData);
    };
  }
}
