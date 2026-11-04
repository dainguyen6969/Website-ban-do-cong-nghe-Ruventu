package com.example.dantruventu.Services.warehouse;

import com.example.dantruventu.Entity.DonNhapHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NccAccountingService {

  private static final BigDecimal MAX = new BigDecimal("9999999999999.99");

  private final JdbcTemplate jdbc;

  public BigDecimal adjustments(Long poId) {
    return jdbc.queryForObject(
        """
                SELECT COALESCE(SUM(delta), 0)
                FROM ncc_adjustment
                WHERE source_po_id = ?
                """,
        BigDecimal.class,
        poId);
  }

  public BigDecimal caseAdjustments(Long caseId) {
    return jdbc.queryForObject(
        """
                SELECT COALESCE(SUM(a.delta), 0)
                FROM ncc_adjustment a
                JOIN ncc_event e ON e.id = a.event_id
                WHERE e.case_id = ?
                """,
        BigDecimal.class,
        caseId);
  }

  public BigDecimal caseFees(Long caseId) {
    return jdbc.queryForObject(
        """
                SELECT COALESCE(SUM(a.fee), 0)
                FROM ncc_adjustment a
                JOIN ncc_event e ON e.id = a.event_id
                WHERE e.case_id = ?
                """,
        BigDecimal.class,
        caseId);
  }

  public BigDecimal effectiveTotal(DonNhapHang order, BigDecimal legacyReturned) {
    BigDecimal result =
        order.getTongTien().subtract(legacyReturned).add(adjustments(order.getId()));

    if (result.signum() < 0 || result.compareTo(MAX) > 0) {
      throw new AppException(
          ErrorCode.CONFLICT, "Nghĩa vụ thanh toán NCC sau điều chỉnh không hợp lệ; cần đối soát.");
    }

    return result;
  }

  public int originalAssigned(Long poId, Long variantId) {
    return countRoots(poId, variantId, "ORIGINAL");
  }

  public int legacyExtraAssigned(Long poId, Long variantId) {
    return countRoots(poId, variantId, "LEGACY_EXTRA");
  }

  private int countRoots(Long poId, Long variantId, String origin) {
    return jdbc.queryForObject(
        """
                SELECT COUNT(*)
                FROM ncc_unit u
                JOIN ncc_case c ON c.id = u.case_id
                JOIN chi_tiet_don_nhap d ON d.id = u.source_line_id
                WHERE c.source_po_id = ?
                  AND d.phien_ban_id = ?
                  AND u.parent_id IS NULL
                  AND u.origin = ?
                """,
        Integer.class,
        poId,
        variantId,
        origin);
  }

  public int legacyAssigned(Long poId, Long variantId) {
    return originalAssigned(poId, variantId) + legacyExtraAssigned(poId, variantId);
  }

  public int finalReturned(Long poId, Long variantId) {
    return jdbc.queryForObject(
        """
                SELECT COUNT(*)
                FROM ncc_unit u
                JOIN ncc_case c ON c.id = u.case_id
                JOIN chi_tiet_don_nhap d ON d.id = u.source_line_id
                WHERE c.source_po_id = ?
                  AND d.phien_ban_id = ?
                  AND u.status = 'DA_TRA_NCC'
                  AND u.origin <> 'EXTRA'
                """,
        Integer.class,
        poId,
        variantId);
  }

  public boolean trackedSerial(Long serialId) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            """
                        SELECT (
                          EXISTS (
                            SELECT 1 FROM ncc_unit
                            WHERE initial_serial_id = ? OR serial_id = ?
                          )
                          OR EXISTS (
                            SELECT 1 FROM ncc_event
                            WHERE old_serial_id = ? OR new_serial_id = ?
                          )
                        )
                        """,
            Boolean.class,
            serialId,
            serialId,
            serialId,
            serialId));
  }

  public boolean pendingSerial(Long serialId) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            """
                        SELECT EXISTS (
                          SELECT 1 FROM ncc_unit
                          WHERE serial_id = ?
                            AND status IN ('DANG_O_NCC', 'DA_NHAN_LOI')
                        )
                        """,
            Boolean.class,
            serialId));
  }

  public List<Map<String, Object>> serialHistory(Long serialId) {
    return jdbc.queryForList(
        """
                SELECT
                  e.id,
                  c.id AS case_id,
                  c.source_po_id,
                  c.code,
                  e.action,
                  e.document,
                  e.note,
                  old_s.so_serial AS old_serial,
                  new_s.so_serial AS new_serial,
                  n.ho_ten AS actor_name,
                  DATE_FORMAT(e.occurred_at, '%Y-%m-%dT%H:%i:%s+07:00') AS occurred_at
                FROM ncc_event e
                JOIN ncc_case c ON c.id = e.case_id
                JOIN ncc_unit u ON u.id = e.unit_id
                JOIN nguoi_dung n ON n.id = e.actor_id
                LEFT JOIN so_serial_san_pham old_s ON old_s.id = e.old_serial_id
                LEFT JOIN so_serial_san_pham new_s ON new_s.id = e.new_serial_id
                WHERE u.root_id IN (
                  SELECT x.root_id
                  FROM ncc_unit x
                  WHERE x.initial_serial_id = ? OR x.serial_id = ?
                  UNION
                  SELECT x.root_id
                  FROM ncc_event z
                  JOIN ncc_unit x ON x.id = z.unit_id
                  WHERE z.old_serial_id = ? OR z.new_serial_id = ?
                )
                ORDER BY e.id
                """,
        serialId, serialId, serialId, serialId);
  }
}
