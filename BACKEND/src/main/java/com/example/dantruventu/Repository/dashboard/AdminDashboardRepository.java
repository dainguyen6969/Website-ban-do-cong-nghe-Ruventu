package com.example.dantruventu.Repository.dashboard;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AdminDashboardRepository {

  private final NamedParameterJdbcTemplate jdbc;

  public List<SalesLineRow> findSalesLines(
      LocalDateTime startInclusive, LocalDateTime endExclusive, String channel) {
    String sql =
        """
        SELECT line.id AS line_id,
               orders.id AS order_id,
               orders.ngay_tao,
               orders.loai_don_hang,
               orders.khach_hang_id,
               customer.ho_ten AS customer_name,
               COALESCE(orders.tien_chiet_khau, 0) AS order_discount,
               product.id AS product_id,
               variant.id AS variant_id,
               product.ten_san_pham,
               variant.ten_phien_ban,
               variant.ma_vach,
               product.loai_san_pham,
               line.so_luong,
               COALESCE(line.thanh_tien, 0) AS line_total,
               COALESCE(variant.gia_nhap, 0) AS current_cost,
               COALESCE(SUM(CASE
                   WHEN return_slip.trang_thai_tra_hang IN ('DA_NHAN_HANG', 'DA_HOAN_TIEN')
                   THEN return_line.so_luong ELSE 0 END), 0) AS returned_quantity,
               COALESCE(SUM(CASE
                   WHEN return_slip.trang_thai_tra_hang IN ('DA_NHAN_HANG', 'DA_HOAN_TIEN')
                   THEN return_line.thanh_tien_hoan ELSE 0 END), 0) AS returned_amount
        FROM chi_tiet_don_hang line
        JOIN don_hang orders ON orders.id = line.don_hang_id
        JOIN phien_ban_san_pham variant ON variant.id = line.phien_ban_id
        JOIN san_pham product ON product.id = variant.san_pham_id
        LEFT JOIN nguoi_dung customer ON customer.id = orders.khach_hang_id
        LEFT JOIN chi_tiet_tra_hang return_line ON return_line.chi_tiet_don_hang_id = line.id
        LEFT JOIN phieu_tra_hang return_slip ON return_slip.id = return_line.phieu_tra_hang_id
        WHERE orders.trang_thai_don_hang = 'HOAN_THANH'
          AND orders.trang_thai_thanh_toan = 'DA_THANH_TOAN'
          AND orders.trang_thai_xuat_kho IN ('DA_XUAT_KHO', 'DA_HOAN_KHO')
          AND orders.ngay_tao >= :startInclusive
          AND orders.ngay_tao < :endExclusive
          AND (:channel IS NULL OR orders.loai_don_hang = :channel)
        GROUP BY line.id, orders.id, orders.ngay_tao, orders.loai_don_hang,
                 orders.khach_hang_id, customer.ho_ten, orders.tien_chiet_khau,
                 product.id, variant.id, product.ten_san_pham, variant.ten_phien_ban,
                 variant.ma_vach, product.loai_san_pham, line.so_luong,
                 line.thanh_tien, variant.gia_nhap
        ORDER BY orders.id, line.id
        """;
    return jdbc.query(sql, periodParams(startInclusive, endExclusive, channel), this::salesLine);
  }

  public List<TaskOrderRow> findTaskOrders(String channel) {
    String sql =
        """
        SELECT id, ma_don_hang, trang_thai_don_hang, ngay_tao
        FROM don_hang
        WHERE trang_thai_don_hang IN
              ('CHO_DUYET', 'CHO_THANH_TOAN', 'CHO_DONG_GOI', 'CHO_LAY_HANG',
               'DANG_GIAO_HANG')
          AND (:channel IS NULL OR loai_don_hang = :channel)
        ORDER BY ngay_tao, id
        """;
    return jdbc.query(
        sql,
        new MapSqlParameterSource("channel", channel),
        (rs, row) ->
            new TaskOrderRow(
                rs.getLong("id"),
                rs.getString("ma_don_hang"),
                rs.getString("trang_thai_don_hang"),
                localDateTime(rs, "ngay_tao")));
  }

  public List<DeliveryRow> findCurrentDeliveryIssues(String channel) {
    String sql =
        """
        SELECT delivery.don_hang_id, delivery.trang_thai_giao_hang
        FROM phieu_giao_hang delivery
        JOIN don_hang orders ON orders.id = delivery.don_hang_id
        JOIN (
          SELECT don_hang_id, MAX(id) AS latest_id
          FROM phieu_giao_hang
          GROUP BY don_hang_id
        ) latest ON latest.latest_id = delivery.id
        WHERE delivery.trang_thai_giao_hang IN ('GIAO_THAT_BAI', 'CHO_HOAN_HANG')
          AND orders.trang_thai_don_hang NOT IN ('HOAN_THANH', 'HUY_HANG')
          AND orders.trang_thai_xuat_kho <> 'DA_HOAN_KHO'
          AND (:channel IS NULL OR orders.loai_don_hang = :channel)
        """;
    return jdbc.query(
        sql,
        new MapSqlParameterSource("channel", channel),
        (rs, row) ->
            new DeliveryRow(rs.getLong("don_hang_id"), rs.getString("trang_thai_giao_hang")));
  }

  public List<ReturnRow> findReturns(String channel) {
    String sql =
        """
        SELECT return_slip.id, return_slip.trang_thai_tra_hang, return_slip.tong_tien_hoan
        FROM phieu_tra_hang return_slip
        JOIN don_hang orders ON orders.id = return_slip.don_hang_id
        WHERE (:channel IS NULL OR orders.loai_don_hang = :channel)
        """;
    return jdbc.query(
        sql,
        new MapSqlParameterSource("channel", channel),
        (rs, row) ->
            new ReturnRow(
                rs.getLong("id"),
                rs.getString("trang_thai_tra_hang"),
                money(rs.getBigDecimal("tong_tien_hoan"))));
  }

  public List<CashRow> findCashRows(LocalDateTime startInclusive, LocalDateTime endExclusive) {
    String sql =
        """
        SELECT ngay_ghi_nhan, loai_phieu, phuong_thuc_thanh_toan, so_tien
        FROM so_quy_thu_chi
        WHERE trang_thai = 'DA_GHI_NHAN'
          AND ngay_ghi_nhan >= :startInclusive
          AND ngay_ghi_nhan < :endExclusive
        ORDER BY ngay_ghi_nhan, id
        """;
    MapSqlParameterSource parameters =
        new MapSqlParameterSource()
            .addValue("startInclusive", startInclusive)
            .addValue("endExclusive", endExclusive);
    return jdbc.query(
        sql,
        parameters,
        (rs, row) ->
            new CashRow(
                localDateTime(rs, "ngay_ghi_nhan"),
                rs.getString("loai_phieu"),
                rs.getString("phuong_thuc_thanh_toan"),
                money(rs.getBigDecimal("so_tien"))));
  }

  public BigDecimal currentCashBalance() {
    String sql =
        """
        SELECT COALESCE(SUM(CASE WHEN loai_phieu = 'THU' THEN so_tien ELSE -so_tien END), 0)
        FROM so_quy_thu_chi
        WHERE trang_thai = 'DA_GHI_NHAN'
        """;
    return money(jdbc.getJdbcTemplate().queryForObject(sql, BigDecimal.class));
  }

  public long countActiveEmployees() {
    String sql =
        """
        SELECT COUNT(*)
        FROM nguoi_dung user_account
        JOIN vai_tro user_role ON user_role.id = user_account.vai_tro_id
        WHERE user_account.trang_thai = 1
          AND UPPER(TRIM(user_role.ten_vai_tro)) NOT IN
              ('USER', 'KHACH_HANG', 'KHACH HANG', 'KHÁCH HÀNG')
        """;
    return scalarLong(sql, Map.of());
  }

  public Long findDefaultWarehouseId(long configuredWarehouseId) {
    String sql;
    MapSqlParameterSource parameters = new MapSqlParameterSource();
    if (configuredWarehouseId > 0) {
      sql = "SELECT id FROM kho_hang WHERE id = :id AND trang_thai = 1";
      parameters.addValue("id", configuredWarehouseId);
    } else {
      sql = "SELECT id FROM kho_hang WHERE trang_thai = 1 ORDER BY id LIMIT 1";
    }
    List<Long> ids = jdbc.query(sql, parameters, (rs, row) -> rs.getLong(1));
    return ids.isEmpty() ? null : ids.get(0);
  }

  public List<InventoryRow> findInventoryRows(Long warehouseId) {
    String sql =
        """
        SELECT variant.id AS variant_id,
               product.id AS product_id,
               product.ten_san_pham,
               variant.ten_phien_ban,
               product.loai_san_pham,
               product.trang_thai AS product_status,
               variant.trang_thai AS variant_status,
               COALESCE(SUM(stock.ton_thuc_te), 0) AS physical_stock,
               COALESCE(SUM(stock.ton_co_the_ban), 0) AS available_stock,
               MAX(stock.muc_ton_toi_thieu) AS minimum_stock,
               COALESCE(variant.gia_nhap, 0) AS current_cost
        FROM phien_ban_san_pham variant
        JOIN san_pham product ON product.id = variant.san_pham_id
        LEFT JOIN ton_kho stock
          ON stock.phien_ban_id = variant.id AND stock.kho_hang_id = :warehouseId
        WHERE product.loai_san_pham = 'DON'
        GROUP BY variant.id, product.id, product.ten_san_pham, variant.ten_phien_ban,
                 product.loai_san_pham, product.trang_thai, variant.trang_thai,
                 variant.gia_nhap
        ORDER BY variant.id
        """;
    return jdbc.query(
        sql,
        new MapSqlParameterSource("warehouseId", warehouseId),
        (rs, row) ->
            new InventoryRow(
                rs.getLong("variant_id"),
                rs.getLong("product_id"),
                rs.getString("ten_san_pham"),
                rs.getString("ten_phien_ban"),
                rs.getString("loai_san_pham"),
                rs.getInt("product_status") == 1,
                rs.getInt("variant_status") == 1,
                rs.getLong("physical_stock"),
                rs.getLong("available_stock"),
                nullableInteger(rs, "minimum_stock"),
                money(rs.getBigDecimal("current_cost"))));
  }

  public List<SlowStockRow> findSlowStockRows(Long warehouseId) {
    String sql =
        """
        SELECT variant.id AS variant_id,
               product.ten_san_pham,
               variant.ten_phien_ban,
               COALESCE(SUM(stock.ton_thuc_te), 0) AS physical_stock,
               sales.last_sale
        FROM phien_ban_san_pham variant
        JOIN san_pham product ON product.id = variant.san_pham_id
        JOIN ton_kho stock
          ON stock.phien_ban_id = variant.id AND stock.kho_hang_id = :warehouseId
        LEFT JOIN (
          SELECT phien_ban_id, MAX(ngay_tao) AS last_sale
          FROM the_kho
          WHERE kho_hang_id = :warehouseId AND loai_giao_dich = 'XUAT_BAN'
          GROUP BY phien_ban_id
        ) sales ON sales.phien_ban_id = variant.id
        WHERE product.loai_san_pham = 'DON'
        GROUP BY variant.id, product.ten_san_pham, variant.ten_phien_ban, sales.last_sale
        HAVING COALESCE(SUM(stock.ton_thuc_te), 0) > 0
        """;
    return jdbc.query(
        sql,
        new MapSqlParameterSource("warehouseId", warehouseId),
        (rs, row) ->
            new SlowStockRow(
                rs.getLong("variant_id"),
                rs.getString("ten_san_pham"),
                rs.getString("ten_phien_ban"),
                rs.getLong("physical_stock"),
                localDateTime(rs, "last_sale")));
  }

  public Map<Long, Long> findComboCapacities(Long warehouseId) {
    String sql =
        """
        SELECT component.san_pham_combo_id,
               MIN(FLOOR(COALESCE(stock.available_stock, 0) / component.so_luong)) AS capacity
        FROM thanh_phan_combo component
        LEFT JOIN (
          SELECT phien_ban_id, SUM(ton_co_the_ban) AS available_stock
          FROM ton_kho
          WHERE kho_hang_id = :warehouseId
          GROUP BY phien_ban_id
        ) stock ON stock.phien_ban_id = component.phien_ban_thanh_phan_id
        WHERE component.so_luong > 0
        GROUP BY component.san_pham_combo_id
        """;
    return jdbc.query(
            sql,
            new MapSqlParameterSource("warehouseId", warehouseId),
            (rs, row) ->
                Map.entry(rs.getLong("san_pham_combo_id"), rs.getLong("capacity")))
        .stream()
        .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  public long countActiveProducts() {
    return scalarLong("SELECT COUNT(*) FROM san_pham WHERE trang_thai = 1", Map.of());
  }

  public long countActiveVariants() {
    return scalarLong(
        """
        SELECT COUNT(*)
        FROM phien_ban_san_pham variant
        JOIN san_pham product ON product.id = variant.san_pham_id
        WHERE variant.trang_thai = 1 AND product.trang_thai = 1
        """,
        Map.of());
  }

  public List<PurchaseRow> findPurchaseRows() {
    String sql = "SELECT trang_thai_nhap, trang_thai_thanh_toan FROM don_nhap_hang";
    return jdbc.getJdbcTemplate()
        .query(
            sql,
            (rs, row) ->
                new PurchaseRow(
                    rs.getString("trang_thai_nhap"),
                    rs.getString("trang_thai_thanh_toan")));
  }

  public long countCustomers() {
    return scalarLong(customerCountSql(false), Map.of());
  }

  public long countNewCustomers(LocalDateTime startInclusive, LocalDateTime endExclusive) {
    return scalarLong(
        customerCountSql(true),
        Map.of("startInclusive", startInclusive, "endExclusive", endExclusive));
  }

  public BigDecimal currentUnpaidOrderValue(String channel) {
    String sql =
        """
        SELECT COALESCE(SUM(tong_thanh_toan), 0)
        FROM don_hang
        WHERE trang_thai_thanh_toan = 'CHUA_THANH_TOAN'
          AND trang_thai_don_hang NOT IN ('CHO_DUYET', 'HUY_HANG')
          AND trang_thai_xuat_kho <> 'DA_HOAN_KHO'
          AND (:channel IS NULL OR loai_don_hang = :channel)
        """;
    return scalarMoney(sql, new MapSqlParameterSource("channel", channel));
  }

  public BigDecimal currentCodInTransit(String channel) {
    String sql =
        """
        SELECT COALESCE(SUM(delivery.tien_thu_ho_cod), 0)
        FROM phieu_giao_hang delivery
        JOIN don_hang orders ON orders.id = delivery.don_hang_id
        JOIN (
          SELECT don_hang_id, MAX(id) AS latest_id
          FROM phieu_giao_hang
          GROUP BY don_hang_id
        ) latest ON latest.latest_id = delivery.id
        WHERE delivery.trang_thai_giao_hang IN ('DA_NHAN_HANG', 'DANG_GIAO')
          AND orders.trang_thai_thanh_toan = 'CHUA_THANH_TOAN'
          AND orders.trang_thai_don_hang <> 'HUY_HANG'
          AND orders.trang_thai_xuat_kho <> 'DA_HOAN_KHO'
          AND (:channel IS NULL OR orders.loai_don_hang = :channel)
        """;
    return scalarMoney(sql, new MapSqlParameterSource("channel", channel));
  }

  public List<StatusCountRow> findWarrantyStatusCounts(String channel) {
    String sql =
        """
        SELECT warranty.trang_thai_xu_ly AS status, COUNT(*) AS total
        FROM phieu_bao_hanh warranty
        JOIN don_hang orders ON orders.id = warranty.don_hang_id
        WHERE (:channel IS NULL OR orders.loai_don_hang = :channel)
        GROUP BY warranty.trang_thai_xu_ly
        """;
    return statusCounts(sql, channel);
  }

  public List<PromotionRow> findPromotions() {
    String sql =
        """
        SELECT ngay_bat_dau, ngay_ket_thuc, trang_thai,
               so_luong_ap_dung, COALESCE(so_luong_da_dung, 0) AS used_count
        FROM khuyen_mai
        """;
    return jdbc.getJdbcTemplate()
        .query(
            sql,
            (rs, row) ->
                new PromotionRow(
                    localDateTime(rs, "ngay_bat_dau"),
                    localDateTime(rs, "ngay_ket_thuc"),
                    rs.getInt("trang_thai") == 1,
                    nullableInteger(rs, "so_luong_ap_dung"),
                    rs.getLong("used_count")));
  }

  private List<StatusCountRow> statusCounts(String sql, String channel) {
    return jdbc.query(
        sql,
        new MapSqlParameterSource("channel", channel),
        (rs, row) -> new StatusCountRow(rs.getString("status"), rs.getLong("total")));
  }

  private String customerCountSql(boolean filterDate) {
    return """
        SELECT COUNT(*)
        FROM nguoi_dung user_account
        JOIN vai_tro user_role ON user_role.id = user_account.vai_tro_id
        WHERE UPPER(TRIM(user_role.ten_vai_tro)) IN
              ('USER', 'KHACH_HANG', 'KHACH HANG', 'KHÁCH HÀNG')
        """
        + (filterDate
            ? " AND user_account.ngay_tao >= :startInclusive"
                + " AND user_account.ngay_tao < :endExclusive"
            : "");
  }

  private MapSqlParameterSource periodParams(
      LocalDateTime startInclusive, LocalDateTime endExclusive, String channel) {
    return new MapSqlParameterSource()
        .addValue("startInclusive", startInclusive)
        .addValue("endExclusive", endExclusive)
        .addValue("channel", channel);
  }

  private SalesLineRow salesLine(ResultSet rs, int row) throws SQLException {
    return new SalesLineRow(
        rs.getLong("line_id"),
        rs.getLong("order_id"),
        localDateTime(rs, "ngay_tao"),
        rs.getString("loai_don_hang"),
        nullableLong(rs, "khach_hang_id"),
        rs.getString("customer_name"),
        money(rs.getBigDecimal("order_discount")),
        rs.getLong("product_id"),
        rs.getLong("variant_id"),
        rs.getString("ten_san_pham"),
        rs.getString("ten_phien_ban"),
        rs.getString("ma_vach"),
        rs.getString("loai_san_pham"),
        rs.getInt("so_luong"),
        money(rs.getBigDecimal("line_total")),
        money(rs.getBigDecimal("current_cost")),
        rs.getLong("returned_quantity"),
        money(rs.getBigDecimal("returned_amount")));
  }

  private long scalarLong(String sql, Map<String, ?> values) {
    Long value = jdbc.queryForObject(sql, new MapSqlParameterSource(values), Long.class);
    return value == null ? 0L : value;
  }

  private BigDecimal scalarMoney(String sql, MapSqlParameterSource parameters) {
    return money(jdbc.queryForObject(sql, parameters, BigDecimal.class));
  }

  private BigDecimal money(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private LocalDateTime localDateTime(ResultSet rs, String column) throws SQLException {
    Timestamp value = rs.getTimestamp(column);
    return value == null ? null : value.toLocalDateTime();
  }

  private Long nullableLong(ResultSet rs, String column) throws SQLException {
    long value = rs.getLong(column);
    return rs.wasNull() ? null : value;
  }

  private Integer nullableInteger(ResultSet rs, String column) throws SQLException {
    int value = rs.getInt(column);
    return rs.wasNull() ? null : value;
  }

  public record SalesLineRow(
      Long lineId,
      Long orderId,
      LocalDateTime orderDate,
      String channel,
      Long customerId,
      String customerName,
      BigDecimal orderDiscount,
      Long productId,
      Long variantId,
      String productName,
      String variantName,
      String barcode,
      String productType,
      int quantity,
      BigDecimal lineTotal,
      BigDecimal currentCost,
      long returnedQuantity,
      BigDecimal returnedAmount) {}

  public record TaskOrderRow(Long id, String code, String status, LocalDateTime createdAt) {}

  public record DeliveryRow(Long orderId, String status) {}

  public record ReturnRow(Long id, String status, BigDecimal amount) {}

  public record CashRow(
      LocalDateTime recordedAt, String type, String paymentMethod, BigDecimal amount) {}

  public record InventoryRow(
      Long variantId,
      Long productId,
      String productName,
      String variantName,
      String productType,
      boolean activeProduct,
      boolean activeVariant,
      long physicalStock,
      long availableStock,
      Integer minimumStock,
      BigDecimal currentCost) {}

  public record SlowStockRow(
      Long variantId,
      String productName,
      String variantName,
      long physicalStock,
      LocalDateTime lastSale) {}

  public record PurchaseRow(String purchaseStatus, String paymentStatus) {}

  public record StatusCountRow(String status, long total) {}

  public record PromotionRow(
      LocalDateTime startsAt,
      LocalDateTime endsAt,
      boolean active,
      Integer applicationLimit,
      long usedCount) {}
}
