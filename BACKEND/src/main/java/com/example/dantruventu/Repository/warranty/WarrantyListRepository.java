package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Enum.TrangThaiBaoGiaBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiHoaDonBaoHanh;
import com.example.dantruventu.Enum.TrangThaiHoanTienBaoHanh;
import com.example.dantruventu.Enum.TrangThaiThanhToanBaoHanh;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Read model for MySQL 8: aggregate money before filtering and paginating warranty tickets. */
@Repository
@RequiredArgsConstructor
public class WarrantyListRepository {

  private final EntityManager entityManager;

  public Map<Long, Boolean> settlementStatuses(List<Long> tickets) {
    if (tickets.isEmpty()) return Map.of();
    var values =
        entityManager
            .createNativeQuery(
                """
        SELECT h.phieu_bao_hanh_id,
          SUM(CASE WHEN JSON_EXTRACT(h.du_lieu_chi_tiet,'$.doi_soat_nha_cung_cap.da_giai_quyet')=false THEN 1 ELSE 0 END),
          SUM(CASE WHEN JSON_TYPE(JSON_EXTRACT(h.du_lieu_chi_tiet,'$.doi_soat_nha_cung_cap.da_giai_quyet'))='BOOLEAN' THEN 0 ELSE 1 END)
        FROM lich_su_bao_hanh h
        WHERE h.phieu_bao_hanh_id IN (:tickets)
          AND JSON_EXTRACT(h.du_lieu_chi_tiet,'$.doi_soat_nha_cung_cap.phien_ban_du_lieu')=1
          AND NOT EXISTS (SELECT 1 FROM lich_su_bao_hanh n WHERE n.phieu_bao_hanh_id=h.phieu_bao_hanh_id AND n.id>h.id
            AND JSON_EXTRACT(n.du_lieu_chi_tiet,'$.doi_soat_nha_cung_cap.nghia_vu_lich_su_id')=JSON_EXTRACT(h.du_lieu_chi_tiet,'$.doi_soat_nha_cung_cap.nghia_vu_lich_su_id'))
        GROUP BY h.phieu_bao_hanh_id
        """)
            .setParameter("tickets", tickets)
            .getResultList();
    Map<Long, Boolean> result = new LinkedHashMap<>();
    for (Object raw : values) {
      var row = (Object[]) raw;
      if (((Number) row[2]).longValue() != 0) throw invalidStoredData();
      result.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue() > 0);
    }
    return result;
  }

  /*
   * A cancelled invoice keeps its own receipts and refund obligation. Receipts are not silently
   * transferred to a later active invoice. Supplier-only vouchers have no invoice FK and therefore
   * never contribute to customer payment/refund totals.
   *
   * Each CTE has at most one row per invoice or ticket; no fee/history join can multiply the list.
   */
  private static final String READ_MODEL =
      """
      WITH cash_by_invoice AS (
        SELECT cash.hoa_don_bao_hanh_id AS invoice_id,
               SUM(CASE WHEN cash.loai_phieu = 'THU' THEN cash.so_tien ELSE 0 END) AS received,
               SUM(CASE WHEN cash.loai_phieu = 'CHI' THEN cash.so_tien ELSE 0 END) AS refunded,
               SUM(CASE
                   WHEN cash.so_tien IS NULL OR cash.so_tien <= 0
                     OR cash.loai_phieu NOT IN ('THU', 'CHI')
                     OR cash.loai_phieu IS NULL
                     OR (cash.phieu_bao_hanh_id IS NOT NULL
                         AND cash.phieu_bao_hanh_id <> linked_invoice.phieu_bao_hanh_id)
                   THEN 1 ELSE 0 END) AS data_errors
        FROM so_quy_thu_chi cash
        JOIN hoa_don_bao_hanh linked_invoice ON linked_invoice.id = cash.hoa_don_bao_hanh_id
        WHERE cash.trang_thai = 'DA_GHI_NHAN'
        GROUP BY cash.hoa_don_bao_hanh_id
      ), invoice_amounts AS (
        SELECT invoice.id,
               invoice.phieu_bao_hanh_id AS warranty_id,
               invoice.trang_thai,
               invoice.tong_tien,
               COALESCE(cash.received, 0) AS received,
               COALESCE(cash.refunded, 0) AS refunded,
               GREATEST(COALESCE(cash.received, 0)
                        - CASE WHEN invoice.trang_thai = 'HIEU_LUC'
                               THEN invoice.tong_tien ELSE 0 END, 0) AS refund_required,
               GREATEST(COALESCE(cash.received, 0)
                        - CASE WHEN invoice.trang_thai = 'HIEU_LUC'
                               THEN invoice.tong_tien ELSE 0 END
                        - COALESCE(cash.refunded, 0), 0) AS refund_remaining,
               COALESCE(cash.data_errors, 0)
                 + CASE WHEN invoice.tong_tien IS NULL OR invoice.tong_tien < 0
                          OR invoice.trang_thai IS NULL
                          OR invoice.trang_thai NOT IN ('HIEU_LUC', 'HUY')
                        THEN 1 ELSE 0 END
                 + CASE WHEN COALESCE(cash.refunded, 0) > COALESCE(cash.received, 0)
                        THEN 1 ELSE 0 END AS data_errors
        FROM hoa_don_bao_hanh invoice
        LEFT JOIN cash_by_invoice cash ON cash.invoice_id = invoice.id
      ), invoice_summary AS (
        SELECT warranty_id,
               SUM(CASE WHEN trang_thai = 'HIEU_LUC' THEN 1 ELSE 0 END) AS active_count,
               MAX(CASE WHEN trang_thai = 'HIEU_LUC' THEN id END) AS active_id,
               MAX(CASE WHEN trang_thai = 'HUY' THEN id END) AS cancelled_id,
               SUM(CASE WHEN trang_thai = 'HIEU_LUC'
                        THEN received - refunded ELSE 0 END) AS active_net_received,
               SUM(CASE WHEN trang_thai = 'HIEU_LUC' THEN tong_tien ELSE 0 END) AS active_total,
               SUM(refund_required) AS refund_required,
               SUM(refund_remaining) AS refund_remaining,
               SUM(refunded) AS refunded,
               SUM(data_errors) AS data_errors
        FROM invoice_amounts
        GROUP BY warranty_id
      ), warranty_rows AS (
        SELECT warranty.id,
               warranty.ma_phieu,
               warranty.don_hang_id,
               orders.ma_don_hang,
               warranty.khach_hang_id,
               warranty.ten_nguoi_lien_he,
               warranty.sdt_nguoi_lien_he,
               product.ten_san_pham,
               device.ma_theo_doi,
               serial.so_serial,
               warranty.trang_thai_xu_ly,
               warranty.trang_thai_bao_gia,
               CASE WHEN COALESCE(summary.active_count, 0) = 0 THEN NULL
                    WHEN summary.active_net_received >= summary.active_total
                      THEN 'DA_THANH_TOAN'
                    WHEN summary.active_net_received > 0 THEN 'THANH_TOAN_MOT_PHAN'
                    ELSE 'CHUA_THANH_TOAN' END AS trang_thai_thanh_toan,
               CASE WHEN COALESCE(summary.refund_required, 0) = 0 THEN 'KHONG_CAN_HOAN'
                    WHEN summary.refund_remaining = 0 THEN 'DA_HOAN'
                    WHEN summary.refunded > 0 THEN 'HOAN_MOT_PHAN'
                    ELSE 'CHO_HOAN' END AS trang_thai_hoan_tien,
               warranty.ngay_tiep_nhan,
               warranty.ngay_cap_nhat,
               selected_invoice.id AS hoa_don_id,
               selected_invoice.trang_thai AS trang_thai_hoa_don,
               COALESCE(summary.refund_remaining, 0) AS con_phai_hoan,
               COALESCE(summary.active_count, 0) AS active_invoice_count,
               COALESCE(summary.data_errors, 0) AS data_error_count
        FROM phieu_bao_hanh warranty
        JOIN don_hang orders ON orders.id = warranty.don_hang_id
        JOIN thiet_bi_bao_hanh device ON device.id = warranty.thiet_bi_id
        JOIN phien_ban_san_pham variant ON variant.id = device.phien_ban_id
        JOIN san_pham product ON product.id = variant.san_pham_id
        LEFT JOIN so_serial_san_pham serial
          ON serial.id = COALESCE(warranty.so_serial_id, device.so_serial_id)
        LEFT JOIN invoice_summary summary ON summary.warranty_id = warranty.id
        LEFT JOIN hoa_don_bao_hanh selected_invoice
          ON selected_invoice.id = COALESCE(summary.active_id, summary.cancelled_id)
      )
      """;

  private static final String SELECT_COLUMNS =
      """
      SELECT results.id, results.ma_phieu, results.don_hang_id, results.ma_don_hang,
             results.khach_hang_id, results.ten_nguoi_lien_he, results.sdt_nguoi_lien_he,
             results.ten_san_pham, results.ma_theo_doi, results.so_serial,
             results.trang_thai_xu_ly, results.trang_thai_bao_gia,
             results.trang_thai_thanh_toan, results.trang_thai_hoan_tien,
             results.ngay_tiep_nhan, results.ngay_cap_nhat, results.hoa_don_id,
             results.trang_thai_hoa_don, results.con_phai_hoan,
             results.active_invoice_count, results.data_error_count
      FROM warranty_rows results
      """;

  public record Filter(
      String keyword,
      TrangThaiBaoHanh processingStatus,
      TrangThaiBaoGiaBaoHanh quoteStatus,
      TrangThaiThanhToanBaoHanh paymentStatus,
      TrangThaiHoanTienBaoHanh refundStatus,
      LocalDateTime startInclusive,
      LocalDateTime endExclusive) {}

  public record Row(
      Long id,
      String maPhieu,
      Long donHangId,
      String maDonHang,
      Long khachHangId,
      String tenNguoiLienHe,
      String sdtNguoiLienHe,
      String tenSanPham,
      String maTheoDoi,
      String soSerial,
      TrangThaiBaoHanh processingStatus,
      TrangThaiBaoGiaBaoHanh quoteStatus,
      TrangThaiThanhToanBaoHanh paymentStatus,
      TrangThaiHoanTienBaoHanh refundStatus,
      LocalDateTime ngayTiepNhan,
      LocalDateTime ngayCapNhat,
      Long hoaDonId,
      TrangThaiHoaDonBaoHanh invoiceStatus,
      BigDecimal conPhaiHoan,
      long activeInvoiceCount) {}

  @Transactional(readOnly = true)
  public Page<Row> findAll(Filter filter, Pageable pageable) {
    Map<String, Object> parameters = new LinkedHashMap<>();
    String predicate = predicate(filter, parameters);
    Query countQuery =
        entityManager.createNativeQuery(
            READ_MODEL
                + """
                SELECT COUNT(DISTINCT results.id),
                       COALESCE(SUM(results.data_error_count
                         + CASE WHEN results.active_invoice_count > 1 THEN 1 ELSE 0 END), 0)
                FROM warranty_rows results
                """
                + predicate);
    bind(countQuery, parameters);
    Object rawCount = countQuery.getSingleResult();
    if (!(rawCount instanceof Object[] counts)
        || counts.length != 2
        || requiredNumber(counts[1]).longValue() != 0) {
      throw invalidStoredData();
    }
    long total = requiredNumber(counts[0]).longValue();
    if (total == 0) {
      return new PageImpl<>(List.of(), pageable, 0);
    }

    Query itemQuery =
        entityManager.createNativeQuery(
            READ_MODEL
                + SELECT_COLUMNS
                + predicate
                + " ORDER BY results.ngay_tiep_nhan DESC, results.id DESC");
    bind(itemQuery, parameters);
    itemQuery.setFirstResult(Math.toIntExact(pageable.getOffset()));
    itemQuery.setMaxResults(pageable.getPageSize());
    List<?> rawRows = itemQuery.getResultList();
    List<Row> rows = new ArrayList<>(rawRows.size());
    for (Object rawRow : rawRows) {
      if (!(rawRow instanceof Object[] values) || values.length != 21) {
        throw invalidStoredData();
      }
      rows.add(row(values));
    }
    return new PageImpl<>(rows, pageable, total);
  }

  private static String predicate(Filter filter, Map<String, Object> parameters) {
    StringBuilder where = new StringBuilder(" WHERE 1 = 1");
    if (filter.keyword() != null && !filter.keyword().isBlank()) {
      where.append(
          """
           AND (LOWER(results.ma_phieu) LIKE LOWER(:keywordPattern) ESCAPE '!'
                OR LOWER(results.so_serial) LIKE LOWER(:keywordPattern) ESCAPE '!'
                OR LOWER(results.ma_theo_doi) LIKE LOWER(:keywordPattern) ESCAPE '!'
                OR LOWER(results.ten_nguoi_lien_he) LIKE LOWER(:keywordPattern) ESCAPE '!'
                OR LOWER(results.sdt_nguoi_lien_he) LIKE LOWER(:keywordPattern) ESCAPE '!')
          """);
      // An explicit '!' escape makes a bound backslash literal, independent of SQL literal modes.
      String literal =
          filter.keyword().strip().replace("!", "!!").replace("%", "!%").replace("_", "!_");
      parameters.put("keywordPattern", "%" + literal + "%");
    }
    enumFilter(
        where, parameters, "trang_thai_xu_ly", "processingStatus", filter.processingStatus());
    enumFilter(where, parameters, "trang_thai_bao_gia", "quoteStatus", filter.quoteStatus());
    enumFilter(where, parameters, "trang_thai_thanh_toan", "paymentStatus", filter.paymentStatus());
    enumFilter(where, parameters, "trang_thai_hoan_tien", "refundStatus", filter.refundStatus());
    if (filter.startInclusive() != null) {
      where.append(" AND results.ngay_tiep_nhan >= :startInclusive");
      parameters.put("startInclusive", filter.startInclusive());
    }
    if (filter.endExclusive() != null) {
      where.append(" AND results.ngay_tiep_nhan < :endExclusive");
      parameters.put("endExclusive", filter.endExclusive());
    }
    return where.toString();
  }

  private static void enumFilter(
      StringBuilder where,
      Map<String, Object> parameters,
      String column,
      String parameter,
      Enum<?> value) {
    if (value != null) {
      where.append(" AND results.").append(column).append(" = :").append(parameter);
      parameters.put(parameter, value.name());
    }
  }

  private static void bind(Query query, Map<String, Object> parameters) {
    parameters.forEach(query::setParameter);
  }

  private static Row row(Object[] values) {
    if (requiredNumber(values[20]).longValue() != 0) {
      throw invalidStoredData();
    }
    return new Row(
        requiredNumber(values[0]).longValue(),
        string(values[1]),
        requiredNumber(values[2]).longValue(),
        string(values[3]),
        nullableLong(values[4]),
        string(values[5]),
        string(values[6]),
        string(values[7]),
        string(values[8]),
        string(values[9]),
        enumValue(values[10], TrangThaiBaoHanh.class),
        enumValue(values[11], TrangThaiBaoGiaBaoHanh.class),
        enumValue(values[12], TrangThaiThanhToanBaoHanh.class),
        enumValue(values[13], TrangThaiHoanTienBaoHanh.class),
        dateTime(values[14]),
        dateTime(values[15]),
        nullableLong(values[16]),
        enumValue(values[17], TrangThaiHoaDonBaoHanh.class),
        decimal(values[18]),
        requiredNumber(values[19]).longValue());
  }

  private static Number requiredNumber(Object value) {
    if (value instanceof Number number) {
      return number;
    }
    throw invalidStoredData();
  }

  private static Long nullableLong(Object value) {
    return value == null ? null : requiredNumber(value).longValue();
  }

  private static String string(Object value) {
    return value == null ? null : value.toString();
  }

  private static BigDecimal decimal(Object value) {
    return value instanceof BigDecimal decimal
        ? decimal
        : new BigDecimal(requiredNumber(value).toString());
  }

  private static LocalDateTime dateTime(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof LocalDateTime dateTime) {
      return dateTime;
    }
    if (value instanceof Timestamp timestamp) {
      return timestamp.toLocalDateTime();
    }
    throw invalidStoredData();
  }

  private static <E extends Enum<E>> E enumValue(Object value, Class<E> enumType) {
    if (value == null) {
      return null;
    }
    try {
      return Enum.valueOf(enumType, value.toString());
    } catch (IllegalArgumentException exception) {
      throw invalidStoredData();
    }
  }

  private static AppException invalidStoredData() {
    return new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
  }
}
