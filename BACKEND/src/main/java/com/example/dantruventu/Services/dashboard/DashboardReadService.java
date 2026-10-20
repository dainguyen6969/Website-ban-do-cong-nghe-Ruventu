package com.example.dantruventu.Services.dashboard;

import com.example.dantruventu.Entity.HoaDonBaoHanh;
import com.example.dantruventu.Entity.LichSuBaoHanh;
import com.example.dantruventu.Entity.PhieuBaoHanh;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.dashboard.AdminDashboardRepository;
import com.example.dantruventu.Services.AdminDashboardService;
import com.example.dantruventu.Services.DashboardExcelExporter;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.order.ReturnMoneySnapshotService;
import com.example.dantruventu.Services.warranty.WarrantyFinanceCalculator;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class DashboardReadService {

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private static final BigDecimal ZERO = BigDecimal.ZERO;

  private static final String ELIGIBLE =
      """
            o.trang_thai_don_hang = 'HOAN_THANH'
            AND o.trang_thai_thanh_toan = 'DA_THANH_TOAN'
            AND o.trang_thai_xuat_kho IN (
              'DA_XUAT_KHO', 'DA_HOAN_KHO'
            )
            AND (:channel IS NULL OR o.loai_don_hang = :channel)
            """;

  private static final String PERIOD =
      ELIGIBLE
          + """
             AND o.ngay_tao >= :start
             AND o.ngay_tao < :end
             """;

  private static final List<String> WARRANTY_STATUSES =
      List.of(
          "TIEP_NHAN",
          "DANG_KIEM_TRA",
          "DA_GUI_BAO_HANH",
          "DANG_BAO_HANH",
          "DA_NHAN_LAI",
          "CHO_DOI_SAN_PHAM",
          "CHO_TRA_KHACH",
          "HOAN_TAT");

  private static final List<String> RETURN_STATUSES =
      List.of("CHO_TIEP_NHAN", "DA_NHAN_HANG", "HOAN_TAT", "CHO_TRA_KHACH", "HUY", "TU_CHOI");

  private static final List<String> SOURCE_BUSINESSES =
      List.of(
          "THU_KHACH_BAO_HANH",
          "HOAN_KHACH_BAO_HANH",
          "CHI_DON_VI_BAO_HANH",
          "THU_HOAN_DON_VI_BAO_HANH",
          "HOAN_TIEN_TRA_HANG");

  private final NamedParameterJdbcTemplate jdbc;
  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;
  private final AdminDashboardRepository repository;
  private final AdminDashboardService legacy;
  private final DashboardExcelExporter excelExporter;
  private final ReturnMoneySnapshotService returnSnapshots;

  @Value("${ruventu.inventory.warehouse-id:0}")
  private long configuredWarehouseId;

  public record ExportResult(byte[] content, String filename) {}

  private record Scope(String period, LocalDate from, LocalDate to, String channel) {

    Scope previous() {
      long days = ChronoUnit.DAYS.between(from, to) + 1;

      return new Scope("TUY_CHINH", from.minusDays(days), from.minusDays(1), channel);
    }
  }

  private static final class Context {
    final OffsetDateTime at = OffsetDateTime.now(ZONE);

    final Map<String, Sales> sales = new HashMap<>();

    final Map<String, Map<String, Object>> afterSales = new HashMap<>();
  }

  private record Sale(
      Map<String, Object> info,
      Long quantity,
      Boolean gift,
      Long returnedQuantity,
      BigDecimal gross,
      BigDecimal discount,
      BigDecimal returnedMoney,
      BigDecimal net,
      BigDecimal cost) {

    long orderId() {
      return requiredLong(info.get("order_id"));
    }

    Long variantId() {
      return optionalLong(info.get("variant_id"));
    }

    Long customerId() {
      return optionalLong(info.get("customer_id"));
    }

    LocalDate date() {
      return time(info.get("order_date")).toLocalDate();
    }

    String channel() {
      return Objects.toString(info.get("channel"), "");
    }
  }

  private record Sales(List<Sale> rows, Quality quality) {}

  private static final class Total {
    final Set<Long> orders = new HashSet<>();

    Long quantity = 0L;
    Long returnedQuantity = 0L;
    Long gifts = 0L;

    BigDecimal gross = ZERO;
    BigDecimal discount = ZERO;
    BigDecimal returnedMoney = ZERO;
    BigDecimal net = ZERO;
    BigDecimal cost = ZERO;

    Total(List<Sale> rows) {
      for (Sale row : rows) {
        orders.add(row.orderId());

        Long purchased = row.gift() == null ? null : row.gift() ? 0L : row.quantity();

        Long returned = row.gift() == null ? null : row.gift() ? 0L : row.returnedQuantity();

        Long deliveredGifts = row.gift() == null ? null : row.gift() ? row.quantity() : 0L;

        quantity = add(quantity, purchased);
        returnedQuantity = add(returnedQuantity, returned);
        gifts = add(gifts, deliveredGifts);

        gross = add(gross, row.gross());
        discount = add(discount, row.discount());

        returnedMoney = add(returnedMoney, row.returnedMoney());

        net = add(net, row.net());
        cost = add(cost, row.cost());
      }
    }

    BigDecimal profit() {
      return subtract(net, cost);
    }
  }

  private static final class Quality {
    final Set<Long> orders = new HashSet<>();

    final Set<Long> returns = new HashSet<>();

    final Map<String, String> warnings = new LinkedHashMap<>();

    void warning(String code, String message) {
      warnings.putIfAbsent(code, message);
    }

    void missingOrder(long id) {
      orders.add(id);

      warning(
          "LEGACY_LINE_SNAPSHOT_MISSING",
          "Một số đơn thiếu tiền dòng đã chốt; chỉ số phụ thuộc chưa đủ căn cứ");
    }

    void missingReturn(long id) {
      returns.add(id);

      warning(
          "RETURN_PRETAX_SNAPSHOT_MISSING",
          "Một số phiếu trả thiếu phân bổ tiền trước VAT hoặc còn trạng thái cũ cần xác minh");
    }

    void merge(Quality other) {
      orders.addAll(other.orders);
      returns.addAll(other.returns);
      other.warnings.forEach(warnings::putIfAbsent);
    }

    Map<String, Object> view() {
      return m(
          "trang_thai",
          warnings.isEmpty() ? "DAY_DU" : "THIEU_LICH_SU",
          "so_don_thieu_snapshot_tien_dong",
          orders.size(),
          "so_phieu_tra_thieu_phan_bo_truoc_vat",
          returns.size(),
          "canh_bao",
          warnings.entrySet().stream()
              .map(
                  entry ->
                      m(
                          "code", entry.getKey(),
                          "message", entry.getValue()))
              .toList());
    }
  }

  public Map<String, Object> read(String endpoint, Map<String, String> params) {

    return protect(() -> dispatch(new Context(), endpoint, params));
  }

  public ExportResult export(Map<String, String> params) {

    return protect(
        () -> {
          validateKeys("export", params);

          Context context = new Context();
          Scope filter = scope(params, "HOM_NAY", context);

          String grouping = grouping(params, filter);

          String ranking =
              choice(
                  params.get("xep_hang_theo"),
                  "SO_LUONG_BAN",
                  Set.of("SO_LUONG_BAN", "DOANH_THU_THUAN"),
                  "xep_hang_theo");

          String limit = String.valueOf(limit(params));

          int days =
              integer(params.getOrDefault("so_ngay_khong_ban", "30"), 1, 3650, "so_ngay_khong_ban");

          Map<String, String> period = new LinkedHashMap<>();

          period.put("ky", "TUY_CHINH");
          period.put("tu_ngay", filter.from().toString());
          period.put("den_ngay", filter.to().toString());
          period.put("kenh_ban", channelLabel(filter.channel()));

          Map<String, String> chartParams = new LinkedHashMap<>(period);

          chartParams.put("nhom_theo", grouping);

          Map<String, String> productParams = new LinkedHashMap<>(period);

          productParams.put("xep_hang_theo", ranking);
          productParams.put("limit", limit);

          Map<String, String> taskParams =
              Map.of("kenh_ban", channelLabel(filter.channel()), "limit", limit);

          Map<String, Object> sheets = new LinkedHashMap<>();

          sheets.put("Tổng quan", dispatch(context, "summary", period));

          sheets.put("Việc cần xử lý", dispatch(context, "tasks", taskParams));

          sheets.put("Kinh doanh", dispatch(context, "business-chart", chartParams));

          sheets.put(
              "Sản phẩm",
              m(
                  "ban_chay",
                  dispatch(context, "top-products", productParams),
                  "ton_lau",
                  stamped(
                      context, dto(legacy.getSlowMovingProducts(String.valueOf(days), limit)))));

          sheets.put("Tồn kho", dispatch(context, "inventory", Map.of("limit", limit)));

          sheets.put("Nhập hàng", stamped(context, dto(legacy.getPurchases())));

          sheets.put("Khách hàng", dispatch(context, "customers", period));

          sheets.put("Sổ quỹ", dispatch(context, "cashflow", chartParams));

          sheets.put(
              "Bảo hành và trả hàng",
              dispatch(context, "after-sales", Map.of("kenh_ban", channelLabel(filter.channel()))));

          sheets.put("Khuyến mại", dispatch(context, "promotions", period));

          byte[] content = excelExporter.exportSnapshot(sheets);

          return new ExportResult(
              content, "Ruventu_TongQuat_" + filter.from() + "_" + filter.to() + ".xlsx");
        });
  }

  private Map<String, Object> dispatch(
      Context context, String endpoint, Map<String, String> params) {

    validateKeys(endpoint, params);

    Scope filter = scope(params, "promotions".equals(endpoint) ? "THANG_NAY" : "HOM_NAY", context);

    Map<String, Object> result =
        switch (endpoint) {
          case "summary" -> summary(context, filter);

          case "business-chart" -> chart(context, filter, grouping(params, filter));

          case "top-products" ->
              products(
                  context,
                  filter,
                  choice(
                      params.get("xep_hang_theo"),
                      "SO_LUONG_BAN",
                      Set.of("SO_LUONG_BAN", "DOANH_THU_THUAN"),
                      "xep_hang_theo"),
                  limit(params));

          case "customers" -> customers(context, filter);

          case "tasks" -> tasks(context, filter.channel(), limit(params));

          case "inventory" -> inventory(context, limit(params));

          case "cashflow" -> cashflow(context, filter, grouping(params, filter));

          case "after-sales" -> afterSales(context, filter.channel());

          case "promotions" -> promotions(context, filter);

          default -> throw invalid("endpoint", "API Dashboard không hợp lệ");
        };

    return stamped(context, result);
  }

  private Map<String, Object> summary(Context context, Scope filter) {

    Sales current = sales(context, filter);
    Sales previous = sales(context, filter.previous());

    Total now = new Total(current.rows());
    Total before = new Total(previous.rows());

    Quality quality = new Quality();
    quality.merge(current.quality());
    quality.merge(previous.quality());

    BigDecimal receipt = receipts(cashRows(filter));

    BigDecimal previousReceipt = receipts(cashRows(filter.previous()));

    List<Map<String, Object>> channels = new ArrayList<>();

    for (String channel : current.rows().stream().map(Sale::channel).distinct().sorted().toList()) {

      Total total =
          new Total(current.rows().stream().filter(row -> channel.equals(row.channel())).toList());

      channels.add(
          m(
              "kenh_ban",
              channel,
              "doanh_thu_thuan",
              total.net,
              "so_don",
              total.orders.size(),
              "ty_trong_doanh_thu",
              percent(total.net, now.net)));
    }

    return salesMetadata(
        m(
            "bo_loc",
            filterView(filter, context),
            "ky_truoc",
            m(
                "tu_ngay", filter.previous().from(),
                "den_ngay", filter.previous().to()),
            "kpi",
            m(
                "doanh_thu_thuan",
                metric(now.net, before.net, null),
                "so_don",
                metric(now.orders.size(), before.orders.size(), null),
                "so_luong_ban",
                metric(now.quantity, before.quantity, null),
                "thuc_thu",
                metric(receipt, previousReceipt, "TOAN_CUA_HANG")),
            "kinh_doanh",
            m(
                "doanh_thu_ban_hang",
                now.gross,
                "tong_giam_gia",
                now.discount,
                "gia_tri_hang_tra",
                now.returnedMoney,
                "gia_tri_trung_binh_don",
                now.orders.isEmpty()
                    ? ZERO
                    : divide(now.net, BigDecimal.valueOf(now.orders.size())),
                "gia_von_uoc_tinh",
                now.cost,
                "loi_nhuan_gop_uoc_tinh",
                now.profit(),
                "so_luong_da_nhan_tra",
                now.returnedQuantity,
                "so_luong_qua_da_giao",
                now.gifts),
            "co_cau_kenh",
            channels,
            "hien_tai",
            m(
                "so_du_quy",
                balance(context),
                "nhan_vien_dang_hoat_dong",
                repository.countActiveEmployees())),
        quality);
  }

  private Map<String, Object> chart(Context context, Scope filter, String grouping) {

    Sales current = sales(context, filter);
    Sales previous = sales(context, filter.previous());

    Quality quality = new Quality();
    quality.merge(current.quality());
    quality.merge(previous.quality());

    return salesMetadata(
        m(
            "nhom_theo",
            grouping,
            "ky_hien_tai",
            points(current, filter, grouping),
            "ky_truoc",
            points(previous, filter.previous(), grouping)),
        quality);
  }

  private List<Map<String, Object>> points(Sales source, Scope filter, String grouping) {

    List<Map<String, Object>> result = new ArrayList<>();

    LocalDate cursor = filter.from();

    while (!cursor.isAfter(filter.to())) {
      LocalDate from = cursor;

      LocalDate to =
          "THANG".equals(grouping) ? cursor.with(TemporalAdjusters.lastDayOfMonth()) : cursor;

      if (to.isAfter(filter.to())) {
        to = filter.to();
      }

      LocalDate end = to;

      Total total =
          new Total(
              source.rows().stream()
                  .filter(row -> !row.date().isBefore(from) && !row.date().isAfter(end))
                  .toList());

      result.add(
          m(
              "tu_ngay",
              from,
              "den_ngay",
              to,
              "doanh_thu_thuan",
              total.net,
              "so_don",
              total.orders.size(),
              "so_luong_ban",
              total.quantity,
              "loi_nhuan_gop_uoc_tinh",
              total.profit(),
              "so_luong_da_nhan_tra",
              total.returnedQuantity,
              "so_luong_qua_da_giao",
              total.gifts));

      cursor = to.plusDays(1);
    }

    return result;
  }

  private Map<String, Object> products(Context context, Scope filter, String ranking, int limit) {

    Sales source = sales(context, filter);

    Map<Long, List<Sale>> grouped =
        source.rows().stream()
            .filter(row -> row.variantId() != null)
            .collect(Collectors.groupingBy(Sale::variantId));

    grouped
        .entrySet()
        .removeIf(
            entry -> entry.getValue().stream().allMatch(row -> Boolean.TRUE.equals(row.gift())));

    Map<Long, Total> totals = new HashMap<>();

    grouped.forEach((id, rows) -> totals.put(id, new Total(rows)));

    boolean quantityRanking = "SO_LUONG_BAN".equals(ranking);

    boolean rankKnown =
        totals.values().stream()
            .allMatch(total -> quantityRanking ? total.quantity != null : total.net != null);

    List<Long> ids = new ArrayList<>(totals.keySet());

    Comparator<Long> comparator = Comparator.naturalOrder();

    if (rankKnown) {
      comparator =
          quantityRanking
              ? Comparator.comparing((Long id) -> totals.get(id).quantity)
                  .reversed()
                  .thenComparing(Comparator.naturalOrder())
              : Comparator.comparing((Long id) -> totals.get(id).net)
                  .reversed()
                  .thenComparing(Comparator.naturalOrder());
    }

    ids.sort(comparator);

    Quality quality = new Quality();
    quality.merge(source.quality());

    if (!rankKnown) {
      quality.warning(
          "RANKING_UNVERIFIED", "Chưa đủ căn cứ xếp hạng; danh sách tạm sắp theo mã phiên bản");
    }

    Long warehouseId = warehouse();

    var stocks =
        repository.findInventoryRows(warehouseId).stream()
            .collect(
                Collectors.toMap(AdminDashboardRepository.InventoryRow::variantId, row -> row));

    var capacities = repository.findComboCapacities(warehouseId);

    Map<Long, Long> held = heldQuantities(warehouseId);

    List<Map<String, Object>> items = new ArrayList<>();

    for (int index = 0; index < Math.min(limit, ids.size()); index++) {

      Long id = ids.get(index);
      Sale row = grouped.get(id).get(0);
      Total total = totals.get(id);

      Map<String, Object> info = row.info();

      boolean combo = "BO_PC".equals(info.get("product_type"));

      var stock = stocks.get(id);

      long available = stock == null ? 0 : stock.availableStock();

      Long buildable =
          combo ? capacities.getOrDefault(optionalLong(info.get("product_id")), 0L) : null;

      String alert =
          combo
              ? buildable == 0 ? "HET_HANG" : "BINH_THUONG"
              : available <= 0
                  ? "HET_HANG"
                  : stock != null
                          && stock.minimumStock() != null
                          && available < stock.minimumStock()
                      ? "DUOI_TOI_THIEU"
                      : "BINH_THUONG";

      items.add(
          m(
              "hang",
              rankKnown ? index + 1 : null,
              "san_pham_id",
              info.get("product_id"),
              "phien_ban_id",
              id,
              "ten_san_pham",
              info.get("product_name"),
              "ten_phien_ban",
              info.get("variant_name"),
              "ma_vach",
              info.get("barcode"),
              "loai_san_pham",
              info.get("product_type"),
              "so_luong_ban",
              total.quantity,
              "so_luong_da_nhan_tra",
              total.returnedQuantity,
              "so_luong_qua_da_giao",
              total.gifts,
              "doanh_thu_thuan",
              total.net,
              "ton_thuc_te",
              combo ? null : stock == null ? 0L : stock.physicalStock(),
              "ton_co_the_ban",
              combo ? null : available,
              "so_bo_co_the_lap",
              buildable,
              "so_luong_giu_cho_bao_hanh",
              combo ? null : held.getOrDefault(id, 0L),
              "canh_bao",
              alert));
    }

    return salesMetadata(
        m(
            "xep_hang_theo", ranking,
            "xep_hang_day_du", rankKnown,
            "tong_so", ids.size(),
            "items", items),
        quality);
  }

  private Map<String, Object> customers(Context context, Scope filter) {

    Sales source = sales(context, filter);

    Map<Long, List<Sale>> customers =
        source.rows().stream()
            .filter(row -> row.customerId() != null)
            .collect(Collectors.groupingBy(Sale::customerId));

    Map<Long, Total> totals = new HashMap<>();

    customers.forEach((id, rows) -> totals.put(id, new Total(rows)));

    var history =
        jdbc.queryForList(
            """
                        SELECT o.khach_hang_id AS customer_id,
                               COUNT(*) AS total
                        FROM don_hang o
                        WHERE
                        """
                + ELIGIBLE
                + """
                 AND o.khach_hang_id IS NOT NULL
                 AND o.ngay_tao < :end
                 GROUP BY o.khach_hang_id
                 """,
            parameters(filter));

    Map<Long, Long> historicalCounts = new HashMap<>();

    history.forEach(
        row ->
            historicalCounts.put(
                requiredLong(row.get("customer_id")), requiredLong(row.get("total"))));

    long repeat =
        customers.keySet().stream()
            .filter(id -> historicalCounts.getOrDefault(id, 0L) >= 2)
            .count();

    long guestOrders =
        source.rows().stream()
            .filter(row -> row.customerId() == null)
            .map(Sale::orderId)
            .distinct()
            .count();

    Map<String, Object> valuable = null;

    boolean canRank = totals.values().stream().allMatch(total -> total.net != null);

    if (canRank && !totals.isEmpty()) {
      Long id =
          totals.keySet().stream()
              .sorted(
                  Comparator.comparing((Long key) -> totals.get(key).net)
                      .reversed()
                      .thenComparing(Comparator.naturalOrder()))
              .findFirst()
              .orElseThrow();

      valuable =
          m(
              "khach_hang_id",
              id,
              "ho_ten",
              customers.get(id).get(0).info().get("customer_name"),
              "so_don",
              totals.get(id).orders.size(),
              "gia_tri_mua_thuan",
              totals.get(id).net);
    }

    return salesMetadata(
        m(
            "tong_khach_hang_hien_tai",
            repository.countCustomers(),
            "khach_moi_trong_ky",
            repository.countNewCustomers(
                filter.from().atStartOfDay(), filter.to().plusDays(1).atStartOfDay()),
            "pham_vi_khach_moi",
            "TOAN_CUA_HANG",
            "khach_co_mua_trong_ky",
            customers.size(),
            "khach_quay_lai",
            repeat,
            "so_don_khach_le",
            guestOrders,
            "khach_gia_tri_cao_nhat",
            valuable),
        source.quality());
  }

  private Map<String, Object> tasks(Context context, String channel, int limit) {

    Map<String, Object> result = dto(legacy.getTasks(channelLabel(channel), String.valueOf(limit)));

    Map<String, Object> after = afterSales(context, channel);

    Map<String, Object> returns = object(after.get("tra_hang"));

    Map<String, Object> warranty = object(after.get("bao_hanh"));

    Map<String, Object> finance = object(after.get("tai_chinh_bao_hanh"));

    long unfinished =
        WARRANTY_STATUSES.stream()
            .filter(state -> !"HOAN_TAT".equals(state))
            .mapToLong(state -> requiredLong(warranty.get(state)))
            .sum();

    result.put(
        "tra_hang",
        m(
            "cho_tiep_nhan",
            returns.get("CHO_TIEP_NHAN"),
            "cho_tra_khach",
            returns.get("CHO_TRA_KHACH"),
            "cho_hoan_tien",
            returns.get("cho_hoan_tien"),
            "tong_phieu_can_xu_ly",
            returns.get("tong_phieu_can_xu_ly")));

    result.put(
        "bao_hanh",
        m(
            "tong_phieu_chua_hoan_tat",
            unfinished,
            "cho_doi_san_pham",
            warranty.get("CHO_DOI_SAN_PHAM"),
            "cho_tra_khach",
            warranty.get("CHO_TRA_KHACH"),
            "bao_gia_cho_phan_hoi",
            finance.get("bao_gia_cho_phan_hoi"),
            "hoa_don_con_phai_thu",
            finance.get("hoa_don_con_phai_thu"),
            "phieu_con_phai_hoan_tien",
            finance.get("phieu_con_phai_hoan"),
            "phieu_con_nghia_vu_ncc",
            finance.get("phieu_con_nghia_vu_ncc")));

    result.put("chat_luong_du_lieu", after.get("chat_luong_du_lieu"));

    return result;
  }

  private Map<String, Object> inventory(Context context, int limit) {

    Long warehouseId = warehouse();

    Map<String, Object> result = dto(legacy.getInventory(String.valueOf(limit)));

    Map<Long, Long> held = heldQuantities(warehouseId);

    long damaged =
        requiredLong(
            jdbc.queryForObject(
                """
                                SELECT COALESCE(SUM(s.hang_loi), 0)
                                FROM ton_kho s
                                JOIN phien_ban_san_pham v
                                  ON v.id = s.phien_ban_id
                                JOIN san_pham p
                                  ON p.id = v.san_pham_id
                                WHERE s.kho_hang_id = :warehouse
                                  AND p.loai_san_pham = 'DON'
                                """,
                Map.of("warehouse", warehouseId),
                Long.class));

    result.put("tong_hang_loi", damaged);

    result.put(
        "tong_so_luong_giu_cho_bao_hanh", held.values().stream().mapToLong(Long::longValue).sum());

    var warnings = object(result.get("canh_bao"));

    for (Object raw : list(warnings.get("items"))) {

      Map<String, Object> item = object(raw);

      Long id = optionalLong(item.get("phien_ban_id"));

      item.put("so_luong_giu_cho_bao_hanh", held.getOrDefault(id, 0L));
    }

    Quality quality = new Quality();

    long unknownMinimum =
        repository.findInventoryRows(warehouseId).stream()
            .filter(row -> row.activeProduct() && row.activeVariant() && row.minimumStock() == null)
            .count();

    result.put("so_sku_chua_co_muc_toi_thieu", unknownMinimum);

    if (unknownMinimum > 0) {
      result.put("so_sku_duoi_toi_thieu", null);

      quality.warning(
          "MINIMUM_STOCK_UNSET",
          "Một số phiên bản chưa có mức tồn tối thiểu; chưa xác định được đầy đủ nhóm dưới tối thiểu");
    }

    result.put("chat_luong_du_lieu", quality.view());

    // ton_co_the_ban đã được nghiệp vụ cập nhật.
    // Báo cáo không trừ giữ bảo hành thêm lần nữa.
    return result;
  }

  private Map<String, Object> cashflow(Context context, Scope filter, String grouping) {

    Map<String, Object> result =
        dto(
            legacy.getCashflow(
                "TUY_CHINH",
                filter.from().toString(),
                filter.to().toString(),
                channelLabel(filter.channel()),
                grouping));

    List<SoQuyThuChi> cash = cashRows(filter);

    Quality quality = new Quality();

    Map<String, Object> breakdown = new LinkedHashMap<>();

    SOURCE_BUSINESSES.forEach(business -> breakdown.put(business.toLowerCase(Locale.ROOT), ZERO));

    boolean known = true;

    for (var voucher : cash) {
      String source = CashbookService.sourceBusiness(voucher);

      if (source != null) {
        String key = source.toLowerCase(Locale.ROOT);

        breakdown.put(key, decimal(breakdown.get(key)).add(voucher.getSoTien()));

      } else if (voucher.getHoaDonBaoHanh() != null
          || voucher.getPhieuBaoHanh() != null
          || voucher.getPhieuTraHang() != null) {

        known = false;
      }
    }

    if (!known) {
      breakdown.replaceAll((key, value) -> null);

      quality.warning(
          "CASH_SOURCE_LINK_UNVERIFIED",
          "Một số phiếu tiền có liên kết nguồn không đủ hoặc mâu thuẫn để phân loại hậu mãi");
    }

    object(result.get("trong_ky")).put("phan_tich_bao_hanh_tra_hang", breakdown);

    result.put("so_du_quy_hien_tai", balance(context));

    result.put("nhom_theo", grouping);

    result.put("moc_thoi_gian_so_quy", "NGAY_GHI_NHAN");

    result.put("chat_luong_du_lieu", quality.view());

    return result;
  }

  private Map<String, Object> afterSales(Context context, String channel) {

    String cacheKey = channelLabel(channel);

    if (context.afterSales.containsKey(cacheKey)) {
      return context.afterSales.get(cacheKey);
    }

    Quality quality = new Quality();

    Map<String, Object> warrantyCounts = counters(WARRANTY_STATUSES);

    String channelPredicate = channel == null ? "" : " where o.loaiDonHang = :channel";

    var ticketQuery =
        entityManager.createQuery(
            """
                        select p
                        from PhieuBaoHanh p
                        join fetch p.donHang o
                        """
                + channelPredicate,
            PhieuBaoHanh.class);

    if (channel != null) {
      ticketQuery.setParameter("channel", LoaiDonHang.valueOf(channel));
    }

    List<PhieuBaoHanh> tickets = ticketQuery.getResultList();

    tickets.forEach(ticket -> increment(warrantyCounts, ticket.getTrangThaiXuLy().name()));

    long quotes = 0;
    long unpaidInvoices = 0;
    BigDecimal due = ZERO;
    BigDecimal refundDue = ZERO;

    Set<Long> refundTickets = new HashSet<>();

    Set<Long> supplierTickets = new HashSet<>();

    boolean quoteKnown = true;
    boolean moneyKnown = true;
    boolean supplierKnown = true;

    if (!tickets.isEmpty()) {
      List<Long> ids = tickets.stream().map(PhieuBaoHanh::getId).toList();

      List<HoaDonBaoHanh> invoices =
          entityManager
              .createQuery(
                  """
                                    select i
                                    from HoaDonBaoHanh i
                                    join fetch i.phieuBaoHanh p
                                    where p.id in :ids
                                    """,
                  HoaDonBaoHanh.class)
              .setParameter("ids", ids)
              .getResultList();

      List<LichSuBaoHanh> events =
          entityManager
              .createQuery(
                  """
                                    select e
                                    from LichSuBaoHanh e
                                    where e.phieuBaoHanh.id in :ids
                                    order by e.ngayTao, e.id
                                    """,
                  LichSuBaoHanh.class)
              .setParameter("ids", ids)
              .getResultList();

      List<SoQuyThuChi> vouchers =
          entityManager
              .createQuery(
                  """
                                    select distinct c
                                    from SoQuyThuChi c
                                    left join fetch c.hoaDonBaoHanh i
                                    left join fetch i.phieuBaoHanh pi
                                    left join fetch c.phieuBaoHanh pt
                                    where c.trangThai = :status
                                      and (pi.id in :ids or pt.id in :ids)
                                    """,
                  SoQuyThuChi.class)
              .setParameter("status", TrangThaiPhieuThuChi.DA_GHI_NHAN)
              .setParameter("ids", ids)
              .getResultList();

      var invoicesByTicket =
          invoices.stream()
              .collect(Collectors.groupingBy(invoice -> invoice.getPhieuBaoHanh().getId()));

      var eventsByTicket =
          events.stream().collect(Collectors.groupingBy(event -> event.getPhieuBaoHanh().getId()));

      Map<Long, List<SoQuyThuChi>> cashByTicket = new HashMap<>();

      for (var voucher : vouchers) {
        validateCash(voucher);

        Long invoiceTicket =
            voucher.getHoaDonBaoHanh() == null
                ? null
                : voucher.getHoaDonBaoHanh().getPhieuBaoHanh().getId();

        Long directTicket =
            voucher.getPhieuBaoHanh() == null ? null : voucher.getPhieuBaoHanh().getId();

        if (invoiceTicket != null && directTicket != null && !invoiceTicket.equals(directTicket)) {
          throw new IllegalStateException("Warranty voucher link conflict");
        }

        Long ticketId = invoiceTicket != null ? invoiceTicket : directTicket;

        cashByTicket.computeIfAbsent(ticketId, ignored -> new ArrayList<>()).add(voucher);
      }

      for (var ticket : tickets) {
        var ticketEvents = eventsByTicket.getOrDefault(ticket.getId(), List.of());

        var ticketInvoices = invoicesByTicket.getOrDefault(ticket.getId(), List.of());

        var ticketCash = cashByTicket.getOrDefault(ticket.getId(), List.of());

        boolean hasIntake = false;
        boolean completeMetadata = !ticketEvents.isEmpty();

        boolean wasAtSupplier = false;
        Map<String, Object> latestQuote = null;

        Map<Long, Map<String, Object>> obligations = new LinkedHashMap<>();

        for (var event : ticketEvents) {
          Map<String, Object> payload = json(event.getDuLieuChiTiet());

          if (payload == null) {
            completeMetadata = false;
            continue;
          }

          if (payload.get("tiep_nhan") instanceof Map<?, ?>
              && payload.get("thiet_bi") instanceof Map<?, ?>) {
            hasIntake = true;
          }

          if (payload.get("bao_gia") instanceof Map<?, ?>) {
            latestQuote = object(payload.get("bao_gia"));
          }

          for (String locationKey : List.of("noi_dang_giu", "noi_dang_giu_thiet_bi_cu")) {

            Object location = payload.get(locationKey);

            if (location instanceof Map<?, ?>
                && "DON_VI_BAO_HANH".equals(object(location).get("loai"))) {
              wasAtSupplier = true;
            }
          }

          if (payload.containsKey("doi_soat_nha_cung_cap")) {

            Object raw = payload.get("doi_soat_nha_cung_cap");

            if (!(raw instanceof Map<?, ?>)) {
              supplierKnown = false;
              continue;
            }

            Map<String, Object> obligation = object(raw);

            Long obligationId = optionalLong(obligation.get("nghia_vu_lich_su_id"));

            if (obligationId == null) {
              supplierKnown = false;
            } else {
              Map<String, Object> merged =
                  new LinkedHashMap<>(obligations.getOrDefault(obligationId, Map.of()));

              merged.putAll(obligation);
              obligations.put(obligationId, merged);
            }
          }
        }

        boolean modern = hasIntake && completeMetadata;

        String quoteState =
            ticket.getTrangThaiBaoGia() == null ? null : ticket.getTrangThaiBaoGia().name();

        if (quoteState == null && latestQuote != null) {
          Long version = optionalLong(latestQuote.get("phien_ban"));

          if (version != null && version.equals(Long.valueOf(ticket.getPhienBanBaoGia()))) {
            quoteState = Objects.toString(latestQuote.get("trang_thai"), null);
          }
        }

        if ("CHO_PHAN_HOI".equals(quoteState)) {
          quotes++;
        } else if (quoteState == null && !modern) {
          quoteKnown = false;
        }

        if (!modern) {
          moneyKnown = false;
          supplierKnown = false;
        }

        long activeInvoices =
            ticketInvoices.stream()
                .filter(invoice -> invoice.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC)
                .count();

        if (activeInvoices > 1) {
          throw new IllegalStateException("Multiple active warranty invoices");
        }

        BigDecimal ticketRefund = ZERO;

        for (var invoice : ticketInvoices) {
          com.example.dantruventu.DTO.Response.warranty.AdminWarrantyDetailResponse.Invoice
              financial;

          try {
            financial = WarrantyFinanceCalculator.invoice(invoice, ticketCash);
          } catch (AppException exception) {
            throw new IllegalStateException("Invalid warranty financial source", exception);
          }

          if (financial.conPhaiThu().signum() > 0) {
            unpaidInvoices++;
          }

          due = due.add(financial.conPhaiThu());

          ticketRefund = ticketRefund.add(financial.conPhaiHoan());
        }

        if (ticketRefund.signum() > 0) {
          refundTickets.add(ticket.getId());
        }

        refundDue = refundDue.add(ticketRefund);

        BigDecimal supplierPaid = ZERO;
        BigDecimal supplierRefunded = ZERO;

        for (var voucher : ticketCash) {
          if (voucher.getPhieuTraHang() != null) {
            throw new IllegalStateException("Mixed warranty and return voucher");
          }

          if (voucher.getHoaDonBaoHanh() != null) {
            if (voucher.getNhomNguoiNopNhan() != NhomNguoiNopNhanEnum.KHACH_HANG) {
              moneyKnown = false;
            }

            continue;
          }

          if (voucher.getNhomNguoiNopNhan() != NhomNguoiNopNhanEnum.NHA_CUNG_CAP
              || voucher.getNhaCungCap() == null) {

            moneyKnown = false;
            supplierKnown = false;
            continue;
          }

          if (voucher.getLoaiPhieu() == LoaiPhieuThuChi.CHI) {
            supplierPaid = supplierPaid.add(voucher.getSoTien());
          } else {
            supplierRefunded = supplierRefunded.add(voucher.getSoTien());
          }
        }

        if (supplierRefunded.compareTo(supplierPaid) > 0) {
          throw new IllegalStateException("Supplier refund exceeds payment");
        }

        boolean openSupplier = false;

        BigDecimal confirmed = ticket.getChiPhiNccXacNhan();

        if (confirmed != null) {
          if (confirmed.signum() < 0) {
            throw new IllegalStateException("Negative supplier cost");
          }

          BigDecimal netPaid = supplierPaid.subtract(supplierRefunded);

          openSupplier = confirmed.compareTo(netPaid) != 0;

        } else if (wasAtSupplier || supplierPaid.signum() > 0) {

          supplierKnown = false;
        }

        if (ticket.getKetQuaXuLy() == KetQuaXuLyBaoHanh.DOI_SAN_PHAM && obligations.isEmpty()) {
          supplierKnown = false;
        }

        for (var obligation : obligations.values()) {
          Long required = optionalLong(obligation.get("so_luong_can_bu"));

          Long supplied = optionalLong(obligation.get("so_luong_da_bu"));

          Long remaining = optionalLong(obligation.get("so_luong_con_bu"));

          BigDecimal remainingMoney = decimal(obligation.get("so_tien_con_doi_soat"));

          Boolean resolved = flag(obligation.get("da_giai_quyet"));

          if (required == null
              || supplied == null
              || remaining == null
              || required < 0
              || supplied < 0
              || remaining < 0
              || required - supplied != remaining
              || remainingMoney == null
              || remainingMoney.signum() < 0
              || resolved == null
              || (resolved && (remaining > 0 || remainingMoney.signum() > 0))) {

            supplierKnown = false;
            continue;
          }

          if (!resolved || remaining > 0 || remainingMoney.signum() > 0) {
            openSupplier = true;
          }
        }

        if (openSupplier) {
          supplierTickets.add(ticket.getId());
        }
      }
    }

    if (!quoteKnown || !moneyKnown || !supplierKnown) {
      quality.warning(
          "WARRANTY_EVENT_METADATA_MISSING",
          "Một số phiếu thiếu căn cứ báo giá, thu hoàn hoặc đối soát NCC; nhóm thiếu dữ liệu trả chưa xác định");
    }

    Map<String, Object> finance =
        m(
            "bao_gia_cho_phan_hoi",
            quoteKnown ? quotes : null,
            "hoa_don_con_phai_thu",
            moneyKnown ? unpaidInvoices : null,
            "tong_con_phai_thu",
            moneyKnown ? due : null,
            "phieu_con_phai_hoan",
            moneyKnown ? refundTickets.size() : null,
            "tong_con_phai_hoan",
            moneyKnown ? refundDue : null,
            "phieu_con_nghia_vu_ncc",
            supplierKnown ? supplierTickets.size() : null);

    Map<String, Object> returnCounts = counters(RETURN_STATUSES);

    List<Map<String, Object>> slips =
        jdbc.queryForList(
            """
                        SELECT r.id, r.trang_thai_tra_hang AS status,
                               r.tong_tien_hoan AS amount
                        FROM phieu_tra_hang r
                        JOIN don_hang o ON o.id = r.don_hang_id
                        WHERE :channel IS NULL
                           OR o.loai_don_hang = :channel
                        """,
            new MapSqlParameterSource().addValue("channel", channel, java.sql.Types.VARCHAR));

    long waitingRefund = 0;
    BigDecimal waitingAmount = ZERO;
    boolean returnMoneyKnown = true;

    Set<Long> actionable = new HashSet<>();

    long legacyReturns = 0;

    for (var slip : slips) {
      String status = Objects.toString(slip.get("status"), "");

      long id = requiredLong(slip.get("id"));

      if ("DA_HOAN_TIEN".equals(status)) {
        legacyReturns++;
        continue;
      }

      if (returnCounts.containsKey(status)) {
        increment(returnCounts, status);
      }

      if ("CHO_TIEP_NHAN".equals(status) || "CHO_TRA_KHACH".equals(status)) {
        actionable.add(id);
      }

      if ("DA_NHAN_HANG".equals(status)) {
        BigDecimal amount = decimal(slip.get("amount"));

        if (amount == null) {
          returnMoneyKnown = false;

        } else if (amount.signum() < 0) {
          throw new IllegalStateException("Negative return amount");

        } else if (amount.signum() > 0) {
          waitingRefund++;
          waitingAmount = waitingAmount.add(amount);

          actionable.add(id);

        } else {
          quality.warning(
              "ZERO_RETURN_NOT_CLOSED", "Có phiếu trả 0 đồng đã nhận nhưng chưa chuyển hoàn tất");
        }
      }
    }

    if (legacyReturns > 0) {
      quality.warning(
          "LEGACY_RETURN_STATUS",
          "Còn phiếu mang trạng thái DA_HOAN_TIEN cũ; chưa tự quy đổi sang trạng thái mới");
    }

    if (!returnMoneyKnown) {
      quality.warning(
          "RETURN_FINANCIAL_HISTORY_MISSING", "Thiếu số tiền hoàn của một số phiếu đã nhận");
    }

    returnCounts.put("cho_hoan_tien", returnMoneyKnown ? waitingRefund : null);

    returnCounts.put("gia_tri_cho_hoan_tien", returnMoneyKnown ? waitingAmount : null);

    returnCounts.put("tong_phieu_can_xu_ly", returnMoneyKnown ? actionable.size() : null);

    returnCounts.put("so_phieu_trang_thai_cu", legacyReturns);

    Map<String, Object> result =
        m(
            "pham_vi",
            "HIEN_TAI",
            "kenh_ban",
            channelLabel(channel),
            "bao_hanh",
            warrantyCounts,
            "tra_hang",
            returnCounts,
            "tai_chinh_bao_hanh",
            finance,
            "chat_luong_du_lieu",
            quality.view());

    context.afterSales.put(cacheKey, result);

    return result;
  }

  private Map<String, Object> promotions(Context context, Scope filter) {

    LocalDateTime now = context.at.toLocalDateTime();

    LocalDateTime threshold = now.plusDays(7);

    var programs =
        jdbc.queryForList(
            """
                        SELECT k.id, k.ngay_bat_dau AS starts_at,
                               k.ngay_ket_thuc AS ends_at,
                               k.trang_thai AS active,
                               k.so_luong_ap_dung AS quota,
                               k.so_luong_da_dung AS used,
                               COALESCE(h.held, 0) AS held
                        FROM khuyen_mai k
                        LEFT JOIN (
                          SELECT khuyen_mai_id,
                                 SUM(
                                   CASE WHEN trang_thai_ap_dung = 'GIU_CHO'
                                        THEN 1 ELSE 0 END
                                 ) AS held
                          FROM khuyen_mai_don_hang
                          GROUP BY khuyen_mai_id
                        ) h ON h.khuyen_mai_id = k.id
                        """,
            Map.of());

    long running = 0;
    long available = 0;
    long starting = 0;
    long ending = 0;
    long used = 0;

    for (var program : programs) {
      long programUsed = requiredLong(program.get("used"));

      long held = requiredLong(program.get("held"));

      used += programUsed;

      if (!Boolean.TRUE.equals(flag(program.get("active")))) {
        continue;
      }

      LocalDateTime starts = time(program.get("starts_at"));

      LocalDateTime ends = time(program.get("ends_at"));

      boolean inWindow = !now.isBefore(starts) && now.isBefore(ends);

      if (inWindow) {
        running++;

        Long quota = optionalLong(program.get("quota"));

        if (quota == null || programUsed + held < quota) {
          available++;
        }

        if (!ends.isAfter(threshold)) {
          ending++;
        }
      }

      if (starts.isAfter(now) && !starts.isAfter(threshold)) {
        starting++;
      }
    }

    Map<String, Long> usage = new HashMap<>();

    for (var row :
        jdbc.queryForList(
            """
                        SELECT trang_thai_ap_dung AS status,
                               COUNT(*) AS total
                        FROM khuyen_mai_don_hang
                        GROUP BY trang_thai_ap_dung
                        """,
            Map.of())) {

      usage.put(Objects.toString(row.get("status")), requiredLong(row.get("total")));
    }

    var applied =
        jdbc.queryForList(
            """
                        SELECT k.id, k.don_hang_id AS order_id,
                               k.so_tien_giam AS discount,
                               k.du_lieu_ap_dung AS snapshot
                        FROM khuyen_mai_don_hang k
                        JOIN don_hang o ON o.id = k.don_hang_id
                        WHERE k.ngay_tao >= :start
                          AND k.ngay_tao < :end
                          AND k.trang_thai_ap_dung = 'DA_SU_DUNG'
                          AND (:channel IS NULL
                               OR o.loai_don_hang = :channel)
                        ORDER BY k.id
                        """,
            parameters(filter));

    Quality quality = new Quality();

    BigDecimal discount = ZERO;
    Long gifts = 0L;
    Set<Long> orders = new HashSet<>();

    for (var row : applied) {
      if (!orders.add(requiredLong(row.get("order_id")))) {
        throw new IllegalStateException("Duplicate promotion order link");
      }

      Map<String, Object> snapshot = json(Objects.toString(row.get("snapshot"), null));

      BigDecimal saved = decimal(row.get("discount"));

      boolean complete =
          snapshot != null
              && optionalLong(snapshot.get("phien_ban_snapshot")) != null
              && snapshot.get("san_pham") instanceof List<?> lines
              && !lines.isEmpty();

      BigDecimal lineDiscount = ZERO;
      long lineGifts = 0;
      Set<String> keys = new HashSet<>();

      if (complete) {
        for (Object raw : list(snapshot.get("san_pham"))) {

          Map<String, Object> line = object(raw);

          String key = Objects.toString(line.get("ma_dong"), "");

          Long quantity = optionalLong(line.get("so_luong"));

          Boolean gift = flag(line.get("la_qua_tang"));

          BigDecimal amount = decimal(line.get("tien_chiet_khau"));

          if (key.isBlank()
              || !keys.add(key)
              || quantity == null
              || quantity <= 0
              || gift == null
              || amount == null
              || amount.signum() < 0) {
            complete = false;
            break;
          }

          lineDiscount = lineDiscount.add(amount);

          if (gift) {
            lineGifts += quantity;
          }
        }

        BigDecimal snapshotDiscount = decimal(snapshot.get("tien_chiet_khau"));

        complete =
            complete
                && saved != null
                && saved.signum() >= 0
                && snapshotDiscount != null
                && snapshotDiscount.compareTo(saved) == 0
                && lineDiscount.compareTo(saved) == 0;
      }

      if (!complete) {
        discount = null;
        gifts = null;

        quality.warning(
            "PROMOTION_APPLIED_SNAPSHOT_MISSING",
            "Một số đơn đã liên kết khuyến mại nhưng thiếu bản chụp tiền hoặc quà");

      } else {
        discount = add(discount, saved);
        gifts = add(gifts, lineGifts);
      }
    }

    return m(
        "pham_vi",
        "HIEN_TAI_VA_KY",
        "nguong_sap_den_ngay",
        7,
        "dang_trong_thoi_gian_ap_dung",
        running,
        "con_luot_ap_dung",
        available,
        "sap_bat_dau",
        starting,
        "sap_ket_thuc",
        ending,
        "tong_luot_da_dung_luy_ke",
        used,
        "tong_luot_dang_giu_hien_tai",
        usage.getOrDefault("GIU_CHO", 0L),
        "tong_luot_da_giai_phong_hien_tai",
        usage.getOrDefault("DA_GIAI_PHONG", 0L),
        "so_don_su_dung_trong_ky",
        orders.size(),
        "gia_tri_giam_theo_chuong_trinh_trong_ky",
        discount,
        "so_qua_da_giao_cua_don_chot_trong_ky",
        gifts,
        "bo_loc",
        filterView(filter, context),
        "moc_thoi_gian_thong_ke_ky",
        "NGAY_CHOT_UU_DAI",
        "pham_vi_so_lieu_ky",
        "CHI_DON_CO_KHUYEN_MAI_DON_HANG",
        "ly_do_chua_ho_tro",
        quality.warnings.isEmpty() ? null : "THIEU_SNAPSHOT_AP_DUNG_CUA_MOT_SO_DON",
        "chat_luong_du_lieu",
        quality.view());
  }

  private Sales sales(Context context, Scope filter) {

    String key = filter.from() + "|" + filter.to() + "|" + filter.channel();

    if (context.sales.containsKey(key)) {
      return context.sales.get(key);
    }

    var source =
        jdbc.queryForList(
            """
                        SELECT o.id AS order_id,
                               o.ngay_tao AS order_date,
                               o.loai_don_hang AS channel,
                               o.khach_hang_id AS customer_id,
                               u.ho_ten AS customer_name,
                               l.id AS line_id,
                               l.phien_ban_id AS variant_id,
                               v.san_pham_id AS product_id,
                               p.ten_san_pham AS product_name,
                               v.ten_phien_ban AS variant_name,
                               v.ma_vach AS barcode,
                               p.loai_san_pham AS product_type,
                               l.so_luong AS quantity,
                               l.la_qua_tang AS gift,
                               l.thanh_tien AS gross,
                               l.tien_chiet_khau AS discount,
                               l.thanh_toan_dong AS payable,
                               v.gia_nhap AS current_cost
                        FROM don_hang o
                        LEFT JOIN chi_tiet_don_hang l
                          ON l.don_hang_id = o.id
                        LEFT JOIN phien_ban_san_pham v
                          ON v.id = l.phien_ban_id
                        LEFT JOIN san_pham p
                          ON p.id = v.san_pham_id
                        LEFT JOIN nguoi_dung u
                          ON u.id = o.khach_hang_id
                        WHERE
                        """
                + PERIOD
                + " ORDER BY o.id, l.id",
            parameters(filter));

    var returned =
        jdbc.queryForList(
            """
                        SELECT r.id AS return_id,
                               r.don_hang_id AS return_order_id,
                               r.trang_thai_tra_hang AS status,
                               r.du_lieu_nhan_hang AS snapshot,
                               rl.chi_tiet_don_hang_id AS line_id,
                               rl.so_luong AS quantity,
                               rl.thanh_tien_hoan AS amount
                        FROM chi_tiet_tra_hang rl
                        JOIN phieu_tra_hang r
                          ON r.id = rl.phieu_tra_hang_id
                        JOIN chi_tiet_don_hang l
                          ON l.id = rl.chi_tiet_don_hang_id
                        JOIN don_hang o
                          ON o.id = l.don_hang_id
                        WHERE
                        """
                + PERIOD
                + """
                 AND r.trang_thai_tra_hang IN (
                   'DA_NHAN_HANG',
                   'HOAN_TAT',
                   'DA_HOAN_TIEN'
                 )
                 ORDER BY r.id, rl.id
                 """,
            parameters(filter));

    Map<Long, List<Map<String, Object>>> byLine = new HashMap<>();

    for (var row : returned) {
      byLine
          .computeIfAbsent(requiredLong(row.get("line_id")), ignored -> new ArrayList<>())
          .add(row);
    }

    Map<Long, Map<Long, ReturnMoneySnapshotService.Allocation>> returnCache = new HashMap<>();

    Quality quality = new Quality();
    List<Sale> result = new ArrayList<>();

    for (var row : source) {
      long orderId = requiredLong(row.get("order_id"));

      Long lineId = optionalLong(row.get("line_id"));

      Long quantity = optionalLong(row.get("quantity"));

      Boolean gift = flag(row.get("gift"));

      BigDecimal gross = decimal(row.get("gross"));

      BigDecimal discount = decimal(row.get("discount"));

      BigDecimal payable = decimal(row.get("payable"));

      boolean complete =
          lineId != null
              && quantity != null
              && quantity > 0
              && gift != null
              && gross != null
              && discount != null
              && payable != null;

      if (!complete) {
        quality.missingOrder(orderId);
      }

      if ((gross != null && gross.signum() < 0)
          || (discount != null && discount.signum() < 0)
          || (payable != null && payable.signum() < 0)
          || (gross != null && discount != null && discount.compareTo(gross) > 0)) {
        throw new IllegalStateException("Invalid saved sale money");
      }

      if (complete) {
        BigDecimal beforeVat = gross.subtract(discount);

        if (payable.compareTo(beforeVat) < 0
            || (gift && (gross.signum() != 0 || discount.signum() != 0 || payable.signum() != 0))) {
          throw new IllegalStateException("Invalid sale snapshot");
        }
      }

      long returnedQuantity = 0;
      BigDecimal returnAmount = ZERO;

      for (var returnedLine : byLine.getOrDefault(lineId, List.of())) {

        long returnId = requiredLong(returnedLine.get("return_id"));

        if (requiredLong(returnedLine.get("return_order_id")) != orderId) {
          throw new IllegalStateException("Return belongs to another order");
        }

        long count = requiredLong(returnedLine.get("quantity"));

        if (count <= 0) {
          throw new IllegalStateException("Invalid return quantity");
        }

        returnedQuantity += count;

        if (!returnCache.containsKey(returnId)) {
          try {
            returnCache.put(
                returnId,
                returnSnapshots.read(Objects.toString(returnedLine.get("snapshot"), null)));
          } catch (AppException exception) {
            returnCache.put(returnId, Map.of());
          }
        }

        var allocation = returnCache.get(returnId).get(lineId);

        BigDecimal savedAfterVat = decimal(returnedLine.get("amount"));

        boolean known =
            !"DA_HOAN_TIEN".equals(returnedLine.get("status"))
                && allocation != null
                && allocation.quantity().longValue() == count
                && savedAfterVat != null
                && allocation.afterVat().compareTo(savedAfterVat) == 0;

        if (!known) {
          returnAmount = null;
          quality.missingReturn(returnId);

        } else {
          returnAmount = add(returnAmount, allocation.beforeVat());
        }
      }

      if (quantity != null && returnedQuantity > quantity) {
        throw new IllegalStateException("Returned quantity exceeds purchase");
      }

      BigDecimal net =
          complete && returnAmount != null ? gross.subtract(discount).subtract(returnAmount) : null;

      if (net != null && net.signum() < 0) {
        throw new IllegalStateException("Returned pretax amount exceeds sale");
      }

      BigDecimal unitCost = decimal(row.get("current_cost"));

      BigDecimal cost = null;

      if (complete && returnAmount != null) {
        long retained = quantity - returnedQuantity;

        if (retained == 0) {
          cost = ZERO;

        } else if (unitCost != null && unitCost.signum() >= 0) {

          cost = unitCost.multiply(BigDecimal.valueOf(retained));

        } else {
          quality.warning("CURRENT_COST_MISSING", "Thiếu giá nhập hiện tại để ước tính giá vốn");
        }
      }

      result.add(
          new Sale(
              row, quantity, gift, returnedQuantity, gross, discount, returnAmount, net, cost));
    }

    Sales sales = new Sales(List.copyOf(result), quality);

    context.sales.put(key, sales);
    return sales;
  }

  private List<SoQuyThuChi> cashRows(Scope filter) {

    List<SoQuyThuChi> result =
        entityManager
            .createQuery(
                """
                                select c
                                from SoQuyThuChi c
                                where c.trangThai = :status
                                  and c.ngayGhiNhan >= :start
                                  and c.ngayGhiNhan < :end
                                order by c.ngayGhiNhan, c.id
                                """,
                SoQuyThuChi.class)
            .setParameter("status", TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .setParameter("start", filter.from().atStartOfDay())
            .setParameter("end", filter.to().plusDays(1).atStartOfDay())
            .getResultList();

    result.forEach(DashboardReadService::validateCash);

    return result;
  }

  private static void validateCash(SoQuyThuChi voucher) {

    if (voucher.getSoTien() == null
        || voucher.getSoTien().signum() <= 0
        || voucher.getLoaiPhieu() == null
        || voucher.getNgayGhiNhan() == null) {
      throw new IllegalStateException("Invalid posted cash voucher");
    }
  }

  private BigDecimal receipts(List<SoQuyThuChi> rows) {

    return rows.stream()
        .filter(row -> row.getLoaiPhieu() == LoaiPhieuThuChi.THU)
        .map(SoQuyThuChi::getSoTien)
        .reduce(ZERO, BigDecimal::add);
  }

  private BigDecimal balance(Context context) {

    return jdbc.queryForObject(
        """
                SELECT COALESCE(
                  SUM(
                    CASE
                      WHEN loai_phieu = 'THU' THEN so_tien
                      WHEN loai_phieu = 'CHI' THEN -so_tien
                      ELSE 0
                    END
                  ),
                  0
                )
                FROM so_quy_thu_chi
                WHERE trang_thai = 'DA_GHI_NHAN'
                  AND ngay_ghi_nhan <= :at
                """,
        Map.of("at", context.at.toLocalDateTime()),
        BigDecimal.class);
  }

  private Map<Long, Long> heldQuantities(Long warehouseId) {

    Map<Long, Long> result = new HashMap<>();

    for (var row :
        jdbc.queryForList(
            """
                        SELECT s.phien_ban_id AS id,
                               COALESCE(
                                 SUM(s.so_luong_giu_cho_bao_hanh),
                                 0
                               ) AS held
                        FROM ton_kho s
                        JOIN phien_ban_san_pham v
                          ON v.id = s.phien_ban_id
                        JOIN san_pham p
                          ON p.id = v.san_pham_id
                        WHERE s.kho_hang_id = :warehouse
                          AND p.loai_san_pham = 'DON'
                        GROUP BY s.phien_ban_id
                        """,
            Map.of("warehouse", warehouseId))) {

      result.put(requiredLong(row.get("id")), requiredLong(row.get("held")));
    }

    return result;
  }

  private Long warehouse() {
    Long id = repository.findDefaultWarehouseId(configuredWarehouseId);

    if (id == null) {
      throw new IllegalStateException("No active reporting warehouse");
    }

    return id;
  }

  private Scope scope(Map<String, String> params, String defaultPeriod, Context context) {

    String period =
        choice(
            params.get("ky"),
            params.containsKey("tu_ngay") || params.containsKey("den_ngay")
                ? "TUY_CHINH"
                : defaultPeriod,
            Set.of("HOM_NAY", "HOM_QUA", "TUAN_NAY", "THANG_NAY", "NAM_NAY", "TUY_CHINH"),
            "ky");

    String rawChannel =
        choice(
            params.get("kenh_ban"), "TAT_CA", Set.of("TAT_CA", "ONLINE", "TAI_QUAY"), "kenh_ban");

    String channel = "TAT_CA".equals(rawChannel) ? null : rawChannel;

    LocalDate today = context.at.toLocalDate();

    LocalDate from;
    LocalDate to;

    switch (period) {
      case "HOM_NAY" -> from = to = today;

      case "HOM_QUA" -> from = to = today.minusDays(1);

      case "TUAN_NAY" -> {
        from = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        to = from.plusDays(6);
      }

      case "THANG_NAY" -> {
        from = today.withDayOfMonth(1);
        to = today.with(TemporalAdjusters.lastDayOfMonth());
      }

      case "NAM_NAY" -> {
        from = today.withDayOfYear(1);
        to = today.with(TemporalAdjusters.lastDayOfYear());
      }

      default -> {
        try {
          from = LocalDate.parse(params.getOrDefault("tu_ngay", ""));

          to = LocalDate.parse(params.getOrDefault("den_ngay", ""));
        } catch (DateTimeException exception) {
          throw invalid("tu_ngay", "Ngày phải có định dạng YYYY-MM-DD hợp lệ");
        }

        if (from.isAfter(to)) {
          throw invalid("tu_ngay", "Từ ngày không được lớn hơn đến ngày");
        }
      }
    }

    return new Scope(period, from, to, channel);
  }

  private static String grouping(Map<String, String> params, Scope filter) {

    return choice(
        params.get("nhom_theo"),
        "NAM_NAY".equals(filter.period()) ? "THANG" : "NGAY",
        Set.of("NGAY", "THANG"),
        "nhom_theo");
  }

  private static int limit(Map<String, String> params) {

    return integer(params.getOrDefault("limit", "5"), 1, 100, "limit");
  }

  private static int integer(String raw, int minimum, int maximum, String field) {

    try {
      int value = Integer.parseInt(raw.strip());

      if (value < minimum || value > maximum) {
        throw new NumberFormatException();
      }

      return value;

    } catch (RuntimeException exception) {
      throw invalid(field, field + " phải từ " + minimum + " đến " + maximum);
    }
  }

  private static String choice(String raw, String fallback, Set<String> allowed, String field) {

    String value = raw == null || raw.isBlank() ? fallback : raw.strip().toUpperCase(Locale.ROOT);

    if (!allowed.contains(value)) {
      throw invalid(field, field + " không hợp lệ");
    }

    return value;
  }

  private static void validateKeys(String endpoint, Map<String, String> params) {

    Set<String> allowed =
        switch (endpoint) {
          case "tasks" -> new HashSet<>(List.of("kenh_ban", "limit"));

          case "inventory" -> new HashSet<>(List.of("limit"));

          case "after-sales" -> new HashSet<>(List.of("kenh_ban"));

          default -> new HashSet<>(List.of("ky", "tu_ngay", "den_ngay", "kenh_ban"));
        };

    if (Set.of("business-chart", "cashflow", "export").contains(endpoint)) {
      allowed.add("nhom_theo");
    }

    if (Set.of("top-products", "export").contains(endpoint)) {
      allowed.add("xep_hang_theo");
      allowed.add("limit");
    }

    if ("export".equals(endpoint)) {
      allowed.add("so_ngay_khong_ban");
    }

    for (String key : params.keySet()) {
      if (!allowed.contains(key)) {
        throw invalid(key, "API không nhận tham số " + key);
      }
    }
  }

  private static MapSqlParameterSource parameters(Scope filter) {

    return new MapSqlParameterSource()
        .addValue("start", filter.from().atStartOfDay())
        .addValue("end", filter.to().plusDays(1).atStartOfDay())
        .addValue("channel", filter.channel(), java.sql.Types.VARCHAR);
  }

  private static Map<String, Object> filterView(Scope filter, Context context) {

    return m(
        "ky",
        filter.period(),
        "tu_ngay",
        filter.from(),
        "den_ngay",
        filter.to(),
        "kenh_ban",
        channelLabel(filter.channel()),
        "ky_chua_ket_thuc",
        !filter.to().isBefore(context.at.toLocalDate()));
  }

  private static Map<String, Object> salesMetadata(Map<String, Object> result, Quality quality) {

    result.put("moc_thoi_gian_kinh_doanh", "NGAY_TAO_DON");

    result.put("phuong_phap_doanh_thu", "TRUOC_VAT_THEO_GIA_TRI_DONG_DA_LUU");

    result.put("chat_luong_du_lieu", quality.view());

    return result;
  }

  private static Map<String, Object> stamped(Context context, Map<String, Object> result) {

    result.put("cap_nhat_luc", context.at);

    return result;
  }

  private static Map<String, Object> metric(Object current, Object previous, String scope) {

    BigDecimal now = decimal(current);
    BigDecimal before = decimal(previous);

    BigDecimal rate =
        now == null || before == null || before.signum() == 0
            ? null
            : percent(now.subtract(before), before);

    Map<String, Object> result =
        m(
            "gia_tri", current,
            "ky_truoc", previous,
            "ty_le_thay_doi", rate);

    if (scope != null) {
      result.put("pham_vi", scope);
    }

    return result;
  }

  private static BigDecimal percent(BigDecimal numerator, BigDecimal denominator) {

    return numerator == null || denominator == null || denominator.signum() == 0
        ? null
        : numerator.multiply(BigDecimal.valueOf(100)).divide(denominator, 2, RoundingMode.HALF_UP);
  }

  private static BigDecimal divide(BigDecimal numerator, BigDecimal denominator) {

    return numerator == null ? null : numerator.divide(denominator, 2, RoundingMode.HALF_UP);
  }

  private static BigDecimal add(BigDecimal first, BigDecimal second) {

    return first == null || second == null ? null : first.add(second);
  }

  private static Long add(Long first, Long second) {

    return first == null || second == null ? null : Math.addExact(first, second);
  }

  private static BigDecimal subtract(BigDecimal first, BigDecimal second) {

    return first == null || second == null ? null : first.subtract(second);
  }

  private static BigDecimal decimal(Object value) {
    return value == null
        ? null
        : value instanceof BigDecimal decimal ? decimal : new BigDecimal(value.toString());
  }

  private static Long optionalLong(Object value) {
    try {
      return value == null ? null : decimal(value).longValueExact();

    } catch (RuntimeException exception) {
      return null;
    }
  }

  private static long requiredLong(Object value) {
    Long result = optionalLong(value);

    if (result == null) {
      throw new IllegalStateException("Required numeric source missing");
    }

    return result;
  }

  private static Boolean flag(Object value) {
    if (value == null) {
      return null;
    }

    if (value instanceof Boolean result) {
      return result;
    }

    if (value instanceof Number number) {
      return number.intValue() == 1 ? Boolean.TRUE : number.intValue() == 0 ? Boolean.FALSE : null;
    }

    if (value instanceof byte[] bytes && bytes.length == 1) {
      return bytes[0] == 1 ? Boolean.TRUE : bytes[0] == 0 ? Boolean.FALSE : null;
    }

    return switch (value.toString().toLowerCase(Locale.ROOT)) {
      case "true", "1" -> true;
      case "false", "0" -> false;
      default -> null;
    };
  }

  private static LocalDateTime time(Object value) {
    if (value instanceof LocalDateTime result) {
      return result;
    }

    if (value instanceof Timestamp timestamp) {
      return timestamp.toLocalDateTime();
    }

    if (value instanceof OffsetDateTime offset) {
      return offset.atZoneSameInstant(ZONE).toLocalDateTime();
    }

    throw new IllegalStateException("Required date source missing");
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> dto(Object value) {
    return objectMapper.convertValue(value, Map.class);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> object(Object value) {

    if (!(value instanceof Map<?, ?>)) {
      throw new IllegalStateException("Invalid source object");
    }

    return (Map<String, Object>) value;
  }

  private static List<?> list(Object value) {
    if (!(value instanceof List<?> result)) {
      throw new IllegalStateException("Invalid source array");
    }

    return result;
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> json(String raw) {
    try {
      return raw == null || raw.isBlank() ? null : objectMapper.readValue(raw, Map.class);

    } catch (RuntimeException exception) {
      return null;
    }
  }

  private static Map<String, Object> counters(List<String> keys) {

    Map<String, Object> result = new LinkedHashMap<>();

    keys.forEach(key -> result.put(key, 0L));

    return result;
  }

  private static void increment(Map<String, Object> counts, String key) {

    counts.put(key, requiredLong(counts.getOrDefault(key, 0L)) + 1);
  }

  private static String channelLabel(String channel) {

    return channel == null ? "TAT_CA" : channel;
  }

  private static Map<String, Object> m(Object... values) {

    Map<String, Object> result = new LinkedHashMap<>();

    for (int index = 0; index < values.length; index += 2) {

      result.put(values[index].toString(), values[index + 1]);
    }

    return result;
  }

  private static AppException invalid(String field, String message) {

    return new AppException(ErrorCode.INVALID_DATA, field, "INVALID_DASHBOARD_FILTER", message);
  }

  private <T> T protect(Supplier<T> operation) {

    try {
      return operation.get();

    } catch (AppException exception) {
      throw exception;

    } catch (RuntimeException exception) {
      log.error("Dashboard source aggregation failed", exception);

      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "source",
          "REPORT_SOURCE_UNAVAILABLE",
          "Không tổng hợp được nguồn dữ liệu báo cáo");
    }
  }
}
