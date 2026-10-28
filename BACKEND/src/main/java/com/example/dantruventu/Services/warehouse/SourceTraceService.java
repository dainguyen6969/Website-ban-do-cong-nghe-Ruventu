package com.example.dantruventu.Services.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderReceiveRequest;
import com.example.dantruventu.DTO.Request.warehouse.SupplierRecallRequest;
import com.example.dantruventu.DTO.Response.warehouse.AdminPurchaseOrderReceiveResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SourceTraceService {
  private final JdbcTemplate jdbc;
  private final SalesContext context;
  private final WarehouseSupport warehouse;

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private void require(boolean valid, String message) {
    if (!valid) throw new AppException(ErrorCode.CONFLICT, message);
  }

  private Long id(Object value) {
    return value == null ? null : ((Number) value).longValue();
  }

  private boolean yes(Object value) {
    return Boolean.TRUE.equals(value) || value instanceof Number number && number.intValue() != 0;
  }

  private String clean(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private long insert(String sql, Object... args) {
    var key = new GeneratedKeyHolder();

    jdbc.update(
        connection -> {
          var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);

          for (int index = 0; index < args.length; index++) {
            statement.setObject(index + 1, args[index]);
          }

          return statement;
        },
        key);

    require(key.getKey() != null, "Không lấy được mã nguồn nhận hàng.");
    return key.getKey().longValue();
  }

  private long header(Long poId, String kind, Long eventId, String document, String note) {
    return insert(
        """
                INSERT INTO rv_receipt (
                  purchase_id, source_kind, ncc_event_id,
                  supplier_document, recorded_at, actor_id, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
        poId,
        kind,
        eventId,
        clean(document),
        Timestamp.valueOf(LocalDateTime.now(ZONE)),
        context.actor().getId(),
        note);
  }

  private void line(
      long receiptId,
      Long purchaseLineId,
      Long variantId,
      int quantity,
      String lot,
      boolean managed,
      Collection<Long> serials) {

    require(quantity > 0, "Số lượng nguồn nhận không hợp lệ.");
    require(!managed || serials.size() == quantity, "Số serial không khớp số lượng nguồn nhận.");

    long lineId =
        insert(
            """
                        INSERT INTO rv_receipt_line (
                          receipt_id, purchase_line_id, variant_id,
                          quantity, supplier_lot, serial_managed
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        """,
            receiptId,
            purchaseLineId,
            variantId,
            quantity,
            clean(lot),
            managed);

    for (Long serialId : serials) {
      jdbc.update(
          """
                    INSERT INTO rv_receipt_serial (receipt_line_id, serial_id)
                    VALUES (?, ?)
                    """,
          lineId,
          serialId);
    }
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void recordPurchaseReceipt(
      Long poId,
      AdminPurchaseOrderReceiveRequest request,
      List<AdminPurchaseOrderReceiveResponse.Item> actualItems) {

    long receiptId =
        header(
            poId,
            "NHAP_GOC",
            null,
            request.getMaPhieuXuatNcc(),
            "Ghi nguồn nhận cùng giao dịch nhập kho.");

    for (var actual : actualItems) {
      var input =
          request.getItems().stream()
              .filter(
                  item -> Objects.equals(item.getChiTietDonNhapId(), actual.getChiTietDonNhapId()))
              .findFirst()
              .orElseThrow();

      var serials =
          actual.getSerials().stream()
              .map(AdminPurchaseOrderReceiveResponse.SerialData::getId)
              .toList();

      line(
          receiptId,
          actual.getChiTietDonNhapId(),
          actual.getPhienBanId(),
          actual.getSoLuongNhapKho(),
          input.getMaLoNcc(),
          Boolean.TRUE.equals(actual.getQuanLySerial()),
          serials);
    }
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void recordNccReceipt(
      Long eventId,
      Long caseId,
      Long unitId,
      String action,
      Long newSerialId,
      String document,
      boolean alreadyInStock) {

    if (!Set.of("NHAN", "NHAN_BO_SUNG").contains(action)) return;

    var rows =
        jdbc.queryForList(
            """
                        SELECT c.source_po_id, u.source_line_id,
                               u.variant_id, u.expected_variant_id,
                               current_v.co_quan_ly_serial AS current_managed,
                               target_v.co_quan_ly_serial AS target_managed
                        FROM ncc_unit u
                        JOIN ncc_case c ON c.id = u.case_id
                        JOIN phien_ban_san_pham current_v ON current_v.id = u.variant_id
                        JOIN phien_ban_san_pham target_v
                          ON target_v.id = u.expected_variant_id
                        WHERE u.id = ? AND c.id = ?
                        """,
            unitId,
            caseId);

    require(rows.size() == 1, "Thiếu nguồn thiết bị nhận từ Nhà Cung Cấp.");

    var unit = rows.getFirst();
    boolean returning = "NHAN".equals(action);

    Long variantId = id(unit.get(returning ? "expected_variant_id" : "variant_id"));

    boolean managed = yes(unit.get(returning ? "target_managed" : "current_managed"));

    String kind =
        "NHAN_BO_SUNG".equals(action) && alreadyInStock ? "DOI_SOAT_BO_SUNG" : "NHAN_XU_LY_NCC";

    long receiptId =
        header(
            id(unit.get("source_po_id")),
            kind,
            eventId,
            document,
            (alreadyInStock ? "Đối soát hàng đã có trong kho, hồ sơ #" : "Nhận theo hồ sơ #")
                + caseId);

    line(
        receiptId,
        id(unit.get("source_line_id")),
        variantId,
        1,
        null,
        managed,
        newSerialId == null ? List.of() : List.of(newSerialId));
  }

  public Object purchaseSources(Long poId) {
    context.actor();

    var receipts =
        jdbc.queryForList(
            """
                        SELECT r.*, n.ho_ten AS actor_name
                        FROM rv_receipt r
                        JOIN nguoi_dung n ON n.id = r.actor_id
                        WHERE r.purchase_id = ?
                        ORDER BY r.id DESC
                        """,
            poId);

    for (var receipt : receipts) {
      var lines =
          jdbc.queryForList(
              """
                            SELECT l.*, v.ten_phien_ban
                            FROM rv_receipt_line l
                            JOIN phien_ban_san_pham v ON v.id = l.variant_id
                            WHERE l.receipt_id = ?
                            ORDER BY l.id
                            """,
              receipt.get("id"));

      for (var detail : lines) {
        detail.put(
            "serials",
            jdbc.queryForList(
                """
                                SELECT s.id, s.so_serial
                                FROM rv_receipt_serial x
                                JOIN so_serial_san_pham s ON s.id = x.serial_id
                                WHERE x.receipt_line_id = ?
                                ORDER BY s.id
                                """,
                detail.get("id")));
      }

      receipt.put("items", lines);
    }

    return safe(receipts);
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Map<String, Object> backfill(
      Long poId, String key, SupplierRecallRequest.Backfill request) {

    var actor = context.actor();

    return warehouse.once(
        "SOURCE_BACKFILL",
        poId,
        key,
        request,
        actor.getId(),
        Map.class,
        () -> {
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận đối soát nguồn cũ.");

          require(
              jdbc.queryForList("SELECT id FROM don_nhap_hang WHERE id = ? FOR UPDATE", poId).size()
                  == 1,
              "Không tìm thấy đơn nhập nguồn.");

          long receiptId =
              header(poId, "DOI_SOAT_CU", null, request.document(), request.note().strip());

          Set<Long> seen = new HashSet<>();

          for (var input : request.items()) {
            require(seen.add(input.purchaseLineId()), "Dòng nguồn bị gửi trùng.");

            var candidates =
                jdbc.queryForList(
                    """
                                        SELECT d.*, v.co_quan_ly_serial
                                        FROM chi_tiet_don_nhap d
                                        JOIN phien_ban_san_pham v ON v.id = d.phien_ban_id
                                        WHERE d.id = ? AND d.don_nhap_hang_id = ?
                                        """,
                    input.purchaseLineId(),
                    poId);

            require(candidates.size() == 1, "Dòng nguồn không thuộc đơn nhập.");

            var detail = candidates.getFirst();
            Long variantId = id(detail.get("phien_ban_id"));

            long received =
                jdbc.queryForObject(
                    """
                                        SELECT COALESCE(SUM(so_luong_thay_doi), 0)
                                        FROM the_kho
                                        WHERE ma_chung_tu_goc = ?
                                          AND phien_ban_id = ?
                                          AND loai_giao_dich = 'NHAP_HANG'
                                        """,
                    Long.class,
                    poId,
                    variantId);

            long recorded =
                jdbc.queryForObject(
                    """
                                        SELECT COALESCE(SUM(l.quantity), 0)
                                        FROM rv_receipt_line l
                                        JOIN rv_receipt r ON r.id = l.receipt_id
                                        WHERE r.purchase_id = ?
                                          AND l.variant_id = ?
                                          AND r.source_kind IN ('NHAP_GOC', 'DOI_SOAT_CU')
                                        """,
                    Long.class,
                    poId,
                    variantId);

            require(
                input.quantity() <= received - recorded,
                "Số lượng vượt phần đã nhập nhưng chưa ghi nguồn.");

            boolean managed = yes(detail.get("co_quan_ly_serial"));

            List<String> codes = input.serialCodes() == null ? List.of() : input.serialCodes();

            require(
                managed ? codes.size() == input.quantity() : codes.isEmpty(),
                "Danh sách serial nguồn không hợp lệ.");

            var serials = new ArrayList<Long>();

            for (String code : codes) {
              var found =
                  jdbc.queryForList(
                      """
                                            SELECT s.id
                                            FROM so_serial_san_pham s
                                            WHERE s.so_serial = ?
                                              AND s.phien_ban_id = ?
                                              AND s.don_nhap_hang_id = ?
                                              AND NOT EXISTS (
                                                SELECT 1
                                                FROM rv_receipt_serial x
                                                JOIN rv_receipt_line l ON l.id = x.receipt_line_id
                                                JOIN rv_receipt r ON r.id = l.receipt_id
                                                WHERE x.serial_id = s.id
                                                  AND r.source_kind IN ('NHAP_GOC', 'DOI_SOAT_CU')
                                              )
                                            """,
                      code.strip(),
                      variantId,
                      poId);

              require(found.size() == 1, "Serial nguồn không khớp hoặc đã có nguồn gốc: " + code);

              Long serialId = id(found.getFirst().get("id"));
              require(!serials.contains(serialId), "Serial bị gửi trùng.");
              serials.add(serialId);
            }

            line(
                receiptId,
                input.purchaseLineId(),
                variantId,
                input.quantity(),
                input.lot(),
                managed,
                serials);
          }

          return Map.of("id", receiptId, "action", "DOI_SOAT_NGUON_CU");
        });
  }

  public Object serialTrace(Long serialId) {
    context.actor();

    var rows =
        jdbc.queryForList(
            """
                        SELECT s.*, v.ten_phien_ban, p.ten_san_pham,
                               dn.ma_don_nhap, dn.nha_cung_cap_id,
                               ncc.ten_nha_cung_cap,
                               ct.don_hang_id AS packing_order_id,
                               packed.ma_don_hang AS packing_order_code,
                               sold.ma_don_hang AS sold_order_code,
                               sold.trang_thai_don_hang AS order_status,
                               sold.trang_thai_xuat_kho AS export_status,
                               sold.ngay_hoan_thanh,
                               COALESCE(NULLIF(sold.ten_nguoi_nhan, ''), customer.ho_ten)
                                 AS ten_nguoi_nhan,
                               COALESCE(NULLIF(sold.sdt_nguoi_nhan, ''), customer.so_dien_thoai)
                                 AS sdt_nguoi_nhan,
                               sold.khach_hang_id
                        FROM so_serial_san_pham s
                        JOIN phien_ban_san_pham v ON v.id = s.phien_ban_id
                        JOIN san_pham p ON p.id = v.san_pham_id
                        LEFT JOIN don_nhap_hang dn ON dn.id = s.don_nhap_hang_id
                        LEFT JOIN nha_cung_cap ncc ON ncc.id = dn.nha_cung_cap_id
                        LEFT JOIN chi_tiet_don_hang ct ON ct.id = s.chi_tiet_dong_goi_id
                        LEFT JOIN don_hang packed ON packed.id = ct.don_hang_id
                        LEFT JOIN don_hang sold ON sold.id = s.don_hang_id
                        LEFT JOIN nguoi_dung customer ON customer.id = sold.khach_hang_id
                        WHERE s.id = ?
                        """,
            serialId);

    require(rows.size() == 1, "Không tìm thấy serial để truy vết.");

    var result = new LinkedHashMap<String, Object>();
    result.put("current", rows.getFirst());

    var receipts =
        jdbc.queryForList(
            """
                        SELECT r.id, r.purchase_id, r.source_kind,
                               r.supplier_document, r.recorded_at, r.note,
                               l.id AS receipt_line_id, l.supplier_lot,
                               l.quantity, n.ho_ten AS actor_name
                        FROM rv_receipt_serial x
                        JOIN rv_receipt_line l ON l.id = x.receipt_line_id
                        JOIN rv_receipt r ON r.id = l.receipt_id
                        JOIN nguoi_dung n ON n.id = r.actor_id
                        WHERE x.serial_id = ?
                        ORDER BY r.id
                        """,
            serialId);

    result.put("receipts", receipts);

    result.put(
        "devices",
        jdbc.queryForList(
            """
                        SELECT t.id, t.ma_theo_doi, t.chi_tiet_tra_hang_id,
                               t.ngay_kich_hoat,
                               d.id AS order_id, d.ma_don_hang,
                               d.trang_thai_don_hang, d.ngay_hoan_thanh,
                               COALESCE(NULLIF(d.ten_nguoi_nhan, ''), customer.ho_ten)
                                 AS ten_nguoi_nhan,
                               COALESCE(NULLIF(d.sdt_nguoi_nhan, ''), customer.so_dien_thoai)
                                 AS sdt_nguoi_nhan,
                               returned.id AS return_id, returned.ma_tra_hang,
                               returned.trang_thai_tra_hang, returned.ngay_nhan_hang
                        FROM thiet_bi_bao_hanh t
                        JOIN chi_tiet_don_hang ct ON ct.id = t.chi_tiet_don_hang_id
                        JOIN don_hang d ON d.id = ct.don_hang_id
                        LEFT JOIN nguoi_dung customer ON customer.id = d.khach_hang_id
                        LEFT JOIN chi_tiet_tra_hang return_line
                          ON return_line.id = t.chi_tiet_tra_hang_id
                        LEFT JOIN phieu_tra_hang returned
                          ON returned.id = return_line.phieu_tra_hang_id
                        WHERE t.so_serial_id = ?
                        ORDER BY t.id
                        """,
            serialId));

    result.put(
        "warranty",
        jdbc.queryForList(
            """
                        SELECT b.id, b.ma_phieu, b.don_hang_id,
                               b.trang_thai_xu_ly, b.ket_qua_xu_ly,
                               b.ngay_tiep_nhan,
                               old_t.ma_theo_doi AS old_device,
                               old_s.so_serial AS old_serial,
                               new_t.ma_theo_doi AS new_device,
                               new_s.so_serial AS new_serial
                        FROM phieu_bao_hanh b
                        LEFT JOIN thiet_bi_bao_hanh old_t ON old_t.id = b.thiet_bi_id
                        LEFT JOIN thiet_bi_bao_hanh new_t ON new_t.id = b.thiet_bi_thay_the_id
                        LEFT JOIN so_serial_san_pham old_s ON old_s.id = old_t.so_serial_id
                        LEFT JOIN so_serial_san_pham new_s ON new_s.id = new_t.so_serial_id
                        WHERE b.so_serial_id = ?
                           OR old_t.so_serial_id = ?
                           OR new_t.so_serial_id = ?
                        ORDER BY b.id
                        """,
            serialId,
            serialId,
            serialId));

    result.put(
        "supplierEvents",
        jdbc.queryForList(
            """
                        SELECT e.id, e.case_id, c.code, c.source_po_id,
                               e.action, e.document, e.note, e.occurred_at,
                               old_s.so_serial AS old_serial,
                               new_s.so_serial AS new_serial
                        FROM ncc_event e
                        JOIN ncc_case c ON c.id = e.case_id
                        LEFT JOIN so_serial_san_pham old_s ON old_s.id = e.old_serial_id
                        LEFT JOIN so_serial_san_pham new_s ON new_s.id = e.new_serial_id
                        WHERE e.old_serial_id = ? OR e.new_serial_id = ?
                        ORDER BY e.id
                        """,
            serialId,
            serialId));

    result.put(
        "recalls",
        jdbc.queryForList(
            """
                        SELECT i.id, i.recall_id, r.code, r.notice_document,
                               r.reason, i.status, i.result, i.blocked,
                               i.contact_note, i.next_contact_at
                        FROM rv_recall_item i
                        JOIN rv_recall r ON r.id = i.recall_id
                        WHERE i.serial_id = ?
                        ORDER BY i.id DESC
                        """,
            serialId));

    result.put(
        "sourceNeedsVerification",
        receipts.isEmpty()
            || receipts.stream().noneMatch(receipt -> receipt.get("supplier_document") != null));

    return safe(result);
  }

  public Object safe(Object value) {
    if (value instanceof Timestamp timestamp) {
      return timestamp.toLocalDateTime().atZone(ZONE).toOffsetDateTime().toString();
    }

    if (value instanceof LocalDateTime time) {
      return time.atZone(ZONE).toOffsetDateTime().toString();
    }

    if (value instanceof Map<?, ?> map) {
      var result = new LinkedHashMap<String, Object>();
      map.forEach((key, item) -> result.put(key.toString(), safe(item)));
      return result;
    }

    if (value instanceof Collection<?> collection) {
      return collection.stream().map(this::safe).toList();
    }

    return value;
  }
}
