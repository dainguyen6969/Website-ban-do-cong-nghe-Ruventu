package com.example.dantruventu;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.example.dantruventu.Mapper.product.ThuongHieuMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class DantRuventuApplicationTests {

  @Autowired private ThuongHieuMapper thuongHieuMapper;

  @Test
  void contextLoads() {
    assertNotNull(thuongHieuMapper);
  }
}
