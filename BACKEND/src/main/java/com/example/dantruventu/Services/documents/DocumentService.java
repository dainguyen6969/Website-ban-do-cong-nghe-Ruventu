package com.example.dantruventu.Services.documents;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Services.warehouse.SourceTraceService;
import com.example.dantruventu.Services.warehouse.WarehouseSupport;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private final JdbcTemplate jdbc;
  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;
  private final SalesContext context;
  private final WarehouseSupport warehouse;
  private final SourceTraceService sources;
  private final DocumentNumberService numbers;

  public record Result(Long id, String code, String action) {}

  public record FundCommand(
      @NotBlank @Size(max = 50) String code,
      @NotBlank @Size(max = 150) String name,
      @NotBlank String kind,
      @Size(max = 150) String bankName,
      @Size(max = 50) String accountNumber,
      @Size(max = 150) String accountHolder,
      @NotNull @AssertTrue Boolean confirmed) {}

  public record FundStatus(
      @Min(0) long revision, @NotNull Boolean active, @NotNull @AssertTrue Boolean confirmed) {}

  public record DeleteFund(@Min(0) long revision, @NotNull @AssertTrue Boolean confirmed) {}

  public record MoneyCommand(
      @Min(0) long revision,
      @NotNull @Positive Long fundId,
      Long cashEmployeeId,
      @Size(max = 255) String transactionReference,
      @NotBlank @Size(max = 1000) String note,
      @NotNull @AssertTrue Boolean confirmed) {}

  public record Allocation(
      @NotNull @Positive Long receiptLineId, @Min(1) int quantity, @NotNull BigDecimal amount) {}

  public record SupplierDocument(
      Long documentId,
      @Min(0) long revision,
      @NotBlank String kind,
      @NotBlank @Size(max = 150) String externalNumber,
      @NotNull LocalDate issuedDate,
      @NotNull BigDecimal totalAmount,
      @NotEmpty @Size(max = 200) List<@Valid Allocation> items,
      @NotNull @AssertTrue Boolean confirmed) {}

  public record SourceCommand(
      @Min(0) long revision,
      @NotNull @Positive Long receiptLineId,
      @NotBlank @Size(max = 1000) String note,
      @NotNull @AssertTrue Boolean confirmed) {}

  private void require(boolean valid, String message) {
    if (!valid) throw new AppException(ErrorCode.CONFLICT, message);
  }

  private long number(Object value) {
    return value == null ? 0L : ((Number) value).longValue();
  }

  private boolean yes(Object value) {
    return Boolean.TRUE.equals(value) || value instanceof Number n && n.intValue() != 0;
  }

  private Timestamp now() {
    return Timestamp.valueOf(LocalDateTime.now(ZONE));
  }

  private Map<String, Object> map(Object... pairs) {
    var result = new LinkedHashMap<String, Object>();
    for (int i = 0; i < pairs.length; i += 2) {
      result.put(pairs[i].toString(), pairs[i + 1]);
    }
    return result;
  }

  private Map<String, Object> row(String sql, Object... args) {
    var rows = jdbc.queryForList(sql, args);
    if (rows.size() != 1) {
      throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy dữ liệu nguồn.");
    }
    return rows.getFirst();
  }

  private Map<String, Object> first(String sql, Object... args) {
    var rows = jdbc.queryForList(sql, args);
    return rows.isEmpty() ? null : rows.getFirst();
  }

  private long insert(String sql, Object... args) {
    var holder = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
          for (int i = 0; i < args.length; i++) {
            statement.setObject(i + 1, args[i]);
          }
          return statement;
        },
        holder);

    require(holder.getKey() != null, "Không lấy được ID chứng từ.");
    return holder.getKey().longValue();
  }

  private BigDecimal money(BigDecimal value) {
    require(
        value != null
            && value.signum() >= 0
            && value.scale() <= 2
            && value.precision() - value.scale() <= 13,
        "Số tiền phải không âm, tối đa hai chữ số thập phân.");
    return value.setScale(2);
  }

  private Result once(
      String operation, Long target, String key, Object request, Supplier<Result> action) {

    return warehouse.once(
        operation, target, key, request, context.actor().getId(), Result.class, action);
  }

  private String digest(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }

  public Object options() {
    var actor = context.actor();

    if (!"ADMIN".equals(actor.getVaiTro().getTenVaiTro())) {
      return Map.of("visible", false);
    }

    return sources.safe(
        map(
            "visible",
            true,
            "actor_id",
            actor.getId(),
            "funds",
            jdbc.queryForList(
                """
                        SELECT f.*,
                               EXISTS (
                                 SELECT 1
                                 FROM rv_money_context x
                                 WHERE x.fund_id = f.id
                               ) AS has_history
                        FROM rv_fund_account f
                        ORDER BY f.active DESC, f.id
                        """),
            "employees",
            jdbc.queryForList(
                """
                                SELECT n.id, n.ho_ten
                                FROM nguoi_dung n
                                JOIN vai_tro r ON r.id = n.vai_tro_id
                                WHERE n.trang_thai = 1
                                  AND r.ten_vai_tro IN (
                                    'ADMIN', 'QUAN_LY', 'NHAN_VIEN_BAN_HANG', 'STAFF'
                                  )
                                ORDER BY n.ho_ten, n.id
                                """)));
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result createFund(String key, FundCommand request) {
    return once(
        "DOC_FUND",
        1L,
        key,
        request,
        () -> {
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận.");

          boolean cash = "TIEN_MAT".equals(request.kind());
          require(cash || "NGAN_HANG".equals(request.kind()), "Loại quỹ/tài khoản không hợp lệ.");

          if (!cash) {
            require(
                request.bankName() != null
                    && !request.bankName().isBlank()
                    && request.accountNumber() != null
                    && !request.accountNumber().isBlank()
                    && request.accountHolder() != null
                    && !request.accountHolder().isBlank(),
                "Phải nhập ngân hàng, số tài khoản và chủ tài khoản.");
          }

          long id =
              insert(
                  """
                                    INSERT INTO rv_fund_account (
                                      code, name, kind, bank_name, account_number,
                                      account_holder, active, revision, actor_id, created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, TRUE, 0, ?, ?)
                                    """,
                  request.code().strip(),
                  request.name().strip(),
                  request.kind(),
                  cash ? null : request.bankName(),
                  cash ? null : request.accountNumber(),
                  cash ? null : request.accountHolder(),
                  context.actor().getId(),
                  now());

          return new Result(id, request.code().strip(), "TAO_TAI_KHOAN_TIEN");
        });
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result fundStatus(Long id, String key, FundStatus request) {
    return once(
        "DOC_FUND_STATUS",
        id,
        key,
        request,
        () -> {
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận.");
          var fund = row("SELECT * FROM rv_fund_account WHERE id = ? FOR UPDATE", id);

          require(
              number(fund.get("revision")) == request.revision(),
              "Tài khoản tiền đã thay đổi. Vui lòng mở lại.");

          jdbc.update(
              """
                            UPDATE rv_fund_account
                            SET active = ?, revision = revision + 1
                            WHERE id = ?
                            """,
              request.active(),
              id);

          return new Result(id, fund.get("code").toString(), "CAP_NHAT_SU_DUNG");
        });
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result deleteFund(Long id, String key, DeleteFund request) {

    return once(
        "DOC_FUND_DELETE",
        id,
        key,
        request,
        () -> {
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận xóa quỹ/tài khoản.");

          var fund = row("SELECT * FROM rv_fund_account WHERE id = ? FOR UPDATE", id);

          require(
              number(fund.get("revision")) == request.revision(),
              "Quỹ/tài khoản đã thay đổi. Vui lòng mở lại.");

          require(!yes(fund.get("active")), "Phải ngừng sử dụng quỹ/tài khoản trước khi xóa.");

          Long used =
              jdbc.queryForObject(
                  """
                                    SELECT COUNT(*)
                                    FROM rv_money_context
                                    WHERE fund_id = ?
                                    """,
                  Long.class,
                  id);

          require(
              used != null && used == 0L,
              "Quỹ/tài khoản đã có lịch sử đối chiếu phiếu thu chi, " + "chỉ được ngừng sử dụng.");

          int deleted =
              jdbc.update(
                  """
                                    DELETE FROM rv_fund_account
                                    WHERE id = ? AND revision = ? AND active = FALSE
                                    """,
                  id,
                  request.revision());

          require(deleted == 1, "Không xóa được quỹ/tài khoản.");

          return new Result(id, fund.get("code").toString(), "XOA_QUY_CHUA_SU_DUNG");
        });
  }

  public Object moneyDetail(Long voucherId) {
    context.actor();

    var voucher =
        row(
            """
                        SELECT s.*, n.ho_ten AS creator_name
                        FROM so_quy_thu_chi s
                        LEFT JOIN nguoi_dung n ON n.id = s.nguoi_tao_id
                        WHERE s.id = ?
                        """,
            voucherId);

    var history =
        jdbc.queryForList(
            """
                        SELECT x.*, f.code AS fund_code, f.name AS fund_name,
                               f.kind AS fund_kind, f.bank_name, f.account_number,
                               f.account_holder,
                               e.ho_ten AS cash_employee_name,
                               n.ho_ten AS reconciler_name
                        FROM rv_money_context x
                        JOIN rv_fund_account f ON f.id = x.fund_id
                        LEFT JOIN nguoi_dung e ON e.id = x.cash_employee_id
                        JOIN nguoi_dung n ON n.id = x.reconciler_id
                        WHERE x.voucher_id = ?
                        ORDER BY x.revision DESC
                        """,
            voucherId);

    return sources.safe(
        map(
            "voucher", voucher,
            "current", history.isEmpty() ? null : history.getFirst(),
            "history", history));
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result saveMoney(Long voucherId, String key, MoneyCommand request) {
    return once(
        "DOC_MONEY",
        voucherId,
        key,
        request,
        () -> {
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận đối chiếu.");

          var voucher = row("SELECT * FROM so_quy_thu_chi WHERE id = ? FOR UPDATE", voucherId);

          require(
              "DA_GHI_NHAN".equals(voucher.get("trang_thai")),
              "Chỉ đối chiếu phiếu đang được ghi nhận.");

          Long revision =
              jdbc.queryForObject(
                  """
                                    SELECT COALESCE(MAX(revision), 0)
                                    FROM rv_money_context WHERE voucher_id = ?
                                    """,
                  Long.class,
                  voucherId);

          require(
              Objects.equals(revision, request.revision()),
              "Thông tin đối chiếu đã thay đổi. Vui lòng mở lại.");

          var fund = row("SELECT * FROM rv_fund_account WHERE id = ? FOR UPDATE", request.fundId());

          require(yes(fund.get("active")), "Quỹ/tài khoản đã ngừng sử dụng.");

          String method = voucher.get("phuong_thuc_thanh_toan").toString();
          boolean cash = "TIEN_MAT".equals(method);

          require(
              cash
                  ? "TIEN_MAT".equals(fund.get("kind"))
                  : Set.of("CHUYEN_KHOAN", "THE").contains(method)
                      && "NGAN_HANG".equals(fund.get("kind")),
              "Quỹ/tài khoản không phù hợp phương thức thu chi.");

          Long employeeId = null;

          if (cash) {
            require(request.cashEmployeeId() != null, "Chọn nhân viên thực thu/chi.");
            employeeId = context.employee(request.cashEmployeeId(), context.actor()).getId();
          } else {
            require(
                request.cashEmployeeId() == null,
                "Chuyển khoản/thẻ không gán nhân viên nhận tiền mặt.");
            require(
                request.transactionReference() != null && !request.transactionReference().isBlank(),
                "Nhập mã giao dịch để đối chiếu.");
          }

          jdbc.update(
              """
                            INSERT INTO rv_money_context (
                              voucher_id, revision, fund_id, cash_employee_id,
                              reconciler_id, transaction_source,
                              transaction_reference, note, recorded_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
              voucherId,
              request.revision() + 1,
              request.fundId(),
              employeeId,
              context.actor().getId(),
              cash ? "TIEN_MAT_DOI_CHIEU" : "NHAN_VIEN_DOI_SOAT",
              cash ? null : request.transactionReference().strip(),
              request.note().strip(),
              now());

          return new Result(voucherId, voucher.get("ma_phieu").toString(), "DOI_CHIEU_TIEN");
        });
  }

  private List<Map<String, Object>> documentItems(Long documentId) {
    return jdbc.queryForList(
        """
                SELECT a.*, r.id AS receipt_id, r.code AS receipt_code,
                       r.purchase_id, p.ma_don_nhap, l.supplier_lot,
                       v.ten_phien_ban
                FROM rv_supplier_document_line a
                JOIN rv_receipt_line l ON l.id = a.receipt_line_id
                JOIN rv_receipt r ON r.id = l.receipt_id
                JOIN don_nhap_hang p ON p.id = r.purchase_id
                JOIN phien_ban_san_pham v ON v.id = l.variant_id
                WHERE a.document_id = ?
                ORDER BY r.id, l.id
                """,
        documentId);
  }

  public Object purchase(Long poId) {
    context.actor();

    var purchase = row("SELECT * FROM don_nhap_hang WHERE id = ?", poId);

    var documents =
        jdbc.queryForList(
            """
                        SELECT h.*,
                               COALESCE((
                                 SELECT SUM(a.amount)
                                 FROM rv_supplier_document_line a
                                 WHERE a.document_id = h.id
                               ), 0) AS allocated_amount
                        FROM rv_supplier_document h
                        WHERE h.supplier_id = ?
                        ORDER BY h.id DESC
                        """,
            purchase.get("nha_cung_cap_id"));

    for (var document : documents) {
      document.put("items", documentItems(number(document.get("id"))));
    }

    var lines =
        jdbc.queryForList(
            """
                        SELECT l.*, r.code AS receipt_code, r.source_kind,
                               r.supplier_document, r.recorded_at,
                               v.ten_phien_ban
                        FROM rv_receipt_line l
                        JOIN rv_receipt r ON r.id = l.receipt_id
                        JOIN phien_ban_san_pham v ON v.id = l.variant_id
                        WHERE r.purchase_id = ?
                        ORDER BY r.id, l.id
                        """,
            poId);

    var sales =
        jdbc.queryForList(
            """
                        SELECT DISTINCT t.id AS device_id, t.ma_theo_doi,
                               t.so_serial_id, s.so_serial, v.ten_phien_ban,
                               d.id AS order_id, d.ma_don_hang,
                               d.trang_thai_don_hang, d.trang_thai_xuat_kho,
                               COALESCE(NULLIF(d.ten_nguoi_nhan, ''), n.ho_ten) AS customer_name
                        FROM thiet_bi_bao_hanh t
                        JOIN chi_tiet_don_hang c ON c.id = t.chi_tiet_don_hang_id
                        JOIN don_hang d ON d.id = c.don_hang_id
                        JOIN phien_ban_san_pham v ON v.id = t.phien_ban_id
                        LEFT JOIN nguoi_dung n ON n.id = d.khach_hang_id
                        LEFT JOIN so_serial_san_pham s ON s.id = t.so_serial_id
                        WHERE EXISTS (
                          SELECT 1
                          FROM rv_receipt_serial x
                          JOIN rv_receipt_line l ON l.id = x.receipt_line_id
                          JOIN rv_receipt r ON r.id = l.receipt_id
                          WHERE x.serial_id = t.so_serial_id AND r.purchase_id = ?
                        ) OR EXISTS (
                          SELECT 1
                          FROM rv_device_source x
                          JOIN rv_receipt_line l ON l.id = x.receipt_line_id
                          JOIN rv_receipt r ON r.id = l.receipt_id
                          WHERE x.device_id = t.id AND r.purchase_id = ?
                            AND x.revision = (
                              SELECT MAX(z.revision)
                              FROM rv_device_source z WHERE z.device_id = t.id
                            )
                        )
                        ORDER BY d.id, t.id
                        """,
            poId,
            poId);

    return sources.safe(
        map(
            "purchase", purchase,
            "lines", lines,
            "documents", documents,
            "sales", sales));
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result supplierDocument(Long poId, String key, SupplierDocument request) {

    return once(
        "DOC_SUPPLIER",
        poId,
        key,
        request,
        () -> {
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận chứng từ.");

          var purchase = row("SELECT * FROM don_nhap_hang WHERE id = ? FOR UPDATE", poId);

          require(
              Set.of("PHIEU_GIAO_HANG", "HOA_DON").contains(request.kind()),
              "Loại chứng từ Nhà Cung Cấp không hợp lệ.");

          BigDecimal total = money(request.totalAmount());
          Long documentId = request.documentId();

          if (documentId == null) {
            require(request.revision() == 0, "Phiên bản chứng từ không hợp lệ.");

            documentId =
                insert(
                    """
                                        INSERT INTO rv_supplier_document (
                                          supplier_id, kind, external_number, number_key,
                                          issued_date, total_amount, revision, actor_id, created_at
                                        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
                                        """,
                    purchase.get("nha_cung_cap_id"),
                    request.kind(),
                    request.externalNumber(),
                    digest(request.externalNumber()),
                    java.sql.Date.valueOf(request.issuedDate()),
                    total,
                    context.actor().getId(),
                    now());
          }

          var document =
              row("SELECT * FROM rv_supplier_document WHERE id = ? FOR UPDATE", documentId);

          require(
              number(document.get("supplier_id")) == number(purchase.get("nha_cung_cap_id"))
                  && number(document.get("revision")) == request.revision(),
              "Chứng từ không thuộc Nhà Cung Cấp hoặc đã được cập nhật.");

          require(
              Objects.equals(document.get("kind"), request.kind())
                  && Objects.equals(document.get("external_number"), request.externalNumber())
                  && document.get("issued_date").toString().equals(request.issuedDate().toString())
                  && ((BigDecimal) document.get("total_amount")).compareTo(total) == 0,
              "Nội dung chứng từ đã có không khớp. Vui lòng mở lại.");

          var sorted = new ArrayList<>(request.items());
          sorted.sort(Comparator.comparing(Allocation::receiptLineId));
          var seen = new HashSet<Long>();
          BigDecimal added = BigDecimal.ZERO;

          for (var item : sorted) {
            require(seen.add(item.receiptLineId()), "Dòng nguồn nhận bị gửi trùng.");

            var line =
                row(
                    """
                                        SELECT l.*, r.purchase_id
                                        FROM rv_receipt_line l
                                        JOIN rv_receipt r ON r.id = l.receipt_id
                                        WHERE l.id = ?
                                        FOR UPDATE
                                        """,
                    item.receiptLineId());

            require(
                number(line.get("purchase_id")) == poId,
                "Dòng nguồn nhận không thuộc đơn nhập này.");

            Long linked =
                jdbc.queryForObject(
                    """
                                        SELECT COALESCE(SUM(a.quantity), 0)
                                        FROM rv_supplier_document_line a
                                        JOIN rv_supplier_document h ON h.id = a.document_id
                                        WHERE a.receipt_line_id = ? AND h.kind = ?
                                        """,
                    Long.class,
                    item.receiptLineId(),
                    request.kind());

            require(
                linked != null && linked + item.quantity() <= number(line.get("quantity")),
                "Số lượng liên kết vượt lượng thực nhận của dòng nguồn.");

            require(
                first(
                        """
                                        SELECT document_id FROM rv_supplier_document_line
                                        WHERE document_id = ? AND receipt_line_id = ?
                                        """,
                        documentId,
                        item.receiptLineId())
                    == null,
                "Dòng nguồn này đã liên kết với chứng từ được chọn.");

            added = added.add(money(item.amount()));
          }

          BigDecimal allocated =
              jdbc.queryForObject(
                  """
                                    SELECT COALESCE(SUM(amount), 0)
                                    FROM rv_supplier_document_line WHERE document_id = ?
                                    """,
                  BigDecimal.class,
                  documentId);

          require(
              allocated != null && allocated.add(added).compareTo(total) <= 0,
              "Giá trị phân bổ vượt tổng giá trị chứng từ.");

          for (var item : sorted) {
            jdbc.update(
                """
                                INSERT INTO rv_supplier_document_line (
                                  document_id, receipt_line_id, quantity, amount, actor_id, created_at
                                ) VALUES (?, ?, ?, ?, ?, ?)
                                """,
                documentId,
                item.receiptLineId(),
                item.quantity(),
                money(item.amount()),
                context.actor().getId(),
                now());
          }

          jdbc.update(
              """
                            UPDATE rv_supplier_document
                            SET revision = revision + 1 WHERE id = ?
                            """,
              documentId);

          return new Result(documentId, request.externalNumber(), "LIEN_KET_CHUNG_TU_NCC");
        });
  }

  @Transactional(propagation = Propagation.MANDATORY, readOnly = false)
  public void recordIssue(DonHang order) {
    entityManager.flush();

    var devices =
        jdbc.queryForList(
            """
                        SELECT t.id AS device_id, t.ma_theo_doi,
                               t.chi_tiet_don_hang_id, t.phien_ban_id,
                               t.so_serial_id, s.so_serial
                        FROM thiet_bi_bao_hanh t
                        JOIN chi_tiet_don_hang c ON c.id = t.chi_tiet_don_hang_id
                        LEFT JOIN so_serial_san_pham s ON s.id = t.so_serial_id
                        WHERE c.don_hang_id = ?
                        ORDER BY t.id
                        """,
            order.getId());

    require(!devices.isEmpty(), "Chưa có thiết bị thực tế để lập phiếu xuất.");

    insert(
        """
                INSERT INTO rv_issue (
                  code, order_id, warehouse_id, actor_id, device_snapshot, recorded_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
        numbers.next("XK"),
        order.getId(),
        context.defaultWarehouseId(),
        context.actor().getId(),
        objectMapper.writeValueAsString(devices),
        now());
  }

  private List<Map<String, Object>> deviceRows(Long orderId) {
    return jdbc.queryForList(
        """
                SELECT t.*, v.ten_phien_ban, s.so_serial,
                       d.id AS order_id, d.ma_don_hang, d.trang_thai_xuat_kho,
                       h.id AS return_id, h.ma_tra_hang, h.trang_thai_tra_hang,
                       COALESCE((
                         SELECT MAX(x.revision) FROM rv_device_source x
                         WHERE x.device_id = t.id
                       ), 0) AS source_revision
                FROM thiet_bi_bao_hanh t
                JOIN chi_tiet_don_hang c ON c.id = t.chi_tiet_don_hang_id
                JOIN don_hang d ON d.id = c.don_hang_id
                JOIN phien_ban_san_pham v ON v.id = t.phien_ban_id
                LEFT JOIN so_serial_san_pham s ON s.id = t.so_serial_id
                LEFT JOIN chi_tiet_tra_hang a ON a.id = t.chi_tiet_tra_hang_id
                LEFT JOIN phieu_tra_hang h ON h.id = a.phieu_tra_hang_id
                WHERE d.id = ?
                ORDER BY t.id
                """,
        orderId);
  }

  private Map<String, Object> device(Long id) {
    var base =
        row(
            """
                        SELECT t.*, c.don_hang_id AS order_id
                        FROM thiet_bi_bao_hanh t
                        JOIN chi_tiet_don_hang c ON c.id = t.chi_tiet_don_hang_id
                        WHERE t.id = ?
                        """,
            id);

    return deviceRows(number(base.get("order_id"))).stream()
        .filter(item -> number(item.get("id")) == id)
        .findFirst()
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
  }

  private List<Map<String, Object>> deviceSources(Map<String, Object> device) {
    boolean serial = device.get("so_serial_id") != null;

    String condition =
        serial
            ? """
              EXISTS (
                SELECT 1 FROM rv_receipt_serial x
                WHERE x.receipt_line_id = l.id AND x.serial_id = ?
              )
              """
            : """
              EXISTS (
                SELECT 1 FROM rv_device_source x
                WHERE x.receipt_line_id = l.id AND x.device_id = ?
                  AND x.revision = (
                    SELECT MAX(z.revision) FROM rv_device_source z
                    WHERE z.device_id = x.device_id
                  )
              )
              """;

    var result =
        jdbc.queryForList(
            """
                        SELECT r.*, l.id AS receipt_line_id, l.supplier_lot, l.quantity,
                               p.ma_don_nhap, p.nha_cung_cap_id, n.ten_nha_cung_cap
                        FROM rv_receipt_line l
                        JOIN rv_receipt r ON r.id = l.receipt_id
                        JOIN don_nhap_hang p ON p.id = r.purchase_id
                        JOIN nha_cung_cap n ON n.id = p.nha_cung_cap_id
                        WHERE
                        """
                + condition
                + " ORDER BY r.id, l.id",
            serial ? device.get("so_serial_id") : device.get("id"));

    for (var receipt : result) {
      receipt.put(
          "documents",
          jdbc.queryForList(
              """
                            SELECT h.id, h.kind, h.external_number, h.issued_date,
                                   a.quantity, a.amount
                            FROM rv_supplier_document_line a
                            JOIN rv_supplier_document h ON h.id = a.document_id
                            WHERE a.receipt_line_id = ?
                            ORDER BY h.id
                            """,
              receipt.get("receipt_line_id")));
    }

    return result;
  }

  public Object order(Long orderId) {
    context.actor();

    var order = row("SELECT * FROM don_hang WHERE id = ?", orderId);
    var devices = deviceRows(orderId);

    for (var device : devices) {
      device.put("sources", deviceSources(device));
    }

    return sources.safe(
        map(
            "order", order,
            "issue", first("SELECT * FROM rv_issue WHERE order_id = ?", orderId),
            "devices", devices));
  }

  public Object sourceOptions(Long deviceId) {
    context.actor();
    var device = device(deviceId);

    require(device.get("so_serial_id") == null, "Serial đã có luồng truy vết riêng.");

    return sources.safe(
        jdbc.queryForList(
            """
                        SELECT l.*, r.code AS receipt_code, r.source_kind,
                               r.purchase_id, p.ma_don_nhap, r.supplier_document,
                               n.ten_nha_cung_cap
                        FROM rv_receipt_line l
                        JOIN rv_receipt r ON r.id = l.receipt_id
                        JOIN don_nhap_hang p ON p.id = r.purchase_id
                        JOIN nha_cung_cap n ON n.id = p.nha_cung_cap_id
                        WHERE l.variant_id = ? AND l.serial_managed = FALSE
                        ORDER BY r.id DESC, l.id
                        """,
            device.get("phien_ban_id")));
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result bindSource(Long deviceId, String key, SourceCommand request) {
    return once(
        "DOC_DEVICE_SOURCE",
        deviceId,
        key,
        request,
        () -> {
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận nguồn thực tế.");

          var device = row("SELECT * FROM thiet_bi_bao_hanh WHERE id = ? FOR UPDATE", deviceId);

          require(device.get("so_serial_id") == null, "Không gán lô thủ công cho serial.");

          Long revision =
              jdbc.queryForObject(
                  """
                                    SELECT COALESCE(MAX(revision), 0)
                                    FROM rv_device_source WHERE device_id = ?
                                    """,
                  Long.class,
                  deviceId);

          require(
              Objects.equals(revision, request.revision()),
              "Nguồn thiết bị đã được điều chỉnh. Vui lòng mở lại.");

          var line =
              row("SELECT * FROM rv_receipt_line WHERE id = ? FOR UPDATE", request.receiptLineId());

          require(
              !yes(line.get("serial_managed"))
                  && number(line.get("variant_id")) == number(device.get("phien_ban_id")),
              "Dòng nguồn không đúng phiên bản hoặc đang quản lý serial.");

          Long used =
              jdbc.queryForObject(
                  """
                                    SELECT COUNT(*)
                                    FROM rv_device_source x
                                    JOIN thiet_bi_bao_hanh t ON t.id = x.device_id
                                    WHERE x.receipt_line_id = ? AND x.device_id <> ?
                                      AND x.revision = (
                                        SELECT MAX(z.revision) FROM rv_device_source z
                                        WHERE z.device_id = x.device_id
                                      )
                                      AND NOT EXISTS (
                                        SELECT 1
                                        FROM chi_tiet_tra_hang a
                                        JOIN phieu_tra_hang h ON h.id = a.phieu_tra_hang_id
                                        WHERE a.id = t.chi_tiet_tra_hang_id
                                          AND h.ngay_nhan_hang IS NOT NULL
                                          AND h.trang_thai_tra_hang IN (
                                            'DA_NHAN_HANG', 'DA_HOAN_TIEN', 'HOAN_TAT'
                                          )
                                      )
                                    """,
                  Long.class,
                  request.receiptLineId(),
                  deviceId);

          require(
              used != null && used < number(line.get("quantity")),
              "Dòng nguồn đã liên kết đủ lượng nhận cho các thiết bị chưa trả.");

          jdbc.update(
              """
                            INSERT INTO rv_device_source (
                              device_id, revision, receipt_line_id, note, actor_id, recorded_at
                            ) VALUES (?, ?, ?, ?, ?, ?)
                            """,
              deviceId,
              request.revision() + 1,
              request.receiptLineId(),
              request.note().strip(),
              context.actor().getId(),
              now());

          return new Result(deviceId, device.get("ma_theo_doi").toString(), "XAC_NHAN_NGUON");
        });
  }

  @SuppressWarnings("unchecked")
  public Object trace(Long deviceId) {
    context.actor();
    var device = device(deviceId);

    Map<String, Object> result;

    if (device.get("so_serial_id") != null) {
      result =
          new LinkedHashMap<>(
              (Map<String, Object>) sources.serialTrace(number(device.get("so_serial_id"))));
    } else {
      result =
          map(
              "current", device,
              "devices", List.of(device),
              "warranty",
                  jdbc.queryForList(
                      """
                                    SELECT id, ma_phieu, trang_thai_xu_ly, ket_qua_xu_ly,
                                           ngay_tiep_nhan, thiet_bi_id, thiet_bi_thay_the_id
                                    FROM phieu_bao_hanh
                                    WHERE thiet_bi_id = ? OR thiet_bi_thay_the_id = ?
                                    ORDER BY id
                                    """,
                      deviceId,
                      deviceId),
              "recalls",
                  jdbc.queryForList(
                      """
                                    SELECT i.*, r.code, r.notice_document
                                    FROM rv_recall_item i
                                    JOIN rv_recall r ON r.id = i.recall_id
                                    WHERE i.device_id = ?
                                    ORDER BY i.id
                                    """,
                      deviceId),
              "supplierEvents", List.of());
    }

    result.put("device", device);
    result.put("receipts", deviceSources(device));
    result.put(
        "sourceHistory",
        jdbc.queryForList(
            """
                        SELECT x.*, r.code AS receipt_code, r.purchase_id,
                               p.ma_don_nhap, l.supplier_lot, n.ho_ten AS actor_name
                        FROM rv_device_source x
                        JOIN rv_receipt_line l ON l.id = x.receipt_line_id
                        JOIN rv_receipt r ON r.id = l.receipt_id
                        JOIN don_nhap_hang p ON p.id = r.purchase_id
                        JOIN nguoi_dung n ON n.id = x.actor_id
                        WHERE x.device_id = ?
                        ORDER BY x.revision DESC
                        """,
            deviceId));

    return sources.safe(result);
  }
}
