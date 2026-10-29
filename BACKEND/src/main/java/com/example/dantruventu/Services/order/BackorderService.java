package com.example.dantruventu.Services.order;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.CustomerCheckoutRequest;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Services.order.sales.OrderIntakePolicy;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Services.order.sales.SalesQuoteService;
import com.example.dantruventu.Services.warehouse.RecallSafety;
import com.example.dantruventu.Services.warehouse.WarehouseSupport;
import jakarta.persistence.EntityManager;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BackorderService {

  private final JdbcTemplate jdbc;
  private final EntityManager entityManager;
  private final DonHangRepository orders;
  private final AdminOrderService orderService;
  private final OrderInventoryService inventory;
  private final SalesCalculationService calculation;
  private final SalesContext context;
  private final OrderIntakePolicy intake;
  private final SalesProperties properties;
  private final WarehouseSupport once;
  private final RecallSafety recallSafety;
  private final OrderEvents events;
  private final ObjectMapper json;

  @Value("${ruventu.sales.backorder-website-enabled:true}")
  private boolean websiteEnabled;

  @Value("${ruventu.sales.backorder-long-wait:PT72H}")
  private Duration longWait;

  public record Result(Long id, String action) {}

  public record NoticeRegistration(
      @NotNull @Positive Long variantId,
      @NotBlank @Size(max = 100) String name,
      @NotBlank @Pattern(regexp = "^(?:\\+84|0)[0-9]{9,10}$") String phone,
      @NotNull @AssertTrue Boolean confirmed) {}

  public record ContactCommand(
      @NotNull @Min(0) Long revision,
      @NotBlank String result,
      @Positive Long employeeId,
      OffsetDateTime nextContactAt,
      OffsetDateTime promisedAt,
      @Size(max = 30) String remainingMethod,
      @NotBlank @Size(max = 1000) String note,
      @NotNull @AssertTrue Boolean confirmed) {}

  public void requireWebsiteEnabled() {
    if (!websiteEnabled) {
      throw conflict("Cửa hàng chưa mở tiếp nhận yêu cầu chờ hàng từ website.");
    }
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void recordWebsiteOrder(DonHang order, String remainingMethod) {
    jdbc.update(
        """
                INSERT INTO rv_waiting_order (
                  order_id, remaining_method,
                  terms_version, terms_text, terms_accepted_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
        order.getId(),
        remainingMethod,
        CustomerCheckoutRequest.WAITING_TERMS_VERSION,
        CustomerCheckoutRequest.WAITING_TERMS_TEXT,
        stamp(now()),
        stamp(now()));
  }

  public Map<String, Object> customerIntake(DonHang order, Map<String, Object> original) {

    Map<String, Object> result = new LinkedHashMap<>(original);

    var rows =
        jdbc.queryForList(
            """
                        SELECT terms_version, terms_text, terms_accepted_at, promised_at
                        FROM rv_waiting_order
                        WHERE order_id = ?
                        """,
            order.getId());

    if (!rows.isEmpty()) {
      var row = rows.getFirst();
      result.put("dieu_kien_phien_ban", row.get("terms_version"));
      result.put("dieu_kien_noi_dung", row.get("terms_text"));
      result.put("ngay_dong_y_cho_hang", safe(row.get("terms_accepted_at")));
      result.put("ngay_hen_co_hang", safe(row.get("promised_at")));
    }

    return result;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Result registerNotice(
      NguoiDung user,
      String guestCartId,
      String remoteAddress,
      String key,
      NoticeRegistration request) {

    requireWebsiteEnabled();

    String identity = SalesQuoteService.identity(user, guestCartId);
    Long actorId = user == null ? 0L : user.getId();

    return once.once(
        "STOCK_NOTICE_REGISTER",
        request.variantId(),
        key,
        List.of(identity, request),
        actorId,
        Result.class,
        () -> {
          intake.checkStockNoticeRate(user, guestCartId, remoteAddress);

          var availability = calculation.readSaleAvailability(request.variantId());

          if (availability.quantity() == null) {
            throw conflict("Sản phẩm hiện chưa đủ điều kiện tiếp nhận đăng ký.");
          }

          if (availability.quantity() > 0) {
            throw conflict("Sản phẩm hiện có hàng. Vui lòng kiểm tra lại trước khi mua.");
          }

          String phone = request.phone();
          if (phone.startsWith("+84")) {
            phone = "0" + phone.substring(3);
          }

          jdbc.update(
              """
                            INSERT INTO rv_stock_notice (
                              variant_id, customer_name, phone,
                              consented_at, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE id = id
                            """,
              request.variantId(),
              request.name().strip(),
              phone,
              stamp(now()),
              stamp(now()),
              stamp(now()));

          // Không trả thông tin của đăng ký trùng ra API công khai.
          return new Result(null, "DANG_KY_BAO_HANG");
        });
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public Object queue(
      String kind, String keyword, int priority, Long orderId, int page, int limit) {

    NguoiDung actor = context.actor();
    boolean orderKind = orderKind(kind);

    if (page < 0
        || limit < 1
        || limit > 50
        || priority < 0
        || priority > 4
        || (orderId != null && orderId <= 0)) {
      throw invalid("Bộ lọc hoặc phân trang không hợp lệ.");
    }

    String search = keyword == null ? "" : keyword.strip().toLowerCase(Locale.ROOT);
    if (search.length() > 100 || longWait.isNegative() || longWait.isZero()) {
      throw invalid("Từ khóa hoặc cấu hình thời gian chờ không hợp lệ.");
    }

    LocalDateTime at = now();
    List<Map<String, Object>> rows = new ArrayList<>();

    if (orderKind) {
      var ids =
          jdbc.queryForList(
              """
                            SELECT d.id
                            FROM don_hang d
                            LEFT JOIN rv_waiting_order w ON w.order_id = d.id
                            WHERE d.loai_don_hang = 'ONLINE'
                              AND d.trang_thai_don_hang IN ('CHO_HANG', 'CHO_DUYET')
                              AND d.trang_thai_dong_goi = 'CHUA_DONG_GOI'
                              AND d.trang_thai_xuat_kho = 'CHUA_XUAT_KHO'
                              AND (
                                d.trang_thai_don_hang = 'CHO_HANG'
                                OR w.order_id IS NOT NULL
                              )
                              AND (? IS NULL OR d.id = ?)
                            ORDER BY d.id
                            """,
              Long.class,
              orderId,
              orderId);

      for (Long id : ids) {
        rows.add(orderRow(orders.findById(id).orElseThrow(), at));
      }
    } else {
      var notices =
          jdbc.queryForList(
              """
                            SELECT n.*, v.ten_phien_ban, p.ten_san_pham,
                                   a.ho_ten AS employee_name,
                                   c.ho_ten AS last_contact_name
                            FROM rv_stock_notice n
                            JOIN phien_ban_san_pham v ON v.id = n.variant_id
                            JOIN san_pham p ON p.id = v.san_pham_id
                            LEFT JOIN nguoi_dung a ON a.id = n.employee_id
                            LEFT JOIN nguoi_dung c ON c.id = n.last_contact_by
                            WHERE n.status = 'CHO_THONG_BAO'
                            ORDER BY n.id
                            """);

      Map<Long, SalesCalculationService.SaleAvailability> availability = new HashMap<>();

      for (var notice : notices) {
        Long variantId = number(notice.get("variant_id"));
        var current = availability.computeIfAbsent(variantId, calculation::readSaleAvailability);
        rows.add(noticeRow(notice, current, at));
      }
    }

    rows.removeIf(
        row ->
            !search.isEmpty()
                && !(row.get("code")
                        + " "
                        + row.get("customer")
                        + " "
                        + row.get("phone")
                        + " "
                        + row.get("products")
                        + " "
                        + row.get("employee_name"))
                    .toLowerCase(Locale.ROOT)
                    .contains(search));

    Map<String, Long> summary = new LinkedHashMap<>();
    for (int level = 1; level <= 4; level++) {
      int selected = level;
      summary.put(
          String.valueOf(level),
          rows.stream().filter(row -> number(row.get("priority")) == selected).count());
    }

    rows.removeIf(row -> priority != 0 && number(row.get("priority")) != priority);

    rows.sort(
        Comparator.comparingLong((Map<String, Object> row) -> number(row.get("priority")))
            .thenComparing(
                row -> local(row.get("deadline")), Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(
                row -> local(row.get("created_at")),
                Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparingLong(row -> number(row.get("id"))));

    int total = rows.size();
    int currentPage = Math.min(page, Math.max(0, (total - 1) / limit));
    int from = Math.min(total, currentPage * limit);
    int to = Math.min(total, from + limit);

    return Map.of(
        "items",
        safe(rows.subList(from, to)),
        "totalItems",
        total,
        "page",
        currentPage,
        "pageSize",
        limit,
        "summary",
        summary,
        "employees",
        employees(),
        "actor_id",
        actor.getId(),
        "can_assign_others",
        actor.getVaiTro() != null && "ADMIN".equals(actor.getVaiTro().getTenVaiTro()),
        "updated_at",
        at.atZone(properties.zone()).toOffsetDateTime());
  }

  private Map<String, Object> orderRow(DonHang order, LocalDateTime at) {
    var found =
        jdbc.queryForList(
            """
                        SELECT w.*, a.ho_ten AS employee_name,
                               c.ho_ten AS last_contact_name
                        FROM rv_waiting_order w
                        LEFT JOIN nguoi_dung a ON a.id = w.employee_id
                        LEFT JOIN nguoi_dung c ON c.id = w.last_contact_by
                        WHERE w.order_id = ?
                        """,
            order.getId());

    Map<String, Object> metadata = found.isEmpty() ? Map.of() : found.getFirst();

    String customer = text(order.getTenNguoiNhan());
    if (customer == null && order.getKhachHang() != null) {
      customer = order.getKhachHang().getHoTen();
    }

    String phone = text(order.getSdtNguoiNhan());
    if (phone == null && order.getKhachHang() != null) {
      phone = order.getKhachHang().getSoDienThoai();
    }

    var row =
        base(
            metadata,
            "ORDER",
            order.getId(),
            order.getMaDonHang(),
            customer,
            phone,
            order.getNgayTao());

    if (row.get("employee_id") == null && order.getNhanVien() != null) {
      row.put("employee_id", order.getNhanVien().getId());
      row.put("employee_name", order.getNhanVien().getHoTen());
    }

    boolean delivery = text(order.getDiaChiGiaoHang()) != null;
    row.put("delivery", delivery);
    row.put(
        "status_label",
        order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_HANG ? "Chờ hàng" : "Chờ duyệt");

    var evidence = orderService.failedDeliveryMoney(order);
    boolean evidenceValid = Boolean.TRUE.equals(evidence.get("co_du_can_cu"));
    BigDecimal received = evidenceValid ? (BigDecimal) evidence.get("so_tien_thuc_thu") : null;
    BigDecimal refunded = evidenceValid ? (BigDecimal) evidence.get("so_tien_da_hoan") : null;
    boolean moneyReady = evidenceValid && refunded.signum() == 0;
    boolean paid = moneyReady && received.signum() > 0;

    BigDecimal remaining = moneyReady ? order.getTongThanhToan().subtract(received) : null;

    String method = text((String) row.get("remaining_method"));
    if (method == null
        && order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {
      method = initialCollection(order);
    }

    row.put("remaining_method", method);
    row.put("received", received);
    row.put("refunded", refunded);
    row.put("remaining", remaining);
    row.put("cod_remaining", "COD".equals(method) ? remaining : null);

    String paymentLabel;
    if (!moneyReady) {
      paymentLabel = "Cần đối soát thanh toán";
    } else if (order.getTongThanhToan().signum() == 0) {
      paymentLabel = "Không phát sinh thanh toán";
    } else if (received.signum() == 0) {
      paymentLabel = "Chưa thanh toán";
    } else if (remaining.signum() == 0) {
      paymentLabel = "Đã thanh toán toàn bộ";
    } else {
      paymentLabel = "Đã thanh toán một phần";
    }
    row.put("payment_label", paymentLabel);

    List<Map<String, Object>> products = new ArrayList<>();
    boolean blocked = false;
    boolean enough = true;
    boolean someHeld = false;
    boolean canAdd = false;

    for (var original : inventory.waitingStockRows(order)) {
      var product = new LinkedHashMap<>(original);
      long required = number(product.get("so_luong_can"));
      long held = number(product.get("so_luong_da_giu"));
      long free = number(product.get("ton_co_the_ban"));

      if (recallSafety.variantBlocked(number(product.get("phien_ban_id")))) {
        blocked = true;
        free = 0;
        product.put("ton_co_the_ban", 0);
      }

      product.put("so_luong_thieu", Math.max(0, required - held - free));
      enough &= held + free >= required;
      someHeld |= held > 0;
      canAdd |= held < required && free > 0;
      products.add(product);
    }

    boolean expired = order.getHanGiuHang() != null && !order.getHanGiuHang().isAfter(at);
    boolean full = inventory.hasQuantityReservation(order) && !expired;
    boolean stopped = "KHONG_TIEP_TUC".equals(row.get("contact_result"));
    boolean promotionProblem = "CAN_DOI_SOAT_UU_DAI".equals(order.getLyDoChoXacMinh());

    row.put("products", products);
    row.put(
        "reservation_label",
        full
            ? "Đã giữ đủ hàng"
            : expired || "HET_HAN_GIU".equals(order.getLyDoChoXacMinh())
                ? "Đã hết hạn giữ"
                : someHeld ? "Đã giữ một phần" : "Chưa giữ hàng");

    String override =
        stopped
            ? "Khách không tiếp tục chờ — cần xử lý đơn"
            : !moneyReady
                ? "Cần đối soát thanh toán"
                : blocked
                    ? "Cần đối soát phạm vi thu hồi"
                    : promotionProblem ? "Cần đối soát ưu đãi" : null;

    boolean ready =
        enough
            && !products.isEmpty()
            && !expired
            && !stopped
            && !blocked
            && moneyReady
            && !promotionProblem;

    boolean eligible =
        paid && intake.paymentEligibleForReservation(order.getTongThanhToan(), received);

    finish(
        row,
        at,
        ready,
        paid,
        canAdd && eligible && !full && !expired && override == null,
        override,
        Boolean.TRUE.equals(row.get("is_new")) ? order.getHanXuLy() : null);

    return row;
  }

  private Map<String, Object> noticeRow(
      Map<String, Object> notice,
      SalesCalculationService.SaleAvailability availability,
      LocalDateTime at) {

    Long id = number(notice.get("id"));
    var row =
        base(
            notice,
            "NOTICE",
            id,
            "BÁO HÀNG #" + id,
            (String) notice.get("customer_name"),
            (String) notice.get("phone"),
            local(notice.get("created_at")));

    Map<String, Object> product = new LinkedHashMap<>();
    product.put("ten_san_pham", notice.get("ten_san_pham"));
    product.put("ten_phien_ban", notice.get("ten_phien_ban"));
    product.put("ton_co_the_ban", availability.quantity());

    row.put("products", List.of(product));
    row.put("status_label", "Chờ thông báo");
    row.put("reservation_label", "Không giữ hàng");
    row.put("payment_label", "Không phát sinh thanh toán");

    boolean ready = availability.quantity() != null && availability.quantity() > 0;

    finish(
        row,
        at,
        ready,
        false,
        false,
        ready
            ? "Thông báo có hàng cho khách"
            : availability.quantity() == null ? "Cần kiểm tra sản phẩm" : null,
        null);

    return row;
  }

  private Map<String, Object> base(
      Map<String, Object> metadata,
      String kind,
      Long id,
      String code,
      String customer,
      String phone,
      LocalDateTime created) {

    var row = new LinkedHashMap<>(metadata);
    row.put("kind", kind);
    row.put("id", id);
    row.put("code", code);
    row.put("customer", customer == null ? "Khách hàng" : customer);
    row.put("phone", phone);
    row.put("created_at", created);
    row.put("revision", number(metadata.get("revision")));
    row.put("is_new", number(metadata.get("revision")) == 0);
    row.put("customer_contacted", yes(metadata.get("customer_contacted")));
    row.putIfAbsent("contact_result", "CHUA_LIEN_HE");
    return row;
  }

  private void finish(
      Map<String, Object> row,
      LocalDateTime at,
      boolean ready,
      boolean paid,
      boolean canAdd,
      String override,
      LocalDateTime firstHandlingDeadline) {

    LocalDateTime due = earlier(local(row.get("next_contact_at")), local(row.get("promised_at")));

    boolean overdue = due != null && !due.isAfter(at);
    LocalDateTime created = local(row.get("created_at"));
    Long minutes = created == null ? null : Math.max(0, Duration.between(created, at).toMinutes());
    boolean waitingLong = created != null && Duration.between(created, at).compareTo(longWait) >= 0;

    int priority = overdue ? 1 : ready ? paid ? 2 : 3 : 4;

    row.put("priority", priority);
    row.put("deadline", due == null ? firstHandlingDeadline : due);
    row.put("overdue", overdue);
    row.put("wait_minutes", minutes);
    row.put("long_wait", waitingLong);
    row.put("ready", ready);
    row.put("can_add", canAdd);

    row.put(
        "action_label",
        override != null
            ? override
            : overdue
                ? "Cần liên hệ khách"
                : ready
                    ? paid ? "Kiểm tra và duyệt đơn" : "Xác minh khách và duyệt đơn"
                    : canAdd
                        ? "Có thể giữ bổ sung"
                        : Boolean.TRUE.equals(row.get("is_new"))
                            ? "Tiếp nhận và lên lịch xử lý"
                            : "Chờ bổ sung hàng");

    List<String> signals = new ArrayList<>();
    if (Boolean.TRUE.equals(row.get("is_new"))) signals.add("Chưa xử lý");
    if (overdue) signals.add("Đến hạn liên hệ / mốc hẹn");
    if (ready) signals.add("Đủ tồn để kiểm tra");
    if (canAdd) signals.add("Có thể giữ bổ sung");
    if (waitingLong) signals.add("Chờ lâu");
    row.put("signals", signals);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Result contact(String kind, Long id, String key, ContactCommand request) {
    NguoiDung actor = context.actor();
    boolean orderKind = orderKind(kind);

    return once.once(
        "WAITING_CONTACT",
        id,
        key,
        List.of(kind, request),
        actor.getId(),
        Result.class,
        () -> {
          DonHang order = null;

          if (orderKind) {
            order =
                orders.findByIdForUpdate(id).orElseThrow(() -> notFound("Đơn hàng không tồn tại."));
            entityManager.refresh(order);

            if (order.getLoaiDonHang() != LoaiDonHang.ONLINE
                || !Set.of(TrangThaiDonHang.CHO_HANG, TrangThaiDonHang.CHO_DUYET)
                    .contains(order.getTrangThaiDonHang())
                || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
                || order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO) {
              throw conflict("Đơn không còn thuộc hàng chờ xử lý.");
            }

            if (order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_DUYET
                && jdbc.queryForObject(
                        "SELECT COUNT(*) FROM rv_waiting_order WHERE order_id = ?", Long.class, id)
                    == 0) {
              throw conflict("Đơn không thuộc hồ sơ chờ hàng.");
            }

            jdbc.update(
                """
                                INSERT INTO rv_waiting_order (order_id)
                                VALUES (?)
                                ON DUPLICATE KEY UPDATE order_id = order_id
                                """,
                id);
          }

          String table = orderKind ? "rv_waiting_order" : "rv_stock_notice";
          String pk = orderKind ? "order_id" : "id";
          var found =
              jdbc.queryForList("SELECT * FROM " + table + " WHERE " + pk + " = ? FOR UPDATE", id);

          if (found.size() != 1) throw notFound("Không tìm thấy yêu cầu chờ xử lý.");
          var previous = found.getFirst();

          if (!orderKind && !"CHO_THONG_BAO".equals(previous.get("status"))) {
            throw conflict("Đăng ký đã kết thúc.");
          }

          if (number(previous.get("revision")) != request.revision()) {
            throw conflict("Thông tin đã thay đổi. Đóng hộp thoại và mở lại để đối chiếu.");
          }

          Set<String> allowed =
              orderKind
                  ? Set.of(
                      "HEN_XU_LY",
                      "KHONG_LIEN_LAC_DUOC",
                      "DONG_Y_CHO",
                      "XAC_NHAN_MUA",
                      "KHONG_TIEP_TUC")
                  : Set.of(
                      "HEN_XU_LY", "KHONG_LIEN_LAC_DUOC",
                      "DA_THONG_BAO", "HUY_DANG_KY");

          if (!allowed.contains(request.result())) {
            throw invalid("Kết quả xử lý không hợp lệ.");
          }

          boolean planning = "HEN_XU_LY".equals(request.result());
          boolean connected =
              Set.of("DONG_Y_CHO", "XAC_NHAN_MUA", "KHONG_TIEP_TUC", "DA_THONG_BAO", "HUY_DANG_KY")
                  .contains(request.result());

          LocalDateTime at = now();
          LocalDateTime next = local(request.nextContactAt());

          boolean needsNext =
              Set.of("HEN_XU_LY", "KHONG_LIEN_LAC_DUOC", "DONG_Y_CHO").contains(request.result());

          if ((needsNext && next == null) || (next != null && !next.isAfter(at))) {
            throw invalid("Chọn lịch xử lý hoặc liên hệ tiếp theo trong tương lai.");
          }

          LocalDateTime promised = local(previous.get("promised_at"));
          String remainingMethod = text((String) previous.get("remaining_method"));

          if (orderKind
              && remainingMethod == null
              && order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {
            remainingMethod = initialCollection(order);
          }

          if (orderKind && connected) {
            LocalDateTime proposed = local(request.promisedAt());

            if (proposed != null && !proposed.isAfter(at) && !Objects.equals(proposed, promised)) {
              throw invalid("Mốc hẹn có hàng mới phải nằm trong tương lai.");
            }

            promised = proposed;
            remainingMethod = text(request.remainingMethod());

            if (remainingMethod != null
                && !Set.of("COD", "CHUYEN_KHOAN", "TAI_CUA_HANG").contains(remainingMethod)) {
              throw invalid("Hình thức thu phần còn lại không hợp lệ.");
            }

            if ("COD".equals(remainingMethod) && text(order.getDiaChiGiaoHang()) == null) {
              throw invalid("Đơn nhận tại cửa hàng không sử dụng COD giao hàng.");
            }
          }

          String noticeStatus = "CHO_THONG_BAO";
          if (!orderKind && "DA_THONG_BAO".equals(request.result())) {
            var availability = calculation.readSaleAvailability(number(previous.get("variant_id")));

            if (availability.quantity() == null || availability.quantity() <= 0) {
              throw conflict("Chưa có tồn có thể bán để xác nhận đã thông báo có hàng.");
            }

            noticeStatus = "DA_THONG_BAO";
            next = null;
          }

          if (!orderKind && "HUY_DANG_KY".equals(request.result())) {
            noticeStatus = "HUY";
            next = null;
          }

          Long employeeId = context.employee(request.employeeId(), actor).getId();

          String effectiveResult =
              planning
                  ? Objects.toString(previous.get("contact_result"), "CHUA_LIEN_HE")
                  : request.result();

          Object effectiveNote = planning ? previous.get("contact_note") : request.note().strip();

          List<Object> args = new ArrayList<>();
          Collections.addAll(
              args,
              employeeId,
              effectiveResult,
              effectiveNote,
              connected,
              planning ? previous.get("last_contact_at") : stamp(at),
              planning ? previous.get("last_contact_by") : actor.getId(),
              stamp(next),
              stamp(at));

          String update =
              "UPDATE "
                  + table
                  + """
               SET revision = revision + 1,
                   employee_id = ?,
                   contact_result = ?,
                   contact_note = ?,
                   customer_contacted = customer_contacted OR ?,
                   last_contact_at = ?,
                   last_contact_by = ?,
                   next_contact_at = ?,
                   updated_at = ?
              """;

          if (orderKind) {
            update += ", promised_at = ?, remaining_method = ?";
            args.add(stamp(promised));
            args.add(remainingMethod);
          } else {
            update += ", status = ?";
            args.add(noticeStatus);
          }

          update += " WHERE " + pk + " = ? AND revision = ?";
          args.add(id);
          args.add(request.revision());

          if (jdbc.update(update, args.toArray()) != 1) {
            throw conflict("Thông tin vừa được người khác cập nhật.");
          }

          jdbc.update(
              """
                            INSERT INTO rv_waiting_contact (
                              order_id, notice_id, result, note,
                              actor_id, occurred_at, payload
                            ) VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))
                            """,
              orderKind ? id : null,
              orderKind ? null : id,
              request.result(),
              request.note().strip(),
              actor.getId(),
              stamp(at),
              json.writeValueAsString(request));

          if (orderKind) events.changed(id, "BACKORDER_CONTACT");

          return new Result(id, request.result());
        });
  }

  public Object history(String kind, Long id) {
    context.actor();
    String column = orderKind(kind) ? "order_id" : "notice_id";

    return safe(
        jdbc.queryForList(
            """
                        SELECT h.id, h.result, h.note, h.occurred_at,
                               n.ho_ten AS actor_name
                        FROM rv_waiting_contact h
                        JOIN nguoi_dung n ON n.id = h.actor_id
                        WHERE
                        """
                + column
                + " = ? ORDER BY h.id DESC",
            id));
  }

  private List<Map<String, Object>> employees() {
    return entityManager
        .createQuery(
            """
                        SELECT n FROM NguoiDung n
                        JOIN FETCH n.vaiTro r
                        WHERE n.trangThai = :active
                          AND r.tenVaiTro IN :roles
                        ORDER BY n.hoTen, n.id
                        """,
            NguoiDung.class)
        .setParameter("active", TrangThaiCoBanEnum.HOAT_DONG)
        .setParameter("roles", List.of("ADMIN", "QUAN_LY", "NHAN_VIEN_BAN_HANG", "STAFF"))
        .getResultList()
        .stream()
        .map(
            user ->
                Map.<String, Object>of(
                    "id", user.getId(),
                    "name", Objects.toString(user.getHoTen(), "Nhân viên #" + user.getId())))
        .toList();
  }

  private String initialCollection(DonHang order) {
    if (text(order.getDiaChiGiaoHang()) == null) return "TAI_CUA_HANG";
    if ("TIEN_MAT".equals(order.getPhuongThucThanhToan())) return "COD";
    if ("CHUYEN_KHOAN".equals(order.getPhuongThucThanhToan())) return "CHUYEN_KHOAN";
    return null;
  }

  private boolean orderKind(String kind) {
    if (!Set.of("ORDER", "NOTICE").contains(kind)) {
      throw invalid("Loại hàng chờ không hợp lệ.");
    }
    return "ORDER".equals(kind);
  }

  private long number(Object value) {
    return value == null ? 0 : ((Number) value).longValue();
  }

  private boolean yes(Object value) {
    return Boolean.TRUE.equals(value) || value instanceof Number number && number.intValue() != 0;
  }

  private LocalDateTime now() {
    return LocalDateTime.now(properties.zone());
  }

  private LocalDateTime local(Object value) {
    if (value instanceof Timestamp timestamp) return timestamp.toLocalDateTime();
    if (value instanceof LocalDateTime time) return time;
    if (value instanceof OffsetDateTime time) {
      return time.atZoneSameInstant(properties.zone()).toLocalDateTime();
    }
    return null;
  }

  private Timestamp stamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime earlier(LocalDateTime first, LocalDateTime second) {
    if (first == null) return second;
    if (second == null) return first;
    return first.isBefore(second) ? first : second;
  }

  private Object safe(Object value) {
    if (value instanceof Timestamp || value instanceof LocalDateTime) {
      return local(value).atZone(properties.zone()).toOffsetDateTime();
    }
    if (value instanceof Map<?, ?> map) {
      Map<String, Object> result = new LinkedHashMap<>();
      map.forEach((key, item) -> result.put(String.valueOf(key), safe(item)));
      return result;
    }
    if (value instanceof Collection<?> collection) {
      return collection.stream().map(this::safe).toList();
    }
    return value;
  }
}
