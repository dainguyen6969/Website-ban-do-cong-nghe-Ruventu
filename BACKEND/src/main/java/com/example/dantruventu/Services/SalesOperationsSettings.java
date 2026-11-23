package com.example.dantruventu.Services;

import com.example.dantruventu.Config.SalesProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
public class SalesOperationsSettings {
  private final JdbcTemplate jdbc;
  private final ObjectMapper json;
  private final Values defaults;
  private final Duration defaultLongWait;

  public record Values(
      @NotNull Boolean scheduleEnabled,
      @NotNull LocalTime opensAt,
      @NotNull LocalTime closesAt,
      @NotEmpty Set<@NotNull DayOfWeek> workingDays,
      @NotNull @Size(max = 366) Set<@NotNull LocalDate> closedDates,
      @NotNull @Min(1) @Max(10080) Integer reviewMinutes,
      @NotNull @Min(1) @Max(10080) Integer prepareMinutes,
      @NotNull @DecimalMin("0") @Digits(integer = 9, fraction = 2) BigDecimal deliveryFee,
      @NotNull Boolean stockNotificationWebsiteEnabled,
      @NotNull @Min(1) @Max(8760) Long backorderLongWaitHours) {
    @JsonIgnore
    @AssertTrue(message = "Ca làm việc phải dài ít nhất 1 phút.")
    public boolean isShiftValid() {
      if (opensAt == null || closesAt == null) return false;
      if (Boolean.FALSE.equals(scheduleEnabled) || opensAt.equals(closesAt)) return true;
      var length = Duration.between(opensAt, closesAt);
      return (length.isNegative() ? length.plusDays(1) : length).compareTo(Duration.ofMinutes(1)) >= 0;
    }
  }

  public SalesOperationsSettings(
      JdbcTemplate jdbc,
      ObjectMapper json,
      SalesProperties properties,
      @Value("${ruventu.order.delivery-fee:30000}") BigDecimal deliveryFee,
      @Value("${ruventu.sales.stock-notification-website-enabled:true}") boolean stockNotification,
      @Value("${ruventu.sales.backorder-long-wait:PT72H}") Duration longWait) {
    this.jdbc = jdbc;
    this.json = json;
    var intake = properties.getIntake();
    // Preserve deployment durations that contain part of an hour before the first override.
    this.defaultLongWait = longWait;
    defaults = new Values(
        intake.isScheduleEnabled(), intake.getOpensAt(), intake.getClosesAt(),
        Set.copyOf(intake.getWorkingDays()), Set.copyOf(intake.getClosedDates()),
        intake.getReviewMinutes(), intake.getPrepareMinutes(),
        deliveryFee, stockNotification, Math.max(1, longWait.toHours()));
    if (!defaults.isShiftValid()) throw new IllegalStateException("Ca làm việc phải dài ít nhất 1 phút.");
  }

  public Values get() {
    return jdbc.queryForList(
            "SELECT tuy_chinh FROM cai_dat_van_hanh_ban_hang WHERE id = 1", String.class)
        .stream()
        .findFirst()
        .map(raw -> json.readValue(raw, Values.class))
        .orElse(defaults);
  }

  public Duration longWait() {
    var values = get();
    return values == defaults ? defaultLongWait : Duration.ofHours(values.backorderLongWaitHours());
  }

  public Values save(Values values) {
    var document = json.writeValueAsString(values);
    jdbc.update(
        """
        INSERT INTO cai_dat_van_hanh_ban_hang (id, tuy_chinh) VALUES (1, ?)
        ON DUPLICATE KEY UPDATE tuy_chinh = ?
        """,
        document, document);
    return values;
  }
}
