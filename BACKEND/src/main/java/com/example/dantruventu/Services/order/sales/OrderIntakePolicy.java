package com.example.dantruventu.Services.order.sales;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.DonHangRepository;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OrderIntakePolicy {

  private final SalesProperties properties;
  private final DonHangRepository orderRepository;
  private final StringRedisTemplate redis;

  private static final DefaultRedisScript<Long> CHECKOUT_LIMIT =
      new DefaultRedisScript<>(
          """
                    for i = 1, #KEYS do
                      local current = tonumber(redis.call('GET', KEYS[i]) or '0')
                      if current >= tonumber(ARGV[i + 1]) then
                        return 0
                      end
                    end

                    for i = 1, #KEYS do
                      local value = redis.call('INCR', KEYS[i])
                      if value == 1 then
                        redis.call('PEXPIRE', KEYS[i], ARGV[1])
                      end
                    end

                    return 1
                    """,
          Long.class);

  private SalesProperties.Intake config() {
    return properties.getIntake();
  }

  @PostConstruct
  void validateConfiguration() {
    var c = config();

    if (c == null
        || c.getOpensAt() == null
        || c.getClosesAt() == null
        || c.getWorkingDays() == null
        || c.getWorkingDays().isEmpty()
        || c.getClosedDates() == null
        || c.getReviewMinutes() <= 0
        || c.getPrepareMinutes() <= 0
        || c.getTemporaryMaxOrders() <= 0
        || c.getTemporaryMaxPhysicalUnits() <= 0
        || c.getCheckoutIdentityLimit() <= 0
        || c.getCheckoutIpLimit() <= 0
        || c.getCheckoutWindow() == null
        || c.getCheckoutWindow().isZero()
        || c.getCheckoutWindow().isNegative()
        || c.getUnpaidPromotionTtl() == null
        || c.getUnpaidPromotionTtl().isZero()
        || c.getUnpaidPromotionTtl().isNegative()
        || c.getMinimumPaidPercentForReservation() == null
        || c.getMinimumPaidPercentForReservation().signum() < 0
        || c.getMinimumPaidPercentForReservation().compareTo(new BigDecimal("100")) > 0) {

      throw new IllegalStateException("Cấu hình ruventu.sales.intake không hợp lệ");
    }
  }

  public LocalDateTime now() {
    return LocalDateTime.now(properties.zone());
  }

  private record Window(LocalDateTime start, LocalDateTime end) {}

  private List<Window> windows(LocalDateTime from) {
    var c = config();
    List<Window> result = new ArrayList<>();

    for (int offset = -1; offset <= 370; offset++) {
      LocalDate day = from.toLocalDate().plusDays(offset);

      if (!c.isScheduleEnabled()) {
        result.add(new Window(day.atStartOfDay(), day.plusDays(1).atStartOfDay()));
        continue;
      }

      if (!c.getWorkingDays().contains(day.getDayOfWeek()) || c.getClosedDates().contains(day)) {
        continue;
      }

      LocalDateTime start = day.atTime(c.getOpensAt());
      LocalDateTime end = day.atTime(c.getClosesAt());

      // Hỗ trợ ca qua nửa đêm; hai mốc bằng nhau được hiểu là ca 24 giờ.
      if (!end.isAfter(start)) {
        end = end.plusDays(1);
      }

      result.add(new Window(start, end));
    }

    return result;
  }

  public boolean isWorkingNow() {
    LocalDateTime current = now();

    return windows(current).stream()
        .anyMatch(w -> !current.isBefore(w.start()) && current.isBefore(w.end()));
  }

  public LocalDateTime nextWorkingAt() {
    LocalDateTime current = now();

    for (var window : windows(current)) {
      if (window.end().isAfter(current)) {
        return current.isAfter(window.start()) ? current : window.start();
      }
    }

    throw new IllegalStateException("Không xác định được ca làm việc tiếp theo");
  }

  public LocalDateTime businessDeadline(LocalDateTime from, int minutes) {
    long remaining = Math.multiplyExact((long) minutes, 60L);

    for (var window : windows(from)) {
      LocalDateTime start = from.isAfter(window.start()) ? from : window.start();

      if (!window.end().isAfter(start)) {
        continue;
      }

      long available = Duration.between(start, window.end()).getSeconds();

      if (remaining <= available) {
        return start.plusSeconds(remaining);
      }

      remaining -= available;
    }

    throw new IllegalStateException("Hạn xử lý vượt lịch làm việc đã cấu hình");
  }

  public void initialize(DonHang order) {
    if (order.getHanXuLy() == null) {
      order.setHanXuLy(businessDeadline(now(), config().getReviewMinutes()));
    }
  }

  public void approved(DonHang order) {
    order.setLyDoChoXacMinh(null);
    order.setHanGiuHang(null);
    order.setHanGiuUuDai(null);
    order.setHanXuLy(businessDeadline(now(), config().getPrepareMinutes()));
  }

  public LocalDateTime unpaidPromotionDeadline(DonHang order) {
    if (order.getHanGiuHang() != null) {
      return order.getHanGiuHang();
    }

    LocalDateTime created = order.getNgayTao() == null ? now() : order.getNgayTao();

    return created.plus(config().getUnpaidPromotionTtl());
  }

  public String temporaryReason(NguoiDung user, Map<Long, Integer> physicalDemand) {

    if (!isWorkingNow()) {
      return "NGOAI_GIO";
    }

    if (user == null || user.getId() == null) {
      return "CAN_XAC_MINH";
    }

    if (config().isRequireKnownCustomer()
        && orderRepository.countCompletedForIntake(user.getId()) == 0) {
      return "CAN_XAC_MINH";
    }

    long units = physicalDemand.values().stream().mapToLong(Integer::longValue).sum();

    if (units > config().getTemporaryMaxPhysicalUnits()
        || orderRepository.countTemporaryReservations(user.getId())
            >= config().getTemporaryMaxOrders()) {
      return "VUOT_HAN_MUC_GIU";
    }

    return null;
  }

  public boolean paymentEligibleForReservation(BigDecimal total, BigDecimal received) {

    if (total.signum() == 0 || received.compareTo(total) >= 0) {
      return true;
    }

    return received.signum() > 0
        && received
                .multiply(new BigDecimal("100"))
                .compareTo(total.multiply(config().getMinimumPaidPercentForReservation()))
            >= 0;
  }

  public boolean autoApprovePartial() {
    return config().isAutoApprovePartial();
  }

  public void checkCheckoutRate(NguoiDung user, String guestCartId, String remoteAddress) {

    String identity = user == null ? "GUEST:" + guestCartId : "USER:" + user.getId();

    String ip = remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress;

    Long allowed;

    try {
      allowed =
          redis.execute(
              CHECKOUT_LIMIT,
              List.of("sales:intake:identity:" + hash(identity), "sales:intake:ip:" + hash(ip)),
              String.valueOf(config().getCheckoutWindow().toMillis()),
              String.valueOf(config().getCheckoutIdentityLimit()),
              String.valueOf(config().getCheckoutIpLimit()));
    } catch (DataAccessException exception) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Chưa kiểm tra được giới hạn tạo đơn. Vui lòng thử lại cùng yêu cầu.");
    }

    if (!Long.valueOf(1L).equals(allowed)) {
      throw new AppException(
          ErrorCode.TOO_MANY_REQUESTS,
          "Bạn đã gửi nhiều yêu cầu đặt hàng. Vui lòng chờ rồi thử lại.");
    }
  }

  private String hash(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }

  private Object apiTime(LocalDateTime value) {
    return value == null ? null : value.atZone(properties.zone()).toOffsetDateTime();
  }

  public Map<String, Object> preview(
      NguoiDung user, Map<Long, Integer> physicalDemand, boolean staff) {

    boolean working = isWorkingNow();
    String reason = !working ? "NGOAI_GIO" : staff ? null : temporaryReason(user, physicalDemand);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("dang_trong_gio", working);
    result.put("ca_tiep_theo", apiTime(nextWorkingAt()));
    result.put(
        "thong_bao",
        "NGOAI_GIO".equals(reason)
            ? "Đơn được tiếp nhận ngoài giờ. Cửa hàng sẽ xác minh trong ca làm việc tiếp theo; "
                + "đơn chưa thanh toán chưa giữ hàng."
            : reason != null
                ? "Đơn được tiếp nhận để cửa hàng xác minh trước khi giữ hàng."
                : "Quyền giữ tạm được kiểm tra khi tạo đơn. " + "Hết hạn giữ không tự hủy đơn.");

    result.put(
        "luu_y_uu_dai",
        "Ưu đãi được kiểm tra lại khi xác nhận đơn nếu lượt giữ trước đó đã được giải phóng.");

    return result;
  }

  public Map<String, Object> describe(DonHang order) {
    if (order.getLoaiDonHang() != LoaiDonHang.ONLINE
        || !Set.of(
                TrangThaiDonHang.CHO_DUYET,
                TrangThaiDonHang.CHO_HANG,
                TrangThaiDonHang.CHO_DONG_GOI)
            .contains(order.getTrangThaiDonHang())) {
      return Map.of();
    }

    LocalDateTime current = now();
    boolean held = Boolean.TRUE.equals(order.getDaGiuHang());
    boolean expired =
        held && order.getHanGiuHang() != null && !order.getHanGiuHang().isAfter(current);

    String holdLabel =
        held
            ? order.getHanGiuHang() == null
                ? "Đã giữ đủ hàng"
                : expired ? "Đã hết hạn giữ tạm" : "Đang giữ tạm"
            : "Chưa giữ đủ hàng";

    String reason = Objects.toString(order.getLyDoChoXacMinh(), "");

    String message =
        switch (reason) {
          case "NGOAI_GIO" ->
              "Đơn tiếp nhận ngoài giờ; chờ nhân viên xác minh và kiểm tra tồn khi duyệt.";
          case "CAN_XAC_MINH", "VUOT_HAN_MUC_GIU" ->
              "Đơn chờ nhân viên xác minh trước khi cấp giữ hàng.";
          case "HET_HAN_GIU" ->
              "Phần giữ tạm đã được giải phóng. Đơn tiếp tục chờ duyệt và sẽ kiểm tra lại tồn.";
          case "COC_CHUA_DU", "CHUA_DAT_NGUONG_GIU_HANG" ->
              "Đã ghi nhận thanh toán một phần; khoản thực thu chưa đạt "
                  + "ngưỡng tự giữ hàng theo cấu hình.";
          case "CAN_DOI_SOAT_UU_DAI" -> "Ưu đãi cần đối soát trước khi tiếp tục thực hiện đơn.";
          case "CHO_NHAN_VIEN_DUYET" ->
              "Đã giữ đủ hàng theo khoản thu; chờ nhân viên duyệt theo cấu hình.";
          case "CHO_HANG" -> "Đơn chờ bổ sung hàng. Khi đủ điều kiện, nhân viên duyệt để tiếp tục.";
          default ->
              order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_DONG_GOI
                  ? "Đơn đã duyệt, hàng được giữ để chuẩn bị và bàn giao."
                  : "Nhân viên xác minh và duyệt đơn theo tồn hiện tại.";
        };

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("ly_do", order.getLyDoChoXacMinh());
    result.put("nhan_giu_hang", holdLabel);
    result.put("thong_bao", message);
    result.put("han_xu_ly", apiTime(order.getHanXuLy()));
    result.put("han_giu_uu_dai", apiTime(order.getHanGiuUuDai()));
    result.put("qua_han_xu_ly", order.getHanXuLy() != null && !order.getHanXuLy().isAfter(current));
    result.put(
        "nhan_han_xu_ly",
        order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_DONG_GOI
            ? "Hạn chuẩn bị"
            : "Hạn xác minh");
    return result;
  }
}
