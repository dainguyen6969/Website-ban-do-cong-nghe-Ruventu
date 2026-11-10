package com.example.dantruventu.Config;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
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

  /** Số ngày được yêu cầu trả, tính từ thời điểm khách thực nhận đơn. */
  private int returnWindowDays = 30;

  private Map<Long, PromotionRule> promotionRules = new HashMap<>();

  private Intake intake = new Intake();

  @Getter
  @Setter
  public static class Intake {

    private boolean scheduleEnabled = true;

    private LocalTime opensAt = LocalTime.of(8, 0);

    private LocalTime closesAt = LocalTime.of(22, 0);

    private Set<DayOfWeek> workingDays = EnumSet.allOf(DayOfWeek.class);

    private Set<LocalDate> closedDates = new HashSet<>();

    private int reviewMinutes = 120;

    private int prepareMinutes = 240;

    private Duration unpaidPromotionTtl = Duration.ofMinutes(30);

    private boolean requireKnownCustomer = true;

    private int temporaryMaxOrders = 2;

    private int temporaryMaxPhysicalUnits = 10;

    private int checkoutIdentityLimit = 5;

    private int checkoutIpLimit = 30;

    private Duration checkoutWindow = Duration.ofMinutes(10);

    private BigDecimal minimumPaidPercentForReservation = BigDecimal.ZERO;

    private boolean autoApprovePartial = true;
  }

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
