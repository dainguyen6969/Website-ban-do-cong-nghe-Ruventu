package com.example.dantruventu.Config;

import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "ruventu.sales")
public class SalesProperties {

  private String timeZone = "Asia/Ho_Chi_Minh";

  private boolean cardEnabled = true;

  private Map<Long, PromotionRule> promotionRules = new HashMap<>();

  public ZoneId zone() {
    return ZoneId.of(timeZone);
  }

  public enum DiscountUnit {
    TIEN,
    PHAN_TRAM
  }

  @Getter
  @Setter
  public static class PromotionRule {

    private DiscountUnit unit;

    private Set<Long> targetIds = new HashSet<>();
  }
}
