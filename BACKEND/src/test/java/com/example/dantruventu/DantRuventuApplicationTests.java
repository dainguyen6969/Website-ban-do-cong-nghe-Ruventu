package com.example.dantruventu;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.dantruventu.Mapper.product.ThuongHieuMapper;
import com.example.dantruventu.Services.SystemSettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class DantRuventuApplicationTests {

  @Autowired private ThuongHieuMapper thuongHieuMapper;
  @Autowired private SystemSettingsService systemSettings;

  @Test
  void contextLoads() {
    assertNotNull(thuongHieuMapper);
  }

  @Test
  void settingsAreReadyAfterStartup() {
    var typography = systemSettings.getTypography();
    assertNotNull(typography.fontFamily());
    assertTrue(typography.fontSize() >= 12 && typography.fontSize() <= 20);
    systemSettings.isMaintenance();
  }
}
