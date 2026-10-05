package com.example.dantruventu.Config;

import static org.junit.jupiter.api.Assertions.*;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import org.junit.jupiter.api.Test;

class TrangThaiDoiTacVanChuyenConverterTest {

  @Test
  void preservesLegacyStringsAndNumericApiValues() {
    var converter = new TrangThaiDoiTacVanChuyenConverter();
    assertEquals("DANG_HOAT_DONG", converter.convertToDatabaseColumn(TrangThaiCoBanEnum.HOAT_DONG));
    assertEquals(
        "NGUNG_HOAT_DONG", converter.convertToDatabaseColumn(TrangThaiCoBanEnum.NGUNG_HOAT_DONG));
    assertEquals((short) 1, converter.convertToEntityAttribute("DANG_HOAT_DONG").getValue());
    assertEquals((short) 0, converter.convertToEntityAttribute("NGUNG_HOAT_DONG").getValue());
    assertNull(converter.convertToDatabaseColumn(null));
    assertNull(converter.convertToEntityAttribute(null));
    assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute("1"));
  }
}
