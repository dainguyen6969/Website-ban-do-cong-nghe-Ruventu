package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Services.order.sales.OrderIntakePolicy;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

class SalesOperationsSettingsTest {
  private static final String SELECT =
      "SELECT tuy_chinh FROM cai_dat_van_hanh_ban_hang WHERE id = 1";
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private final ObjectMapper json = new ObjectMapper();
  private final SalesProperties properties = new SalesProperties();
  private final SalesOperationsSettings settings =
      new SalesOperationsSettings(
          jdbc, json, properties, new BigDecimal("31000"), true, Duration.ofHours(72));

  @Test
  void usesDeploymentDefaultsThenReadsSavedValuesInTheOrderFlow() {
    when(jdbc.queryForList(SELECT, String.class)).thenReturn(List.of());
    assertEquals(new BigDecimal("31000"), settings.get().deliveryFee());
    assertEquals(Duration.ofHours(72), settings.longWait());

    var saved =
        new SalesOperationsSettings.Values(
            true,
            LocalTime.of(8, 0),
            LocalTime.of(12, 0),
            Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY),
            Set.of(LocalDate.of(2026, 11, 25)),
            30,
            60,
            new BigDecimal("45000"),
            false,
            36L);
    settings.save(saved);
    String document = json.writeValueAsString(saved);
    verify(jdbc).update(anyString(), eq(document), eq(document));
    when(jdbc.queryForList(SELECT, String.class)).thenReturn(List.of(document));
    assertEquals(saved, settings.get());
    assertEquals(Duration.ofHours(36), settings.longWait());

    var policy =
        new OrderIntakePolicy(
            properties, mock(DonHangRepository.class), mock(StringRedisTemplate.class), settings) {
          @Override
          public LocalDateTime now() {
            return LocalDateTime.of(2026, 11, 23, 11, 45);
          }
        };
    var order = new DonHang();
    policy.initialize(order);
    assertEquals(LocalDateTime.of(2026, 11, 30, 8, 15), order.getHanXuLy());
    policy.approved(order);
    assertEquals(LocalDateTime.of(2026, 11, 30, 8, 45), order.getHanXuLy());
  }

  @Test
  void validatesWorkingDaysAndNumericSettingsWhileAcceptingAnOvernightShift() {
    var invalid =
        new SalesOperationsSettings.Values(
            true,
            LocalTime.of(8, 0),
            LocalTime.of(8, 0, 2),
            Set.of(),
            Set.of(),
            0,
            60,
            BigDecimal.valueOf(-1),
            true,
            0L);
    var overnight =
        new SalesOperationsSettings.Values(
            true,
            LocalTime.of(22, 0),
            LocalTime.of(6, 0),
            Set.of(DayOfWeek.MONDAY),
            Set.of(),
            30,
            60,
            BigDecimal.ZERO,
            true,
            72L);
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      assertEquals(5, validator.validate(invalid).size());
      assertTrue(validator.validate(overnight).isEmpty());
    }
  }
}
