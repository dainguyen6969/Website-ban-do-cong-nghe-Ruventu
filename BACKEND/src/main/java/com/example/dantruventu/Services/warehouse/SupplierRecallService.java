package com.example.dantruventu.Services.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.SupplierRecallRequest;
import com.example.dantruventu.Entity.PhieuBaoHanh;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.order.AdminOrderService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Services.warranty.WarrantyDeviceResolver;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupplierRecallService {
  private final JdbcTemplate jdbc;
  private final SalesContext context;
  private final WarehouseSupport warehouse;
  private final RecallSafety safety;
  private final SourceTraceService sources;
  private final EntityManager entityManager;
  private final WarrantyDeviceResolver resolver;
  private final ObjectMapper json;
  private final AdminOrderService orders;

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  public record Result(Long id, String code, String action) {}

  private void require(boolean valid, String message) {
    if (!valid) throw new AppException(ErrorCode.CONFLICT, message);
  }

  private Long id(Object value) {
    return value == null ? null : ((Number) value).longValue();
  }

  private boolean yes(Object value) {
    return Boolean.TRUE.equals(value) || value instanceof Number number && number.intValue() != 0;
  }

  private Timestamp now() {
    return Timestamp.valueOf(LocalDateTime.now(ZONE));
  }

  private Timestamp time(OffsetDateTime value) {
    return value == null
        ? null
        : Timestamp.valueOf(value.atZoneSameInstant(ZONE).toLocalDateTime());
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

    require(key.getKey() != null, "Không lấy được mã bản ghi thu hồi.");
    return key.getKey().longValue();
  }

  private Map<String, Object> row(String sql, Object... args) {
    var rows = jdbc.queryForList(sql, args);
    require(rows.size() == 1, "Không tìm thấy dữ liệu hoặc dữ liệu bị trùng.");
    return rows.getFirst();
  }

  private void document(String value) {
    require(
        value != null && !value.isBlank() && value.strip().length() <= 100,
        "Nhập mã chứng từ/thỏa thuận làm căn cứ, tối đa 100 ký tự.");
  }

  private void lockStocks(Collection<Long> variants) {
    context.warehouse(context.defaultWarehouseId());

    for (Long variantId : new TreeSet<>(variants)) {
      warehouse.lockVariant(variantId);
    }

    for (Long variantId : new TreeSet<>(variants)) {
      jdbc.queryForList(
          """
                    SELECT id FROM ton_kho
                    WHERE kho_hang_id = ? AND phien_ban_id = ?
                    FOR UPDATE
                    """,
          context.defaultWarehouseId(),
          variantId);
    }
  }

  private void reconcile(Collection<Long> variants) {
    for (Long variantId : new TreeSet<>(variants)) {
      safety.reconcileJdbc(context.defaultWarehouseId(), variantId);
    }
  }

  private void event(
      Long recallId,
      Long itemId,
      String action,
      String document,
      String note,
      Object payload,
      Long actorId) {

    jdbc.update(
        """
                INSERT INTO rv_recall_event (
                  recall_id, item_id, action, document,
                  note, payload, actor_id, occurred_at
                ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
                """,
        recallId,
        itemId,
        action,
        document == null ? null : document.strip(),
        note.strip(),
        json.writeValueAsString(payload),
        actorId,
        now());
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result open(String key, SupplierRecallRequest.Open request) {
    var actor = context.actor();

    return warehouse.once(
        "RECALL_OPEN",
        request.purchaseId(),
        key,
        request,
        actor.getId(),
        Result.class,
        () -> {
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận phạm vi thu hồi.");

          document(request.document());

          var purchase =
              row("SELECT * FROM don_nhap_hang WHERE id = ? FOR UPDATE", request.purchaseId());

          require(purchase.get("nha_cung_cap_id") != null, "Đơn nhập thiếu Nhà Cung Cấp.");

          List<String> codes = request.serialCodes() == null ? List.of() : request.serialCodes();

          require(
              (!codes.isEmpty()) != (request.receiptLineId() != null),
              "Chọn danh sách serial hoặc một dòng nguồn nhận hàng.");

          var serialIds = new TreeSet<Long>();
          var variantIds = new TreeSet<Long>();
          Map<String, Object> receiptLine = null;
          boolean nonSerial = false;
          int quantity = 0;

          if (!codes.isEmpty()) {
            Set<String> seen = new HashSet<>();

            for (String code : codes) {
              require(seen.add(code.strip()), "Serial bị gửi trùng.");

              var serial =
                  row(
                      """
                                            SELECT id, phien_ban_id, don_nhap_hang_id
                                            FROM so_serial_san_pham
                                            WHERE so_serial = ?
                                            """,
                      code.strip());

              require(
                  Objects.equals(id(serial.get("don_nhap_hang_id")), request.purchaseId()),
                  "Serial không thuộc nguồn nhập đã chọn: " + code);

              serialIds.add(id(serial.get("id")));
              variantIds.add(id(serial.get("phien_ban_id")));
            }
          } else {
            receiptLine =
                row(
                    """
                                        SELECT l.*, r.purchase_id
                                        FROM rv_receipt_line l
                                        JOIN rv_receipt r ON r.id = l.receipt_id
                                        WHERE l.id = ? AND r.purchase_id = ?
                                        """,
                    request.receiptLineId(),
                    request.purchaseId());

            variantIds.add(id(receiptLine.get("variant_id")));
            nonSerial = !yes(receiptLine.get("serial_managed"));

            if (nonSerial) {
              int sourceQuantity = ((Number) receiptLine.get("quantity")).intValue();

              quantity = request.quantity() == null ? sourceQuantity : request.quantity();

              require(
                  quantity > 0 && quantity <= 500 && quantity <= sourceQuantity,
                  "Số thiết bị vượt số lượng dòng nguồn nhận.");

              require(
                  Boolean.TRUE.equals(request.acceptVariantBlock()),
                  "Cần xác nhận chặn toàn bộ phiên bản trong lúc đối soát nguồn lô.");
            } else {
              serialIds.addAll(
                  jdbc.queryForList(
                      """
                                            SELECT serial_id
                                            FROM rv_receipt_serial
                                            WHERE receipt_line_id = ?
                                            ORDER BY serial_id
                                            """,
                      Long.class,
                      request.receiptLineId()));

              require(
                  !serialIds.isEmpty() && serialIds.size() <= 500,
                  "Dòng nguồn thiếu serial hoặc vượt 500 thiết bị.");
            }
          }

          lockStocks(variantIds);

          for (Long serialId : serialIds) {
            var serial = row("SELECT * FROM so_serial_san_pham WHERE id = ? FOR UPDATE", serialId);

            require(
                Objects.equals(id(serial.get("don_nhap_hang_id")), request.purchaseId())
                    && variantIds.contains(id(serial.get("phien_ban_id"))),
                "Nguồn serial vừa thay đổi; mở lại phạm vi.");
          }

          String code = "TH-" + UUID.randomUUID();

          long recallId =
              insert(
                  """
                                    INSERT INTO rv_recall (
                                      code, purchase_id, notice_document,
                                      reason, employee_id, deadline, created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                                    """,
                  code,
                  request.purchaseId(),
                  request.document().strip(),
                  request.reason().strip(),
                  context.employee(request.employeeId(), actor).getId(),
                  time(request.deadline()),
                  now());

          for (Long serialId : serialIds) {
            Long variantId =
                jdbc.queryForObject(
                    "SELECT phien_ban_id FROM so_serial_san_pham WHERE id = ?",
                    Long.class,
                    serialId);

            jdbc.update(
                """
                                INSERT INTO rv_recall_item (
                                  recall_id, variant_id, serial_id,
                                  receipt_line_id, source_verified
                                ) VALUES (?, ?, ?, ?, TRUE)
                                """,
                recallId,
                variantId,
                serialId,
                request.receiptLineId());

            jdbc.update("UPDATE so_serial_san_pham SET bi_thu_hoi = TRUE WHERE id = ?", serialId);
          }

          if (nonSerial) {
            for (int index = 0; index < quantity; index++) {
              jdbc.update(
                  """
                                    INSERT INTO rv_recall_item (
                                      recall_id, variant_id, receipt_line_id, source_verified
                                    ) VALUES (?, ?, ?, FALSE)
                                    """,
                  recallId,
                  id(receiptLine.get("variant_id")),
                  request.receiptLineId());
            }
          }

          reconcile(variantIds);

          event(
              recallId,
              null,
              "TAO_THU_HOI",
              request.document(),
              request.reason(),
              request,
              actor.getId());

          return new Result(recallId, code, "TAO_THU_HOI");
        });
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result execute(Long recallId, String key, SupplierRecallRequest.Command request) {

    var actor = context.actor();

    return warehouse.once(
        "RECALL_EVENT",
        recallId,
        key,
        request,
        actor.getId(),
        Result.class,
        () -> {
          var campaign = row("SELECT * FROM rv_recall WHERE id = ? FOR UPDATE", recallId);

          require(
              Objects.equals(id(campaign.get("revision")), request.revision()),
              "Phạm vi thu hồi đã thay đổi; mở lại thao tác.");

          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận thao tác thu hồi.");

          String action = request.action();
          boolean active = "DANG_XU_LY".equals(campaign.get("status"));

          require(active || "MO_LAI".equals(action), "Đợt thu hồi đã kết thúc.");

          var variants =
              jdbc.queryForList(
                  """
                                    SELECT DISTINCT variant_id
                                    FROM rv_recall_item
                                    WHERE recall_id = ?
                                    ORDER BY variant_id
                                    """,
                  Long.class,
                  recallId);

          lockStocks(variants);

          Map<String, Object> item = null;

          if (request.itemId() != null) {
            item =
                row(
                    """
                                        SELECT * FROM rv_recall_item
                                        WHERE id = ? AND recall_id = ?
                                        FOR UPDATE
                                        """,
                    request.itemId(),
                    recallId);

            if (item.get("serial_id") != null) {
              row(
                  "SELECT id FROM so_serial_san_pham WHERE id = ? FOR UPDATE",
                  item.get("serial_id"));
            }
          }

          switch (action) {
            case "LIEN_HE", "CHO_NHAN_LAI" -> {
              require(
                  item != null && !"DA_GIAI_QUYET".equals(item.get("status")),
                  "Thiết bị đã kết thúc hoặc chưa được chọn.");

              jdbc.update(
                  """
                                    UPDATE rv_recall_item
                                    SET status = ?, contact_note = ?, next_contact_at = ?
                                    WHERE id = ?
                                    """,
                  "LIEN_HE".equals(action) ? "DA_LIEN_HE" : "CHO_NHAN_LAI",
                  request.note().strip(),
                  time(request.nextContactAt()),
                  request.itemId());
            }

            case "GAN_THIET_BI" -> {
              require(
                  item != null
                      && item.get("serial_id") == null
                      && !"DA_GIAI_QUYET".equals(item.get("status")),
                  "Chỉ đối soát thiết bị không serial đang xử lý.");

              document(request.document());

              require(
                  Boolean.TRUE.equals(request.sourceVerified()),
                  "Chưa xác nhận đối chiếu nguồn thực tế.");

              var device = row("SELECT * FROM thiet_bi_bao_hanh WHERE id = ?", request.deviceId());

              require(
                  device.get("so_serial_id") == null
                      && Objects.equals(id(device.get("phien_ban_id")), id(item.get("variant_id"))),
                  "Thiết bị bán không khớp phiên bản không serial.");

              require(
                  jdbc.queryForObject(
                          """
                                            SELECT COUNT(*)
                                            FROM rv_recall_item
                                            WHERE recall_id = ? AND device_id = ? AND id <> ?
                                            """,
                          Long.class,
                          recallId,
                          request.deviceId(),
                          request.itemId())
                      == 0,
                  "Thiết bị đã được gắn cho dòng khác trong đợt thu hồi.");

              jdbc.update(
                  """
                                    UPDATE rv_recall_item
                                    SET device_id = ?, source_verified = TRUE
                                    WHERE id = ?
                                    """,
                  request.deviceId(),
                  request.itemId());
            }

            case "TRA_NCC", "DOI_NCC", "DOI_BAO_HANH", "LOAI_TRU" -> {
              require(
                  item != null && !"DA_GIAI_QUYET".equals(item.get("status")),
                  "Thiết bị chưa được chọn hoặc đã kết thúc.");

              document(request.document());

              boolean managed = item.get("serial_id") != null;

              if (!managed) {
                require(
                    Boolean.TRUE.equals(request.sourceVerified()),
                    "Phải đối soát đúng nguồn từng thiết bị không serial.");
              }

              if (Set.of("TRA_NCC", "DOI_NCC").contains(action)) {
                verifyNcc(campaign, item, request);
              }

              if ("DOI_BAO_HANH".equals(action)) {
                verifyWarranty(item, request);
              }

              if ("LOAI_TRU".equals(action)) {
                require(
                    Boolean.TRUE.equals(request.qualityConfirmed()),
                    "Cần xác nhận căn cứ loại trừ hoặc cho phép sử dụng.");
              }

              jdbc.update(
                  """
                                    UPDATE rv_recall_item
                                    SET status = 'DA_GIAI_QUYET',
                                        result = ?, blocked = ?, resolved_at = ?,
                                        source_verified = TRUE,
                                        ncc_unit_id = ?, warranty_id = ?,
                                        contact_note = ?, next_contact_at = NULL
                                    WHERE id = ?
                                    """,
                  action,
                  !"LOAI_TRU".equals(action),
                  now(),
                  Set.of("TRA_NCC", "DOI_NCC").contains(action) ? request.nccUnitId() : null,
                  "DOI_BAO_HANH".equals(action) ? request.warrantyId() : null,
                  request.note().strip(),
                  request.itemId());

              if (managed) {
                Long serialId = id(item.get("serial_id"));

                boolean blocked =
                    jdbc.queryForObject(
                            """
                                                SELECT COUNT(*)
                                                FROM rv_recall_item
                                                WHERE serial_id = ? AND blocked = TRUE
                                                """,
                            Long.class,
                            serialId)
                        > 0;

                jdbc.update(
                    "UPDATE so_serial_san_pham SET bi_thu_hoi = ? WHERE id = ?", blocked, serialId);
              }
            }

            case "KET_THUC" -> {
              require(
                  jdbc.queryForObject(
                          """
                                            SELECT COUNT(*)
                                            FROM rv_recall_item
                                            WHERE recall_id = ? AND status <> 'DA_GIAI_QUYET'
                                            """,
                          Long.class,
                          recallId)
                      == 0,
                  "Còn thiết bị chưa có kết quả xử lý.");

              String blocker = customerRefundBlocker(recallId);
              require(blocker.isEmpty(), blocker);

              jdbc.update(
                  """
                                    UPDATE rv_recall
                                    SET status = 'HOAN_TAT', completed_at = ?
                                    WHERE id = ?
                                    """,
                  now(),
                  recallId);
            }

            case "MO_LAI" -> {
              require(!active, "Đợt thu hồi đang được xử lý.");

              jdbc.update(
                  """
                                    UPDATE rv_recall
                                    SET status = 'DANG_XU_LY', completed_at = NULL
                                    WHERE id = ?
                                    """,
                  recallId);
            }

            default ->
                throw new AppException(ErrorCode.INVALID_DATA, "Thao tác thu hồi không hợp lệ.");
          }

          reconcile(variants);

          event(
              recallId,
              request.itemId(),
              action,
              request.document(),
              request.note(),
              request,
              actor.getId());

          jdbc.update("UPDATE rv_recall SET revision = revision + 1 WHERE id = ?", recallId);

          return new Result(recallId, campaign.get("code").toString(), action);
        });
  }

  private List<Map<String, Object>> recallNccEvidence(Long purchaseId) {
    return jdbc.queryForList(
        """
                SELECT u.id, u.case_id, u.source_line_id, u.status,
                       c.code, v.ten_phien_ban,
                       e.id AS event_id,
                       e.action AS event_action,
                       e.old_serial_id, e.new_serial_id,
                       e.document, e.occurred_at,
                       old_s.so_serial AS old_serial,
                       new_s.so_serial AS new_serial,
                       EXISTS (
                         SELECT 1
                         FROM ncc_adjustment a
                         WHERE a.event_id = e.id
                           AND a.kind = 'SWAP'
                       ) AS was_exchanged
                FROM ncc_unit u
                JOIN ncc_case c ON c.id = u.case_id
                JOIN ncc_event e ON e.unit_id = u.id
                JOIN phien_ban_san_pham v ON v.id = u.variant_id
                LEFT JOIN so_serial_san_pham old_s ON old_s.id = e.old_serial_id
                LEFT JOIN so_serial_san_pham new_s ON new_s.id = e.new_serial_id
                WHERE c.source_po_id = ?
                  AND c.status IN ('HOAN_TAT', 'KET_THUC_DOI_SOAT')
                  AND u.status IN ('DA_TRA_NCC', 'DA_NHAN_DAT')
                  AND e.action IN ('CHOT_TRA', 'NHAN')
                ORDER BY e.id DESC
                """,
        purchaseId);
  }

  private Map<Long, Set<Long>> recallUsedNccUnits(Long recallId) {
    Map<Long, Set<Long>> result = new HashMap<>();

    for (var item :
        jdbc.queryForList(
            """
                        SELECT id, ncc_unit_id
                        FROM rv_recall_item
                        WHERE recall_id = ?
                          AND ncc_unit_id IS NOT NULL
                        """,
            recallId)) {

      result
          .computeIfAbsent(id(item.get("ncc_unit_id")), ignored -> new HashSet<>())
          .add(id(item.get("id")));
    }

    return result;
  }

  private List<Map<String, Object>> recallNccOptions(
      Map<String, Object> item,
      String action,
      List<Map<String, Object>> evidence,
      Map<Long, Set<Long>> usedUnits) {

    boolean returning = "TRA_NCC".equals(action);
    Long serialId = id(item.get("serial_id"));
    Long sourceLineId = id(item.get("source_line_id"));

    if (serialId == null && sourceLineId == null && item.get("receipt_line_id") != null) {

      sourceLineId =
          jdbc.queryForObject(
              """
                            SELECT purchase_line_id
                            FROM rv_receipt_line
                            WHERE id = ?
                            """,
              Long.class,
              item.get("receipt_line_id"));
    }

    Map<Long, Map<String, Object>> options = new LinkedHashMap<>();

    for (var proof : evidence) {
      if (!(returning ? "DA_TRA_NCC" : "DA_NHAN_DAT").equals(proof.get("status"))) {
        continue;
      }

      if (!(returning ? "CHOT_TRA" : "NHAN").equals(proof.get("event_action"))) {
        continue;
      }

      if (!returning && !yes(proof.get("was_exchanged"))) {
        continue;
      }

      if (serialId != null) {
        if (!Objects.equals(serialId, id(proof.get("old_serial_id")))) {
          continue;
        }
      } else {
        if (sourceLineId == null
            || !Objects.equals(sourceLineId, id(proof.get("source_line_id")))) {
          continue;
        }

        Set<Long> usedBy = usedUnits.getOrDefault(id(proof.get("id")), Set.of());

        if (usedBy.stream().anyMatch(otherId -> !Objects.equals(otherId, id(item.get("id"))))) {
          continue;
        }
      }

      // evidence đã được sắp xếp mới nhất trước.
      options.putIfAbsent(id(proof.get("id")), proof);
    }

    return new ArrayList<>(options.values());
  }

  private boolean recallWarrantyReady(Long ticketId) {
    try {
      PhieuBaoHanh ticket = entityManager.find(PhieuBaoHanh.class, ticketId);

      if (ticket == null || ticket.getThietBi() == null || ticket.getThietBiThayThe() == null) {
        return false;
      }

      var replacement = ticket.getThietBiThayThe();

      if (replacement.getSoSerial() != null
          && Boolean.TRUE.equals(replacement.getSoSerial().getBiThuHoi())) {
        return false;
      }

      return resolver.hasHandoverEvidence(ticket, replacement);
    } catch (AppException exception) {
      // Phiếu cũ chưa đủ căn cứ không được đưa vào danh sách lựa chọn.
      // verifyWarranty() vẫn kiểm tra lại khi ghi dữ liệu.
      return false;
    }
  }

  private void verifyNcc(
      Map<String, Object> campaign,
      Map<String, Object> item,
      SupplierRecallRequest.Command request) {

    require(request.nccUnitId() != null, "Chọn phiếu xử lý Nhà Cung Cấp.");

    List<Map<String, Object>> options =
        recallNccOptions(
            item,
            request.action(),
            recallNccEvidence(id(campaign.get("purchase_id"))),
            recallUsedNccUnits(id(campaign.get("id"))));

    require(
        options.stream()
            .anyMatch(option -> Objects.equals(id(option.get("id")), request.nccUnitId())),
        "Chưa có kết quả trả/đổi hoàn tất khớp thiết bị này. "
            + "Hãy xử lý tại đơn nhập nguồn rồi quay lại liên kết phiếu.");
  }

  private void verifyWarranty(Map<String, Object> item, SupplierRecallRequest.Command request) {

    require(request.warrantyId() != null, "Chọn phiếu đổi/bảo hành đã bàn giao thiết bị thay thế.");

    var ticket = entityManager.find(PhieuBaoHanh.class, request.warrantyId());

    require(
        ticket != null
            && ticket.getThietBi() != null
            && ticket.getThietBiThayThe() != null
            && ticket.getTrangThaiXuLy() != null
            && ticket.getKetQuaXuLy() != null
            && "HOAN_TAT".equals(ticket.getTrangThaiXuLy().name())
            && "DOI_SAN_PHAM".equals(ticket.getKetQuaXuLy().name()),
        "Phiếu chưa hoàn tất đổi thiết bị.");

    if (item.get("serial_id") != null) {
      require(
          ticket.getThietBi().getSoSerial() != null
              && Objects.equals(
                  ticket.getThietBi().getSoSerial().getId(), id(item.get("serial_id"))),
          "Phiếu đổi không thuộc serial thu hồi.");
    } else {
      require(
          item.get("device_id") != null
              && Objects.equals(ticket.getThietBi().getId(), id(item.get("device_id"))),
          "Đối soát thiết bị bán trước khi liên kết phiếu đổi.");
    }

    require(
        resolver.hasHandoverEvidence(ticket, ticket.getThietBiThayThe()),
        "Chưa có căn cứ bàn giao thiết bị thay thế.");

    if (ticket.getThietBiThayThe().getSoSerial() != null) {
      safety.requireSerialClear(ticket.getThietBiThayThe().getSoSerial());
    }
  }

  private String customerRefundBlocker(Long recallId) {
    var linked =
        jdbc.queryForList(
            """
                        SELECT DISTINCT ct.don_hang_id AS order_id,
                                        returned.id AS return_id
                        FROM rv_recall_item i
                        JOIN thiet_bi_bao_hanh t
                          ON t.id = i.device_id OR t.so_serial_id = i.serial_id
                        JOIN chi_tiet_don_hang ct ON ct.id = t.chi_tiet_don_hang_id
                        JOIN chi_tiet_tra_hang returned_line
                          ON returned_line.id = t.chi_tiet_tra_hang_id
                        JOIN phieu_tra_hang returned
                          ON returned.id = returned_line.phieu_tra_hang_id
                        WHERE i.recall_id = ?
                          AND returned.trang_thai_tra_hang NOT IN ('HUY', 'TU_CHOI')
                        """,
            recallId);

    Map<Long, Map<String, Object>> balances = new HashMap<>();

    for (var link : linked) {
      Long orderId = id(link.get("order_id"));

      Map<String, Object> balance = balances.computeIfAbsent(orderId, orders::refundOptions);

      if (balance.get("hoan_don_huy") instanceof Map<?, ?> cancelled
          && yes(cancelled.get("hien_thi"))) {

        Object due = cancelled.get("so_tien_can_hoan");

        if (!(due instanceof BigDecimal amount) || amount.signum() > 0) {
          return "Đơn #" + orderId + " còn khoản hoàn hoặc cần đối soát tiền.";
        }
      }

      if (balance.get("phieu_tra_hang") instanceof Collection<?> documents) {
        for (Object raw : documents) {
          if (!(raw instanceof Map<?, ?> document)
              || !Objects.equals(id(document.get("id")), id(link.get("return_id")))) {
            continue;
          }

          Object value = document.get("tong_tien_hoan");

          if (!(value instanceof BigDecimal amount)
              || amount.signum() > 0 && !yes(document.get("da_ghi_nhan_hoan"))) {
            return "Phiếu " + document.get("ma_tra_hang") + " chưa kết thúc nghĩa vụ hoàn tiền.";
          }
        }
      }
    }

    return "";
  }

  public Object sourceOptions(String keyword) {
    context.actor();

    String query = keyword == null ? "" : keyword.strip();
    require(query.length() <= 100, "Từ khóa tối đa 100 ký tự.");

    return sources.safe(
        jdbc.queryForList(
            """
                        SELECT d.id, d.ma_don_nhap, n.ten_nha_cung_cap
                        FROM don_nhap_hang d
                        JOIN nha_cung_cap n ON n.id = d.nha_cung_cap_id
                        WHERE LOWER(CONCAT_WS(' ', d.ma_don_nhap, n.ten_nha_cung_cap))
                          LIKE LOWER(?)
                        ORDER BY d.id DESC
                        LIMIT 40
                        """,
            "%" + query + "%"));
  }

  public Object list(String keyword, String status, int page, int limit) {
    context.actor();

    require(
        page >= 0 && limit >= 1 && limit <= 50 && (long) page * limit <= Integer.MAX_VALUE,
        "Phân trang không hợp lệ.");

    String query = keyword == null ? "" : keyword.strip();
    String state = status == null ? "" : status;

    require(query.length() <= 100, "Từ khóa tối đa 100 ký tự.");
    require(
        Set.of("", "DANG_XU_LY", "HOAN_TAT").contains(state), "Bộ lọc trạng thái không hợp lệ.");

    String joins =
        """
                 FROM rv_recall r
                 JOIN don_nhap_hang d ON d.id = r.purchase_id
                 JOIN nha_cung_cap n ON n.id = d.nha_cung_cap_id
                """;

    String where =
        """
                 WHERE (? = '' OR r.status = ?)
                   AND LOWER(CONCAT_WS(
                     ' ', r.code, r.reason, r.notice_document,
                     d.ma_don_nhap, n.ten_nha_cung_cap
                   )) LIKE LOWER(?)
                """;

    long count =
        jdbc.queryForObject(
            "SELECT COUNT(*) " + joins + where, Long.class, state, state, "%" + query + "%");

    var rows =
        jdbc.queryForList(
            """
                        SELECT r.*, d.ma_don_nhap, n.ten_nha_cung_cap,
                          (SELECT COUNT(*) FROM rv_recall_item i
                           WHERE i.recall_id = r.id) AS total_items,
                          (SELECT COUNT(*) FROM rv_recall_item i
                           WHERE i.recall_id = r.id
                             AND i.status = 'DA_GIAI_QUYET') AS resolved_items
                        """
                + joins
                + where
                + " ORDER BY r.id DESC LIMIT ? OFFSET ?",
            state,
            state,
            "%" + query + "%",
            limit,
            page * limit);

    return sources.safe(
        Map.of(
            "items", rows,
            "page", page,
            "totalItems", count,
            "totalPages", Math.max(1, (count + limit - 1) / limit)));
  }

  public Object detail(Long recallId) {
    context.actor();

    var campaign =
        row(
            """
                        SELECT r.*, d.ma_don_nhap, n.ten_nha_cung_cap,
                               employee.ho_ten AS employee_name
                        FROM rv_recall r
                        JOIN don_nhap_hang d ON d.id = r.purchase_id
                        JOIN nha_cung_cap n ON n.id = d.nha_cung_cap_id
                        JOIN nguoi_dung employee ON employee.id = r.employee_id
                        WHERE r.id = ?
                        """,
            recallId);

    var items =
        jdbc.queryForList(
            """
                        SELECT i.*, s.so_serial, s.trang_thai AS serial_status,
                               s.chi_tiet_dong_goi_id,
                               v.ten_phien_ban, l.supplier_lot,
                              l.purchase_line_id AS source_line_id,
                               receipt.supplier_document,
                               COALESCE(
                                 s.don_hang_id, packed.don_hang_id, linked.don_hang_id
                               ) AS order_id,
                               d.ma_don_hang, d.trang_thai_don_hang,
                               d.trang_thai_xuat_kho, d.ngay_hoan_thanh,
                               COALESCE(NULLIF(d.ten_nguoi_nhan, ''), customer.ho_ten)
                                 AS ten_nguoi_nhan,
                               COALESCE(NULLIF(d.sdt_nguoi_nhan, ''), customer.so_dien_thoai)
                                 AS sdt_nguoi_nhan,
                               device.ma_theo_doi, device.chi_tiet_tra_hang_id,
                               t.so_luong_cach_ly_thu_hoi
                        FROM rv_recall_item i
                        JOIN phien_ban_san_pham v ON v.id = i.variant_id
                        LEFT JOIN so_serial_san_pham s ON s.id = i.serial_id
                        LEFT JOIN chi_tiet_don_hang packed ON packed.id = s.chi_tiet_dong_goi_id
                        LEFT JOIN thiet_bi_bao_hanh device ON device.id = i.device_id
                        LEFT JOIN chi_tiet_don_hang linked ON linked.id = device.chi_tiet_don_hang_id
                        LEFT JOIN don_hang d ON d.id = COALESCE(
                          s.don_hang_id, packed.don_hang_id, linked.don_hang_id
                        )
                        LEFT JOIN nguoi_dung customer ON customer.id = d.khach_hang_id
                        LEFT JOIN rv_receipt_line l ON l.id = i.receipt_line_id
                        LEFT JOIN rv_receipt receipt ON receipt.id = l.receipt_id
                        LEFT JOIN ton_kho t
                          ON t.phien_ban_id = i.variant_id AND t.kho_hang_id = ?
                        WHERE i.recall_id = ?
                        ORDER BY i.id
                        """,
            context.defaultWarehouseId(),
            recallId);

    campaign.put("items", items);

    campaign.put(
        "ncc_options",
        jdbc.queryForList(
            """
                        SELECT u.id, u.status, c.code, c.id AS case_id,
                               v.ten_phien_ban, current_s.so_serial,
                               original_s.so_serial AS initial_so_serial
                        FROM ncc_unit u
                        JOIN ncc_case c ON c.id = u.case_id
                        JOIN phien_ban_san_pham v ON v.id = u.variant_id
                        LEFT JOIN so_serial_san_pham current_s ON current_s.id = u.serial_id
                        LEFT JOIN so_serial_san_pham original_s
                          ON original_s.id = u.initial_serial_id
                        WHERE c.source_po_id = ?
                          AND c.status <> 'DANG_XU_LY'
                          AND u.status IN ('DA_TRA_NCC', 'DA_NHAN_DAT')
                        ORDER BY c.id DESC, u.id
                        LIMIT 1000
                        """,
            campaign.get("purchase_id")));

    campaign.put(
        "device_options",
        jdbc.queryForList(
            """
                        SELECT t.id, t.ma_theo_doi, t.phien_ban_id, d.ma_don_hang
                        FROM thiet_bi_bao_hanh t
                        JOIN chi_tiet_don_hang ct ON ct.id = t.chi_tiet_don_hang_id
                        JOIN don_hang d ON d.id = ct.don_hang_id
                        WHERE t.so_serial_id IS NULL
                          AND EXISTS (
                            SELECT 1 FROM rv_recall_item i
                            WHERE i.recall_id = ? AND i.serial_id IS NULL
                              AND i.variant_id = t.phien_ban_id
                          )
                        ORDER BY t.id DESC
                        LIMIT 1000
                        """,
            recallId));

    var warrantyOptions =
        jdbc.queryForList(
            """
                      SELECT p.id, p.ma_phieu,
                             t.id AS old_device_id,
                             t.so_serial_id AS old_serial_id
                      FROM phieu_bao_hanh p
                      JOIN thiet_bi_bao_hanh t ON t.id = p.thiet_bi_id
                      WHERE p.trang_thai_xu_ly = 'HOAN_TAT'
                        AND p.ket_qua_xu_ly = 'DOI_SAN_PHAM'
                        AND EXISTS (
                          SELECT 1
                          FROM rv_recall_item i
                          WHERE i.recall_id = ?
                            AND (
                              i.serial_id = t.so_serial_id
                              OR i.device_id = t.id
                            )
                        )
                      ORDER BY p.id DESC
                      LIMIT 1000
                      """,
            recallId);

    campaign.put("warranty_options", warrantyOptions);

    var nccEvidence = recallNccEvidence(id(campaign.get("purchase_id")));

    var usedNccUnits = recallUsedNccUnits(recallId);

    var readyWarranty =
        warrantyOptions.stream()
            .filter(option -> recallWarrantyReady(id(option.get("id"))))
            .toList();

    for (var item : items) {
      item.put("ncc_return_options", recallNccOptions(item, "TRA_NCC", nccEvidence, usedNccUnits));

      item.put(
          "ncc_exchange_options", recallNccOptions(item, "DOI_NCC", nccEvidence, usedNccUnits));

      item.put(
          "warranty_options",
          readyWarranty.stream()
              .filter(
                  option ->
                      item.get("serial_id") != null
                          ? Objects.equals(
                              id(item.get("serial_id")), id(option.get("old_serial_id")))
                          : item.get("device_id") != null
                              && Objects.equals(
                                  id(item.get("device_id")), id(option.get("old_device_id"))))
              .toList());
    }

    campaign.put(
        "events",
        jdbc.queryForList(
            """
                      SELECT e.id,
                             e.item_id,
                             e.action,
                             e.document,
                             e.note,
                             e.occurred_at,
                             n.ho_ten AS actor_name
                      FROM rv_recall_event e
                      JOIN nguoi_dung n ON n.id = e.actor_id
                      WHERE e.recall_id = ?
                        AND e.action <> 'GHI_CHU'
                      ORDER BY e.id DESC
                      """,
            recallId));

    boolean complete = items.stream().allMatch(item -> "DA_GIAI_QUYET".equals(item.get("status")));

    String blocker =
        complete ? customerRefundBlocker(recallId) : "Còn thiết bị chưa có kết quả xử lý.";

    campaign.put("close_blocker", blocker);
    campaign.put("can_close", "DANG_XU_LY".equals(campaign.get("status")) && blocker.isEmpty());

    return sources.safe(campaign);
  }
}
