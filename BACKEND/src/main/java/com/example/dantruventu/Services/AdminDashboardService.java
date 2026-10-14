package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.dashboard.AdminDashboardResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.dashboard.AdminDashboardRepository;
import com.example.dantruventu.Repository.dashboard.AdminDashboardRepository.CashRow;
import com.example.dantruventu.Repository.dashboard.AdminDashboardRepository.InventoryRow;
import com.example.dantruventu.Repository.dashboard.AdminDashboardRepository.SalesLineRow;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

  private static final int PROMOTION_THRESHOLD_DAYS = 7;
  private static final int MAX_LIMIT = 100;
  private static final LocalDate HISTORY_START = LocalDate.of(1900, 1, 1);
  private static final List<String> ORDER_TASK_STATUSES =
      List.of(
          "CHO_DUYET",
          "CHO_THANH_TOAN",
          "CHO_DONG_GOI",
          "CHO_LAY_HANG",
          "DANG_GIAO_HANG");
  private static final Set<String> LONG_WAIT_STATUSES =
      Set.of("CHO_DUYET", "CHO_THANH_TOAN", "CHO_DONG_GOI", "CHO_LAY_HANG");
  private static final List<String> WARRANTY_STATUSES =
      List.of(
          "TIEP_NHAN",
          "DANG_KIEM_TRA",
          "DA_GUI_BAO_HANH",
          "DANG_BAO_HANH",
          "DA_NHAN_LAI",
          "HOAN_TAT");

  private final AdminDashboardRepository repository;
  private final DashboardExcelExporter excelExporter;

  @Value("${ruventu.dashboard.time-zone:Asia/Ho_Chi_Minh}")
  private String dashboardTimeZone;

  @Value("${ruventu.dashboard.long-wait-minutes:120}")
  private int longWaitMinutes;

  @Value("${ruventu.inventory.warehouse-id:0}")
  private long configuredWarehouseId;

  public AdminDashboardResponse.Summary getSummary(
      String rawPeriod, String rawFrom, String rawTo, String rawChannel) {
    DashboardFilter filter = filter(rawPeriod, rawFrom, rawTo, rawChannel);
    SalesAggregate current = sales(filter.from(), filter.to(), filter.channel());
    SalesAggregate previous =
        sales(filter.previousFrom(), filter.previousTo(), filter.channel());
    BigDecimal currentReceipt = cashTotals(filter.from(), filter.to()).receipt();
    BigDecimal previousReceipt =
        cashTotals(filter.previousFrom(), filter.previousTo()).receipt();

    AdminDashboardResponse.Kpi kpi =
        new AdminDashboardResponse.Kpi(
            metric(current.netRevenue(), previous.netRevenue(), null),
            metric(
                BigDecimal.valueOf(current.orders().size()),
                BigDecimal.valueOf(previous.orders().size()),
                null),
            metric(
                BigDecimal.valueOf(current.soldQuantity()),
                BigDecimal.valueOf(previous.soldQuantity()),
                null),
            metric(currentReceipt, previousReceipt, "TOAN_CUA_HANG"));

    BigDecimal average =
        current.orders().isEmpty()
            ? zero()
            : current
                .netRevenue()
                .divide(BigDecimal.valueOf(current.orders().size()), 2, RoundingMode.HALF_UP);
    AdminDashboardResponse.Business business =
        new AdminDashboardResponse.Business(
            money(current.grossRevenue()),
            money(current.discount()),
            money(current.returnedAmount()),
            money(average),
            money(current.cost()),
            money(current.netRevenue().subtract(current.cost())));

    return new AdminDashboardResponse.Summary(
        updatedAt(),
        responseFilter(filter),
        new AdminDashboardResponse.Period(filter.previousFrom(), filter.previousTo()),
        kpi,
        business,
        channelMix(current),
        new AdminDashboardResponse.CurrentSnapshot(
            money(repository.currentCashBalance()), repository.countActiveEmployees()));
  }

  public AdminDashboardResponse.Tasks getTasks(String rawChannel, String rawLimit) {
    String channel = parseChannel(rawChannel);
    String channelLabel = channelLabel(channel);
    int limit = parseLimit(rawLimit);
    LocalDateTime now = nowLocal();

    List<AdminDashboardRepository.TaskOrderRow> orders = repository.findTaskOrders(channel);
    Map<String, Long> orderCounts = initializedCounts(ORDER_TASK_STATUSES);
    orders.forEach(
        order ->
            orderCounts.computeIfPresent(order.status(), (key, value) -> value + 1));

    List<AdminDashboardRepository.DeliveryRow> deliveries =
        repository.findCurrentDeliveryIssues(channel);
    Map<String, Long> deliveryCounts = initializedCounts(List.of("GIAO_THAT_BAI", "CHO_HOAN_HANG"));
    deliveries.forEach(
        delivery ->
            deliveryCounts.computeIfPresent(delivery.status(), (key, value) -> value + 1));

    Set<Long> actionableOrderIds =
        orders.stream().map(AdminDashboardRepository.TaskOrderRow::id).collect(Collectors.toSet());
    deliveries.forEach(delivery -> actionableOrderIds.add(delivery.orderId()));

    List<AdminDashboardResponse.PriorityOrder> priority =
        orders.stream()
            .filter(order -> LONG_WAIT_STATUSES.contains(order.status()))
            .map(
                order -> {
                  long minutes = Math.max(0, Duration.between(order.createdAt(), now).toMinutes());
                  return Map.entry(order, minutes);
                })
            .filter(entry -> entry.getValue() >= longWaitMinutes)
            .sorted(
                Comparator.comparing(
                        (Map.Entry<AdminDashboardRepository.TaskOrderRow, Long> entry) ->
                            entry.getKey().createdAt())
                    .thenComparing(entry -> entry.getKey().id()))
            .limit(limit)
            .map(
                entry ->
                    new AdminDashboardResponse.PriorityOrder(
                        entry.getKey().id(),
                        entry.getKey().code(),
                        entry.getKey().status(),
                        entry.getKey().status() + "_QUA_NGUONG",
                        offset(entry.getKey().createdAt()),
                        entry.getValue()))
            .toList();

    long totalLongWait =
        orders.stream()
            .filter(order -> LONG_WAIT_STATUSES.contains(order.status()))
            .filter(
                order ->
                    Math.max(0, Duration.between(order.createdAt(), now).toMinutes())
                        >= longWaitMinutes)
            .count();

    List<AdminDashboardRepository.ReturnRow> returns = repository.findReturns(channel);
    long waitingReceipt =
        returns.stream().filter(item -> "CHO_TIEP_NHAN".equals(item.status())).count();
    long waitingRefund =
        returns.stream()
            .filter(item -> "DA_NHAN_HANG".equals(item.status()))
            .filter(item -> item.amount().signum() > 0)
            .count();

    return new AdminDashboardResponse.Tasks(
        updatedAt(),
        "HIEN_TAI",
        channelLabel,
        longWaitMinutes,
        orderCounts,
        deliveryCounts,
        actionableOrderIds.size(),
        totalLongWait,
        new AdminDashboardResponse.ReturnTasks(
            waitingReceipt, waitingRefund, waitingReceipt + waitingRefund),
        priority);
  }

  public AdminDashboardResponse.BusinessChart getBusinessChart(
      String rawPeriod,
      String rawFrom,
      String rawTo,
      String rawChannel,
      String rawGrouping) {
    DashboardFilter filter = filter(rawPeriod, rawFrom, rawTo, rawChannel);
    Grouping grouping = parseGrouping(rawGrouping, filter.period());
    SalesAggregate current = sales(filter.from(), filter.to(), filter.channel());
    SalesAggregate previous =
        sales(filter.previousFrom(), filter.previousTo(), filter.channel());
    return new AdminDashboardResponse.BusinessChart(
        updatedAt(),
        grouping.name(),
        businessPoints(current, filter.from(), filter.to(), grouping),
        businessPoints(previous, filter.previousFrom(), filter.previousTo(), grouping));
  }

  public AdminDashboardResponse.TopProducts getTopProducts(
      String rawPeriod,
      String rawFrom,
      String rawTo,
      String rawChannel,
      String rawRanking,
      String rawLimit) {
    DashboardFilter filter = filter(rawPeriod, rawFrom, rawTo, rawChannel);
    Ranking ranking = parseRanking(rawRanking);
    int limit = parseLimit(rawLimit);
    SalesAggregate aggregate = sales(filter.from(), filter.to(), filter.channel());
    Long warehouseId = requireWarehouse();
    Map<Long, InventoryRow> inventory =
        repository.findInventoryRows(warehouseId).stream()
            .collect(Collectors.toMap(InventoryRow::variantId, Function.identity()));
    Map<Long, Long> comboCapacities = repository.findComboCapacities(warehouseId);

    Map<Long, ProductAccumulator> byVariant = new HashMap<>();
    for (LineMetric line : aggregate.lines()) {
      ProductAccumulator product =
          byVariant.computeIfAbsent(
              line.source().variantId(),
              ignored -> new ProductAccumulator(line.source()));
      product.quantity += line.source().quantity();
      product.returnedQuantity += line.source().returnedQuantity();
      product.netRevenue = product.netRevenue.add(line.netRevenue());
    }

    Comparator<ProductAccumulator> comparator =
        ranking == Ranking.SO_LUONG_BAN
            ? Comparator.comparingLong((ProductAccumulator item) -> item.quantity).reversed()
            : Comparator.comparing((ProductAccumulator item) -> item.netRevenue).reversed();
    comparator = comparator.thenComparing(item -> item.source.variantId());
    List<ProductAccumulator> sorted = byVariant.values().stream().sorted(comparator).toList();

    List<AdminDashboardResponse.TopProductItem> items = new ArrayList<>();
    for (int index = 0; index < Math.min(limit, sorted.size()); index++) {
      ProductAccumulator product = sorted.get(index);
      SalesLineRow source = product.source;
      boolean combo = "BO_PC".equals(source.productType());
      InventoryRow stock = inventory.get(source.variantId());
      Long physical = combo ? null : stock == null ? 0L : stock.physicalStock();
      Long available = combo ? null : stock == null ? 0L : stock.availableStock();
      Long buildable = combo ? comboCapacities.getOrDefault(source.productId(), 0L) : null;
      String alert = combo ? comboAlert(buildable) : inventoryAlert(stock);
      items.add(
          new AdminDashboardResponse.TopProductItem(
              index + 1,
              source.productId(),
              source.variantId(),
              source.productName(),
              source.variantName(),
              source.barcode(),
              source.productType(),
              product.quantity,
              product.returnedQuantity,
              money(product.netRevenue),
              physical,
              available,
              buildable,
              alert));
    }

    return new AdminDashboardResponse.TopProducts(
        updatedAt(), ranking.name(), sorted.size(), items);
  }

  public AdminDashboardResponse.Inventory getInventory(String rawLimit) {
    int limit = parseLimit(rawLimit);
    Long warehouseId = requireWarehouse();
    List<InventoryRow> rows = repository.findInventoryRows(warehouseId);
    long totalPhysical = rows.stream().mapToLong(InventoryRow::physicalStock).sum();
    long totalAvailable = rows.stream().mapToLong(InventoryRow::availableStock).sum();
    BigDecimal inventoryValue =
        rows.stream()
            .map(
                row ->
                    row.currentCost().multiply(BigDecimal.valueOf(row.physicalStock())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    List<InventoryRow> active =
        rows.stream().filter(row -> row.activeProduct() && row.activeVariant()).toList();
    long outOfStock = active.stream().filter(row -> row.availableStock() <= 0).count();
    long belowMinimum =
        active.stream()
            .filter(row -> row.minimumStock() != null)
            .filter(row -> row.availableStock() < row.minimumStock())
            .count();
    List<InventoryRow> alerts =
        active.stream()
            .filter(this::hasInventoryAlert)
            .sorted(
                Comparator.comparingInt((InventoryRow row) -> row.availableStock() <= 0 ? 0 : 1)
                    .thenComparingLong(InventoryRow::availableStock)
                    .thenComparing(InventoryRow::variantId))
            .toList();
    List<AdminDashboardResponse.InventoryWarning> warningItems =
        alerts.stream()
            .limit(limit)
            .map(
                row ->
                    new AdminDashboardResponse.InventoryWarning(
                        row.variantId(),
                        row.productName(),
                        row.variantName(),
                        row.physicalStock(),
                        row.availableStock(),
                        row.minimumStock(),
                        inventoryAlert(row)))
            .toList();

    return new AdminDashboardResponse.Inventory(
        updatedAt(),
        "HIEN_TAI",
        warehouseId,
        totalPhysical,
        totalAvailable,
        outOfStock,
        belowMinimum,
        money(inventoryValue),
        repository.countActiveProducts(),
        repository.countActiveVariants(),
        new AdminDashboardResponse.InventoryAlerts(alerts.size(), warningItems));
  }

  public AdminDashboardResponse.SlowMovingProducts getSlowMovingProducts(
      String rawDays, String rawLimit) {
    int days = parseDays(rawDays);
    int limit = parseLimit(rawLimit);
    Long warehouseId = requireWarehouse();
    LocalDate today = today();

    List<SlowMetric> slow =
        repository.findSlowStockRows(warehouseId).stream()
            .map(
                row -> {
                  Long inactiveDays =
                      row.lastSale() == null
                          ? null
                          : ChronoUnit.DAYS.between(row.lastSale().toLocalDate(), today);
                  return new SlowMetric(row, inactiveDays);
                })
            .filter(item -> item.days() == null || item.days() >= days)
            .sorted(
                Comparator.comparing(
                        (SlowMetric item) -> item.source().lastSale() != null)
                    .thenComparing(
                        item -> item.source().lastSale(),
                        Comparator.nullsFirst(Comparator.naturalOrder()))
                    .thenComparing(item -> item.source().variantId()))
            .toList();

    List<AdminDashboardResponse.SlowMovingItem> items =
        slow.stream()
            .limit(limit)
            .map(
                item ->
                    new AdminDashboardResponse.SlowMovingItem(
                        item.source().variantId(),
                        item.source().productName(),
                        item.source().variantName(),
                        item.source().physicalStock(),
                        offset(item.source().lastSale()),
                        item.days(),
                        item.source().lastSale() == null
                            ? "CHUA_CO_LICH_SU_XUAT_BAN"
                            : "LAU_CHUA_XUAT_BAN"))
            .toList();
    return new AdminDashboardResponse.SlowMovingProducts(
        updatedAt(), "HIEN_TAI", days, slow.size(), items);
  }

  public AdminDashboardResponse.Purchases getPurchases() {
    List<AdminDashboardRepository.PurchaseRow> rows = repository.findPurchaseRows();
    long awaitingApproval = count(rows, item -> "DAT_HANG".equals(item.purchaseStatus()));
    long awaitingReceipt = count(rows, item -> "DA_DUYET".equals(item.purchaseStatus()));
    long partialReceipt = count(rows, item -> "NHAP_MOT_PHAN".equals(item.purchaseStatus()));
    Set<String> debtStatuses =
        Set.of("DA_DUYET", "NHAP_MOT_PHAN", "DA_NHAP_KHO", "HOAN_TRA_MOT_PHAN");
    long unpaid =
        count(
            rows,
            item ->
                debtStatuses.contains(item.purchaseStatus())
                    && "CHUA_TRA".equals(item.paymentStatus()));
    long partialPaid =
        count(
            rows,
            item ->
                debtStatuses.contains(item.purchaseStatus())
                    && "TRA_MOT_PHAN".equals(item.paymentStatus()));
    return new AdminDashboardResponse.Purchases(
        updatedAt(),
        "HIEN_TAI",
        awaitingApproval,
        awaitingReceipt,
        partialReceipt,
        unpaid,
        partialPaid,
        null,
        "CHUA_DAM_BAO_LIEN_KET_THANH_TOAN_VA_HOAN_TRA");
  }

  public AdminDashboardResponse.Customers getCustomers(
      String rawPeriod, String rawFrom, String rawTo, String rawChannel) {
    DashboardFilter filter = filter(rawPeriod, rawFrom, rawTo, rawChannel);
    SalesAggregate period = sales(filter.from(), filter.to(), filter.channel());
    SalesAggregate history = sales(HISTORY_START, filter.to(), filter.channel());

    Map<Long, CustomerMetric> periodCustomers = customerMetrics(period);
    Map<Long, Long> historicalOrderCounts = new HashMap<>();
    history.orders().values().stream()
        .filter(order -> order.customerId() != null)
        .forEach(order -> historicalOrderCounts.merge(order.customerId(), 1L, Long::sum));
    long returning =
        periodCustomers.keySet().stream()
            .filter(customerId -> historicalOrderCounts.getOrDefault(customerId, 0L) >= 2)
            .count();
    long guestOrders =
        period.orders().values().stream().filter(order -> order.customerId() == null).count();

    AdminDashboardResponse.ValuableCustomer mostValuable =
        periodCustomers.values().stream()
            .sorted(
                Comparator.comparing(CustomerMetric::netValue)
                    .reversed()
                    .thenComparing(CustomerMetric::id))
            .findFirst()
            .map(
                customer ->
                    new AdminDashboardResponse.ValuableCustomer(
                        customer.id(),
                        customer.name(),
                        customer.orderCount(),
                        money(customer.netValue())))
            .orElse(null);

    return new AdminDashboardResponse.Customers(
        updatedAt(),
        repository.countCustomers(),
        repository.countNewCustomers(start(filter.from()), endExclusive(filter.to())),
        "TOAN_CUA_HANG",
        periodCustomers.size(),
        returning,
        guestOrders,
        mostValuable);
  }

  public AdminDashboardResponse.Cashflow getCashflow(
      String rawPeriod,
      String rawFrom,
      String rawTo,
      String rawChannel,
      String rawGrouping) {
    DashboardFilter filter = filter(rawPeriod, rawFrom, rawTo, rawChannel);
    Grouping grouping = parseGrouping(rawGrouping, filter.period());
    List<CashRow> rows = repository.findCashRows(start(filter.from()), endExclusive(filter.to()));
    CashTotals totals = cashTotals(rows);

    Map<String, BigDecimal> byMethod = new java.util.TreeMap<>();
    rows.stream()
        .filter(row -> "THU".equals(row.type()))
        .forEach(
            row ->
                byMethod.merge(
                    row.paymentMethod() == null ? "KHAC" : row.paymentMethod(),
                    row.amount(),
                    BigDecimal::add));
    List<AdminDashboardResponse.PaymentMethodAmount> methods =
        byMethod.entrySet().stream()
            .map(
                entry ->
                    new AdminDashboardResponse.PaymentMethodAmount(
                        entry.getKey(), money(entry.getValue())))
            .toList();

    return new AdminDashboardResponse.Cashflow(
        updatedAt(),
        "TOAN_CUA_HANG",
        money(repository.currentCashBalance()),
        new AdminDashboardResponse.CashPeriod(
            money(totals.receipt()),
            money(totals.disbursement()),
            money(totals.receipt().subtract(totals.disbursement()))),
        methods,
        cashPoints(rows, filter.from(), filter.to(), grouping),
        new AdminDashboardResponse.UnpaidOrders(
            channelLabel(filter.channel()),
            money(repository.currentUnpaidOrderValue(filter.channel())),
            money(repository.currentCodInTransit(filter.channel())),
            null,
            "CHUA_CO_DU_LIEU_DOI_SOAT_COD"));
  }

  public AdminDashboardResponse.AfterSales getAfterSales(String rawChannel) {
    String channel = parseChannel(rawChannel);
    Map<String, Long> warranty = initializedCounts(WARRANTY_STATUSES);
    repository
        .findWarrantyStatusCounts(channel)
        .forEach(row -> warranty.computeIfPresent(row.status(), (key, value) -> row.total()));
    List<AdminDashboardRepository.ReturnRow> returns = repository.findReturns(channel);
    long waitingReceipt =
        returns.stream().filter(item -> "CHO_TIEP_NHAN".equals(item.status())).count();
    long received = returns.stream().filter(item -> "DA_NHAN_HANG".equals(item.status())).count();
    long refunded = returns.stream().filter(item -> "DA_HOAN_TIEN".equals(item.status())).count();
    long waitingRefund =
        returns.stream()
            .filter(item -> "DA_NHAN_HANG".equals(item.status()) && item.amount().signum() > 0)
            .count();
    BigDecimal waitingRefundValue =
        returns.stream()
            .filter(item -> "DA_NHAN_HANG".equals(item.status()) && item.amount().signum() > 0)
            .map(AdminDashboardRepository.ReturnRow::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    return new AdminDashboardResponse.AfterSales(
        updatedAt(),
        "HIEN_TAI",
        channelLabel(channel),
        warranty,
        new AdminDashboardResponse.ReturnOverview(
            waitingReceipt, received, refunded, waitingRefund, money(waitingRefundValue)));
  }

  public AdminDashboardResponse.Promotions getPromotions() {
    LocalDateTime now = nowLocal();
    LocalDateTime threshold = now.plusDays(PROMOTION_THRESHOLD_DAYS);
    List<AdminDashboardRepository.PromotionRow> rows = repository.findPromotions();
    long inApplicationWindow =
        rows.stream().filter(row -> isRunningPromotion(row, now)).count();
    long stillAvailable =
        rows.stream()
            .filter(row -> isRunningPromotion(row, now))
            .filter(
                row -> row.applicationLimit() == null || row.usedCount() < row.applicationLimit())
            .count();
    long startingSoon =
        rows.stream()
            .filter(AdminDashboardRepository.PromotionRow::active)
            .filter(row -> row.startsAt().isAfter(now) && !row.startsAt().isAfter(threshold))
            .count();
    long endingSoon =
        rows.stream()
            .filter(row -> isRunningPromotion(row, now))
            .filter(row -> !row.endsAt().isAfter(threshold))
            .count();
    long totalUses =
        rows.stream().mapToLong(AdminDashboardRepository.PromotionRow::usedCount).sum();
    return new AdminDashboardResponse.Promotions(
        updatedAt(),
        "HIEN_TAI",
        PROMOTION_THRESHOLD_DAYS,
        inApplicationWindow,
        stillAvailable,
        startingSoon,
        endingSoon,
        totalUses,
        null,
        null,
        "CHUA_CO_LIEN_KET_KHUYEN_MAI_VOI_DON_HANG");
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public ExportResult export(
      String rawPeriod,
      String rawFrom,
      String rawTo,
      String rawChannel,
      String rawGrouping,
      String rawRanking,
      String rawDays,
      String rawLimit) {
    DashboardFilter filter = filter(rawPeriod, rawFrom, rawTo, rawChannel);
    String grouping = parseGrouping(rawGrouping, filter.period()).name();
    String ranking = parseRanking(rawRanking).name();
    int days = parseDays(rawDays);
    int limit = parseLimit(rawLimit);

    AdminDashboardResponse.Summary summary =
        getSummary(
            filter.period().name(),
            rawFromFor(filter),
            rawToFor(filter),
            channelLabel(filter.channel()));
    AdminDashboardResponse.Tasks tasks =
        getTasks(channelLabel(filter.channel()), String.valueOf(limit));
    AdminDashboardResponse.BusinessChart chart =
        getBusinessChart(
            filter.period().name(),
            rawFromFor(filter),
            rawToFor(filter),
            channelLabel(filter.channel()),
            grouping);
    AdminDashboardResponse.TopProducts products =
        getTopProducts(
            filter.period().name(),
            rawFromFor(filter),
            rawToFor(filter),
            channelLabel(filter.channel()),
            ranking,
            String.valueOf(limit));
    AdminDashboardResponse.Inventory inventory = getInventory(String.valueOf(limit));
    AdminDashboardResponse.SlowMovingProducts slow =
        getSlowMovingProducts(String.valueOf(days), String.valueOf(limit));
    AdminDashboardResponse.Purchases purchases = getPurchases();
    AdminDashboardResponse.Customers customers =
        getCustomers(
            filter.period().name(),
            rawFromFor(filter),
            rawToFor(filter),
            channelLabel(filter.channel()));
    AdminDashboardResponse.Cashflow cashflow =
        getCashflow(
            filter.period().name(),
            rawFromFor(filter),
            rawToFor(filter),
            channelLabel(filter.channel()),
            grouping);
    AdminDashboardResponse.AfterSales afterSales = getAfterSales(channelLabel(filter.channel()));
    AdminDashboardResponse.Promotions promotions = getPromotions();

    byte[] content =
        excelExporter.export(
            summary,
            tasks,
            chart,
            products,
            inventory,
            slow,
            purchases,
            customers,
            cashflow,
            afterSales,
            promotions,
            limit);
    if (content.length == 0) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Xuất báo cáo không thành công, vui lòng thử lại");
    }
    String filename =
        "Ruventu_TongQuat_"
            + filter.from().toString().replace("-", "")
            + "_"
            + filter.to().toString().replace("-", "")
            + ".xlsx";
    return new ExportResult(content, filename);
  }

  private String rawFromFor(DashboardFilter filter) {
    return filter.period() == PeriodKind.TUY_CHINH ? filter.from().toString() : null;
  }

  private String rawToFor(DashboardFilter filter) {
    return filter.period() == PeriodKind.TUY_CHINH ? filter.to().toString() : null;
  }

  private SalesAggregate sales(LocalDate from, LocalDate to, String channel) {
    return aggregateSales(repository.findSalesLines(start(from), endExclusive(to), channel));
  }

  private SalesAggregate aggregateSales(List<SalesLineRow> sourceLines) {
    Map<Long, List<SalesLineRow>> grouped =
        sourceLines.stream()
            .collect(
                Collectors.groupingBy(
                    SalesLineRow::orderId, LinkedHashMap::new, Collectors.toList()));
    List<LineMetric> lines = new ArrayList<>();
    Map<Long, OrderMetric> orders = new LinkedHashMap<>();
    BigDecimal grossRevenue = zero();
    BigDecimal discount = zero();
    BigDecimal returnedAmount = zero();
    BigDecimal cost = zero();
    long soldQuantity = 0;

    for (Map.Entry<Long, List<SalesLineRow>> entry : grouped.entrySet()) {
      List<SalesLineRow> orderLines = entry.getValue();
      BigDecimal orderGross =
          orderLines.stream().map(SalesLineRow::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
      BigDecimal orderDiscount = money(orderLines.get(0).orderDiscount());
      Map<Long, BigDecimal> allocatedDiscounts =
          allocateDiscount(orderLines, orderGross, orderDiscount);
      BigDecimal orderReturns = zero();
      BigDecimal orderNet = zero();
      BigDecimal orderCost = zero();
      long orderQuantity = 0;

      for (SalesLineRow source : orderLines) {
        BigDecimal lineDiscount = allocatedDiscounts.getOrDefault(source.lineId(), zero());
        BigDecimal lineNet =
            source.lineTotal().subtract(lineDiscount).subtract(source.returnedAmount());
        long netCostQuantity = Math.max(0, source.quantity() - source.returnedQuantity());
        BigDecimal lineCost =
            source.currentCost().multiply(BigDecimal.valueOf(netCostQuantity));
        lines.add(new LineMetric(source, money(lineDiscount), money(lineNet), money(lineCost)));
        orderReturns = orderReturns.add(source.returnedAmount());
        orderNet = orderNet.add(lineNet);
        orderCost = orderCost.add(lineCost);
        orderQuantity += source.quantity();
      }

      SalesLineRow first = orderLines.get(0);
      orders.put(
          entry.getKey(),
          new OrderMetric(
              entry.getKey(),
              first.orderDate(),
              first.channel(),
              first.customerId(),
              first.customerName(),
              money(orderGross),
              money(orderDiscount),
              money(orderReturns),
              money(orderNet),
              money(orderCost),
              orderQuantity));
      grossRevenue = grossRevenue.add(orderGross);
      discount = discount.add(orderDiscount);
      returnedAmount = returnedAmount.add(orderReturns);
      cost = cost.add(orderCost);
      soldQuantity += orderQuantity;
    }

    return new SalesAggregate(
        lines,
        orders,
        money(grossRevenue),
        money(discount),
        money(returnedAmount),
        money(grossRevenue.subtract(discount).subtract(returnedAmount)),
        money(cost),
        soldQuantity);
  }

  private Map<Long, BigDecimal> allocateDiscount(
      List<SalesLineRow> lines, BigDecimal gross, BigDecimal discount) {
    Map<Long, BigDecimal> result = new HashMap<>();
    lines.forEach(line -> result.put(line.lineId(), zero()));
    if (discount.signum() == 0 || gross.signum() <= 0) {
      return result;
    }
    List<SalesLineRow> priced =
        lines.stream().filter(line -> line.lineTotal().signum() > 0).toList();
    if (priced.isEmpty()) {
      return result;
    }
    BigDecimal allocated = zero();
    for (int index = 0; index < priced.size(); index++) {
      SalesLineRow line = priced.get(index);
      BigDecimal amount =
          index == priced.size() - 1
              ? discount.subtract(allocated)
              : discount
                  .multiply(line.lineTotal())
                  .divide(gross, 2, RoundingMode.DOWN);
      amount = money(amount);
      result.put(line.lineId(), amount);
      allocated = allocated.add(amount);
    }
    return result;
  }

  private List<AdminDashboardResponse.ChannelMix> channelMix(SalesAggregate aggregate) {
    Map<String, List<OrderMetric>> grouped =
        aggregate.orders().values().stream()
            .collect(
                Collectors.groupingBy(
                    OrderMetric::channel, LinkedHashMap::new, Collectors.toList()));
    return grouped.entrySet().stream()
        .sorted(Map.Entry.comparingByKey())
        .map(
            entry -> {
              BigDecimal revenue =
                  entry.getValue().stream()
                      .map(OrderMetric::netRevenue)
                      .reduce(BigDecimal.ZERO, BigDecimal::add);
              BigDecimal share =
                  aggregate.netRevenue().signum() == 0
                      ? zero()
                      : revenue
                          .multiply(BigDecimal.valueOf(100))
                          .divide(aggregate.netRevenue(), 2, RoundingMode.HALF_UP);
              return new AdminDashboardResponse.ChannelMix(
                  entry.getKey(), money(revenue), entry.getValue().size(), compact(share));
            })
        .toList();
  }

  private List<AdminDashboardResponse.BusinessPoint> businessPoints(
      SalesAggregate aggregate, LocalDate from, LocalDate to, Grouping grouping) {
    return buckets(from, to, grouping).stream()
        .map(
            bucket -> {
              List<OrderMetric> orders =
                  aggregate.orders().values().stream()
                      .filter(
                          order -> {
                            LocalDate date = order.date().toLocalDate();
                            return !date.isBefore(bucket.from()) && !date.isAfter(bucket.to());
                          })
                      .toList();
              BigDecimal revenue = sum(orders, OrderMetric::netRevenue);
              BigDecimal cost = sum(orders, OrderMetric::cost);
              long quantity = orders.stream().mapToLong(OrderMetric::quantity).sum();
              return new AdminDashboardResponse.BusinessPoint(
                  bucket.from(),
                  bucket.to(),
                  money(revenue),
                  orders.size(),
                  quantity,
                  money(revenue.subtract(cost)));
            })
        .toList();
  }

  private List<AdminDashboardResponse.CashPoint> cashPoints(
      List<CashRow> rows, LocalDate from, LocalDate to, Grouping grouping) {
    return buckets(from, to, grouping).stream()
        .map(
            bucket -> {
              CashTotals totals =
                  cashTotals(
                      rows.stream()
                          .filter(
                              row -> {
                                LocalDate date = row.recordedAt().toLocalDate();
                                return !date.isBefore(bucket.from()) && !date.isAfter(bucket.to());
                              })
                          .toList());
              return new AdminDashboardResponse.CashPoint(
                  bucket.from(), bucket.to(), totals.receipt(), totals.disbursement());
            })
        .toList();
  }

  private List<DateBucket> buckets(LocalDate from, LocalDate to, Grouping grouping) {
    List<DateBucket> result = new ArrayList<>();
    LocalDate cursor = from;
    while (!cursor.isAfter(to)) {
      LocalDate bucketEnd =
          grouping == Grouping.NGAY
              ? cursor
              : cursor.with(TemporalAdjusters.lastDayOfMonth());
      if (bucketEnd.isAfter(to)) {
        bucketEnd = to;
      }
      result.add(new DateBucket(cursor, bucketEnd));
      cursor = bucketEnd.plusDays(1);
    }
    return result;
  }

  private Map<Long, CustomerMetric> customerMetrics(SalesAggregate aggregate) {
    Map<Long, CustomerMetric> result = new HashMap<>();
    for (OrderMetric order : aggregate.orders().values()) {
      if (order.customerId() == null) {
        continue;
      }
      result.compute(
          order.customerId(),
          (id, existing) ->
              existing == null
                  ? new CustomerMetric(id, order.customerName(), 1, order.netRevenue())
                  : new CustomerMetric(
                      id,
                      existing.name(),
                      existing.orderCount() + 1,
                      existing.netValue().add(order.netRevenue())));
    }
    return result;
  }

  private CashTotals cashTotals(LocalDate from, LocalDate to) {
    return cashTotals(repository.findCashRows(start(from), endExclusive(to)));
  }

  private CashTotals cashTotals(List<CashRow> rows) {
    BigDecimal receipt =
        rows.stream()
            .filter(row -> "THU".equals(row.type()))
            .map(CashRow::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal disbursement =
        rows.stream()
            .filter(row -> "CHI".equals(row.type()))
            .map(CashRow::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    return new CashTotals(money(receipt), money(disbursement));
  }

  private AdminDashboardResponse.Metric metric(
      BigDecimal current, BigDecimal previous, String scope) {
    return new AdminDashboardResponse.Metric(
        current, previous, percentageChange(current, previous), scope);
  }

  private BigDecimal percentageChange(BigDecimal current, BigDecimal previous) {
    if (previous.signum() == 0) {
      return null;
    }
    return compact(
        current
            .subtract(previous)
            .multiply(BigDecimal.valueOf(100))
            .divide(previous, 2, RoundingMode.HALF_UP));
  }

  private DashboardFilter filter(
      String rawPeriod, String rawFrom, String rawTo, String rawChannel) {
    PeriodKind period = parsePeriod(rawPeriod, rawFrom, rawTo);
    LocalDate today = today();
    LocalDate from;
    LocalDate to;
    switch (period) {
      case HOM_NAY -> from = to = today;
      case HOM_QUA -> from = to = today.minusDays(1);
      case TUAN_NAY -> {
        from = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        to = from.plusDays(6);
      }
      case THANG_NAY -> {
        from = today.withDayOfMonth(1);
        to = today.with(TemporalAdjusters.lastDayOfMonth());
      }
      case NAM_NAY -> {
        from = today.withDayOfYear(1);
        to = today.with(TemporalAdjusters.lastDayOfYear());
      }
      case TUY_CHINH -> {
        from = parseDate(rawFrom, "tu_ngay");
        to = parseDate(rawTo, "den_ngay");
        if (from.isAfter(to)) {
          throw invalid("tu_ngay không được lớn hơn den_ngay");
        }
      }
      default -> throw invalid("Kỳ thống kê không hợp lệ");
    }
    long length = ChronoUnit.DAYS.between(from, to) + 1;
    LocalDate previousTo = from.minusDays(1);
    LocalDate previousFrom = previousTo.minusDays(length - 1);
    return new DashboardFilter(
        period,
        from,
        to,
        previousFrom,
        previousTo,
        parseChannel(rawChannel),
        !to.isBefore(today));
  }

  private PeriodKind parsePeriod(String rawPeriod, String rawFrom, String rawTo) {
    if (rawPeriod == null || rawPeriod.isBlank()) {
      return hasText(rawFrom) || hasText(rawTo) ? PeriodKind.TUY_CHINH : PeriodKind.HOM_NAY;
    }
    try {
      return PeriodKind.valueOf(rawPeriod.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid(
          "ky chỉ nhận HOM_NAY, HOM_QUA, TUAN_NAY, THANG_NAY, NAM_NAY hoặc TUY_CHINH");
    }
  }

  private LocalDate parseDate(String raw, String field) {
    if (!hasText(raw)) {
      throw invalid("Thiếu " + field + " cho kỳ TUY_CHINH");
    }
    try {
      return LocalDate.parse(raw.trim());
    } catch (DateTimeParseException exception) {
      throw invalid(field + " phải có định dạng YYYY-MM-DD");
    }
  }

  private String parseChannel(String raw) {
    String value = hasText(raw) ? raw.trim().toUpperCase(Locale.ROOT) : "TAT_CA";
    return switch (value) {
      case "TAT_CA" -> null;
      case "ONLINE", "TAI_QUAY" -> value;
      default -> throw invalid("kenh_ban chỉ nhận TAT_CA, ONLINE hoặc TAI_QUAY");
    };
  }

  private Grouping parseGrouping(String raw, PeriodKind period) {
    if (!hasText(raw)) {
      return period == PeriodKind.NAM_NAY ? Grouping.THANG : Grouping.NGAY;
    }
    try {
      return Grouping.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid("nhom_theo chỉ nhận NGAY hoặc THANG");
    }
  }

  private Ranking parseRanking(String raw) {
    if (!hasText(raw)) {
      return Ranking.SO_LUONG_BAN;
    }
    try {
      return Ranking.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid("xep_hang_theo chỉ nhận SO_LUONG_BAN hoặc DOANH_THU_THUAN");
    }
  }

  private int parseLimit(String raw) {
    int value = parseInteger(raw, "limit");
    if (value < 1 || value > MAX_LIMIT) {
      throw invalid("limit phải từ 1 đến 100");
    }
    return value;
  }

  private int parseDays(String raw) {
    int value = parseInteger(raw, "so_ngay_khong_ban");
    if (value < 1 || value > 3650) {
      throw invalid("so_ngay_khong_ban phải từ 1 đến 3650");
    }
    return value;
  }

  private int parseInteger(String raw, String field) {
    try {
      return Integer.parseInt(raw == null ? "" : raw.trim());
    } catch (NumberFormatException exception) {
      throw invalid(field + " phải là số nguyên");
    }
  }

  private Long requireWarehouse() {
    Long warehouseId = repository.findDefaultWarehouseId(configuredWarehouseId);
    if (warehouseId == null) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Không xác định được kho mặc định đang hoạt động");
    }
    return warehouseId;
  }

  private boolean hasInventoryAlert(InventoryRow row) {
    return row.availableStock() <= 0
        || (row.minimumStock() != null && row.availableStock() < row.minimumStock());
  }

  private String inventoryAlert(InventoryRow row) {
    if (row == null || row.availableStock() <= 0) {
      return "HET_HANG";
    }
    if (row.minimumStock() != null && row.availableStock() < row.minimumStock()) {
      return "DUOI_TOI_THIEU";
    }
    return "BINH_THUONG";
  }

  private String comboAlert(Long buildable) {
    return buildable == null || buildable <= 0 ? "HET_HANG" : "BINH_THUONG";
  }

  private boolean isRunningPromotion(
      AdminDashboardRepository.PromotionRow row, LocalDateTime now) {
    return row.active() && !now.isBefore(row.startsAt()) && !now.isAfter(row.endsAt());
  }

  private AdminDashboardResponse.Filter responseFilter(DashboardFilter filter) {
    return new AdminDashboardResponse.Filter(
        filter.from(), filter.to(), channelLabel(filter.channel()), filter.incomplete());
  }

  private String channelLabel(String channel) {
    return channel == null ? "TAT_CA" : channel;
  }

  private Map<String, Long> initializedCounts(List<String> keys) {
    Map<String, Long> result = new LinkedHashMap<>();
    keys.forEach(key -> result.put(key, 0L));
    return result;
  }

  private long count(
      List<AdminDashboardRepository.PurchaseRow> rows,
      java.util.function.Predicate<AdminDashboardRepository.PurchaseRow> predicate) {
    return rows.stream().filter(predicate).count();
  }

  private BigDecimal sum(List<OrderMetric> rows, Function<OrderMetric, BigDecimal> extractor) {
    return rows.stream().map(extractor).reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal money(BigDecimal value) {
    return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal zero() {
    return BigDecimal.ZERO.setScale(2);
  }

  private BigDecimal compact(BigDecimal value) {
    if (value == null) {
      return null;
    }
    BigDecimal compact = value.stripTrailingZeros();
    return compact.scale() < 0 ? compact.setScale(0) : compact;
  }

  private LocalDate today() {
    return LocalDate.now(zone());
  }

  private LocalDateTime nowLocal() {
    return LocalDateTime.now(zone());
  }

  private OffsetDateTime updatedAt() {
    return OffsetDateTime.now(zone());
  }

  private OffsetDateTime offset(LocalDateTime value) {
    return value == null ? null : value.atZone(zone()).toOffsetDateTime();
  }

  private ZoneId zone() {
    return ZoneId.of(dashboardTimeZone);
  }

  private LocalDateTime start(LocalDate date) {
    return date.atStartOfDay();
  }

  private LocalDateTime endExclusive(LocalDate date) {
    return date.plusDays(1).atStartOfDay();
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  public record ExportResult(byte[] content, String filename) {}

  private enum PeriodKind {
    HOM_NAY,
    HOM_QUA,
    TUAN_NAY,
    THANG_NAY,
    NAM_NAY,
    TUY_CHINH
  }

  private enum Grouping {
    NGAY,
    THANG
  }

  private enum Ranking {
    SO_LUONG_BAN,
    DOANH_THU_THUAN
  }

  private record DashboardFilter(
      PeriodKind period,
      LocalDate from,
      LocalDate to,
      LocalDate previousFrom,
      LocalDate previousTo,
      String channel,
      boolean incomplete) {}

  private record LineMetric(
      SalesLineRow source,
      BigDecimal allocatedDiscount,
      BigDecimal netRevenue,
      BigDecimal cost) {}

  private record OrderMetric(
      Long id,
      LocalDateTime date,
      String channel,
      Long customerId,
      String customerName,
      BigDecimal grossRevenue,
      BigDecimal discount,
      BigDecimal returnedAmount,
      BigDecimal netRevenue,
      BigDecimal cost,
      long quantity) {}

  private record SalesAggregate(
      List<LineMetric> lines,
      Map<Long, OrderMetric> orders,
      BigDecimal grossRevenue,
      BigDecimal discount,
      BigDecimal returnedAmount,
      BigDecimal netRevenue,
      BigDecimal cost,
      long soldQuantity) {}

  private static final class ProductAccumulator {

    private final SalesLineRow source;
    private long quantity;
    private long returnedQuantity;
    private BigDecimal netRevenue = BigDecimal.ZERO;

    private ProductAccumulator(SalesLineRow source) {
      this.source = source;
    }
  }

  private record SlowMetric(AdminDashboardRepository.SlowStockRow source, Long days) {}

  private record CustomerMetric(
      Long id, String name, long orderCount, BigDecimal netValue) {}

  private record CashTotals(BigDecimal receipt, BigDecimal disbursement) {}

  private record DateBucket(LocalDate from, LocalDate to) {}
}
