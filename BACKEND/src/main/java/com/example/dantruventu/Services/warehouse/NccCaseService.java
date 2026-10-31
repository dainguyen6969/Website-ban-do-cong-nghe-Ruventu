package com.example.dantruventu.Services.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderPaymentRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderRefundRequest;
import com.example.dantruventu.DTO.Request.warehouse.NccRequest;
import com.example.dantruventu.Entity.DonNhapHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminPurchaseOrderService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NccCaseService {

  private static final BigDecimal ZERO = new BigDecimal("0.00");
  private static final BigDecimal MAX = new BigDecimal("9999999999999.99");

  private final JdbcTemplate jdbc;
  private final WarehouseSupport warehouse;
  private final SalesContext context;
  private final AdminPurchaseOrderService purchases;
  private final NccAccountingService accounting;
  private final EntityManager entityManager;
  private final ObjectMapper json;
  private final RecallSafety recallSafety;
  private final SourceTraceService sourceTraceService;

  @Value("${ruventu.inventory.time-zone:Asia/Ho_Chi_Minh}")
  private String timeZone;

  public record Result(Long id, String code, String action) {}

  private static final String PURPOSE_SEND = "GUI_HANG_XU_LY";
  private static final String PURPOSE_EXTRA = "NHAN_MUA_BO_SUNG";
  private static final String PURPOSE_LEGACY = "LEGACY";

  private static final Set<String> DOCUMENT_REQUIRED =
      Set.of(
          "GUI",
          "PHUONG_AN",
          "NHAN",
          "GUI_LAI",
          "CHOT_TRA",
          "NHAN_BO_SUNG",
          "PHI",
          "THU_TIEN",
          "CHI_TIEN");

  private String casePurpose(Map<String, Object> supplierCase) {
    String purpose = text(supplierCase.get("purpose"));

    require(
        Set.of(PURPOSE_SEND, PURPOSE_EXTRA, PURPOSE_LEGACY).contains(purpose),
        "Loại hồ sơ không hợp lệ; cần đối soát dữ liệu.");

    return purpose;
  }

  private boolean hasActiveCaseConflict(Long poId, Long excludedCaseId, String purpose) {

    Integer count =
        jdbc.queryForObject(
            """
                        SELECT COUNT(*)
                        FROM ncc_case
                        WHERE source_po_id = ?
                          AND id <> ?
                          AND status = 'DANG_XU_LY'
                          AND (
                                purpose = ?
                                OR purpose = 'LEGACY'
                                OR ? = 'LEGACY'
                              )
                        """,
            Integer.class,
            poId,
            excludedCaseId == null ? 0L : excludedCaseId,
            purpose,
            purpose);

    return count != null && count > 0;
  }

  private void requireAvailableCaseSlot(Long poId, Long excludedCaseId, String purpose) {

    require(
        !hasActiveCaseConflict(poId, excludedCaseId, purpose),
        "Đơn nhập đang có hồ sơ cùng loại hoặc hồ sơ cũ chưa kết thúc. "
            + "Hãy tiếp tục hồ sơ đang có.");
  }

  private void validateCaseAction(Map<String, Object> supplierCase, NccRequest.Command request) {

    String purpose = casePurpose(supplierCase);

    if (PURPOSE_SEND.equals(purpose)) {
      require(
          !"NHAN_BO_SUNG".equals(request.action()),
          "Hồ sơ gửi hàng xử lý không dùng để nhận mua bổ sung.");
    }

    if (PURPOSE_EXTRA.equals(purpose) && "GUI".equals(request.action())) {
      require(
          request.previousUnitId() != null,
          "Hồ sơ nhận mua bổ sung chỉ được gửi xử lý " + "thiết bị đã nhận trong chính hồ sơ này.");
    }
  }

  private String documentReference(Long caseId, String action, String document, long revision) {

    String value = document == null ? "" : document.strip();

    require(value.length() <= 100, "Mã tham chiếu tối đa 100 ký tự.");

    if (!value.isBlank()) {
      return value;
    }

    require(
        !DOCUMENT_REQUIRED.contains(action),
        "Thao tác này cần mã chứng từ hoặc mã thỏa thuận đã đối chiếu.");

    return "NB-HS-" + caseId + "-" + action + "-" + revision;
  }

  private String closeBlocker(Long poId, Long caseId) {
    Integer pending =
        jdbc.queryForObject(
            """
                        SELECT COUNT(*)
                        FROM ncc_unit
                        WHERE case_id = ?
                          AND status IN ('DANG_O_NCC', 'DA_NHAN_LOI')
                        """,
            Integer.class,
            caseId);

    if (pending != null && pending > 0) {
      return "Còn hàng đang ở Nhà Cung Cấp hoặc hàng nhận về chưa xử lý xong.";
    }

    /*
     * Giữ nguyên điều kiện tiền của bản hiện tại:
     * hồ sơ có điều chỉnh giá trị thì công nợ chung của đơn nhập
     * phải được đối chiếu xong trước khi kết thúc.
     */
    if (accounting.caseAdjustments(caseId).signum() != 0) {
      var balance = purchases.getDetail(poId);

      if (balance.getSoTienConNo().signum() != 0
          || balance.getSoTienNccConPhaiHoan().signum() != 0) {

        return "Đơn nhập còn khoản phải trả hoặc khoản Nhà Cung Cấp phải hoàn.";
      }
    }

    return "";
  }

  private ZoneId zone() {
    return ZoneId.of(timeZone);
  }

  private LocalDateTime now() {
    return LocalDateTime.now(zone());
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }

  private void require(boolean condition, String message) {
    if (!condition) throw conflict(message);
  }

  private Long id(Object value) {
    return value == null ? null : ((Number) value).longValue();
  }

  private int integer(Object value) {
    require(value instanceof Number, "Dữ liệu số lượng bị thiếu.");
    return ((Number) value).intValue();
  }

  private boolean bool(Object value) {
    return Boolean.TRUE.equals(value) || value instanceof Number n && n.intValue() != 0;
  }

  private String text(Object value) {
    return value == null ? "" : value.toString();
  }

  private BigDecimal decimal(Object value) {
    require(value != null, "Dữ liệu tiền bị thiếu.");
    return value instanceof BigDecimal b ? b : new BigDecimal(value.toString());
  }

  private BigDecimal money(BigDecimal value, boolean signed) {
    require(value != null, "Thiếu số tiền hoặc giá trị hàng.");

    BigDecimal normalized;
    try {
      normalized = value.setScale(2, RoundingMode.UNNECESSARY);
    } catch (ArithmeticException exception) {
      throw conflict("Số tiền chỉ được có tối đa hai chữ số thập phân.");
    }

    require(
        normalized.abs().compareTo(MAX) <= 0 && (signed || normalized.signum() >= 0),
        "Số tiền vượt giới hạn hoặc có giá trị âm.");
    return normalized;
  }

  private LocalDateTime timestamp(Object value) {
    if (value instanceof Timestamp t) return t.toLocalDateTime();
    if (value instanceof LocalDateTime t) return t;
    throw conflict("Dữ liệu thời gian không hợp lệ.");
  }

  private LocalDateTime actual(OffsetDateTime at, DonNhapHang order) {
    require(at != null, "Thiếu thời điểm thực hiện.");
    require(!at.toInstant().isAfter(Instant.now()), "Thời điểm nằm trong tương lai.");

    LocalDateTime result = at.atZoneSameInstant(zone()).toLocalDateTime();

    require(
        !result.isBefore(order.getNgayTao().truncatedTo(ChronoUnit.MINUTES)),
        "Thời điểm thực hiện nằm trước khi tạo đơn nhập.");
    return result;
  }

  private Map<String, Object> row(String sql, Object... args) {
    List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
    require(rows.size() == 1, "Không tìm thấy dữ liệu hoặc dữ liệu bị trùng.");
    return rows.get(0);
  }

  private long insert(String sql, Object... values) {
    GeneratedKeyHolder holder = new GeneratedKeyHolder();

    jdbc.update(
        connection -> {
          PreparedStatement statement =
              connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
          for (int i = 0; i < values.length; i++) {
            Object value = values[i];
            statement.setObject(
                i + 1, value instanceof LocalDateTime t ? Timestamp.valueOf(t) : value);
          }
          return statement;
        },
        holder);

    require(holder.getKey() != null, "Không lấy được mã bản ghi vừa tạo.");
    return holder.getKey().longValue();
  }

  private DonNhapHang lockOrder(Long poId) {
    DonNhapHang order = purchases.lockForNcc(poId);

    require(
        order.getTrangThaiNhap() != TrangThaiNhapHang.DAT_HANG
            && order.getTrangThaiNhap() != TrangThaiNhapHang.HUY,
        "Đơn nhập chưa được duyệt hoặc đã bị hủy.");

    context.warehouse(context.defaultWarehouseId());
    return order;
  }

  private Map<String, Object> lockCase(Long poId, Long caseId) {
    Map<String, Object> c = row("SELECT * FROM ncc_case WHERE id = ? FOR UPDATE", caseId);

    require(Objects.equals(id(c.get("source_po_id")), poId), "Hồ sơ không thuộc đơn nhập.");
    require(
        Objects.equals(id(c.get("warehouse_id")), context.defaultWarehouseId()),
        "Kho của hồ sơ không còn khớp kho đang được cấu hình.");
    return c;
  }

  private Map<String, Object> unit(Long caseId, Long unitId) {
    require(unitId != null, "Chưa chọn thiết bị.");

    Map<String, Object> u = row("SELECT * FROM ncc_unit WHERE id = ? FOR UPDATE", unitId);

    require(Objects.equals(id(u.get("case_id")), caseId), "Thiết bị không thuộc hồ sơ.");
    return u;
  }

  private PhienBanSanPham variant(Long variantId) {
    require(variantId != null && variantId > 0, "Chưa chọn phiên bản.");
    PhienBanSanPham v = warehouse.lockVariant(variantId);

    require(
        v.getSanPham().getLoaiSanPham() == LoaiSanPham.DON,
        "Chỉ xử lý hàng vật lý thuộc sản phẩm đơn.");
    require(v.getCoQuanLySerial() != null, "Phiên bản chưa cấu hình quản lý serial.");
    return v;
  }

  private Map<Long, PhienBanSanPham> variants(Long... ids) {
    Map<Long, PhienBanSanPham> result = new TreeMap<>();

    Arrays.stream(ids)
        .filter(Objects::nonNull)
        .distinct()
        .sorted()
        .forEach(value -> result.put(value, variant(value)));

    return result;
  }

  private int movement(Long poId, Long variantId, String type) {
    return jdbc.queryForObject(
        """
                SELECT COALESCE(SUM(so_luong_thay_doi), 0)
                FROM the_kho
                WHERE ma_chung_tu_goc = ?
                  AND phien_ban_id = ?
                  AND loai_giao_dich = ?
                """,
        Integer.class,
        poId,
        variantId,
        type);
  }

  private Map<String, Object> source(Long poId, Long detailId) {
    return row(
        """
                SELECT *
                FROM chi_tiet_don_nhap
                WHERE id = ? AND don_nhap_hang_id = ?
                """,
        detailId,
        poId);
  }

  private int originalCapacity(Long poId, Map<String, Object> d) {
    Long v = id(d.get("phien_ban_id"));
    int ordered = integer(d.get("so_luong"));
    int imported = Math.max(0, movement(poId, v, "NHAP_HANG"));
    int returned = Math.abs(movement(poId, v, "TRA_NCC"));

    int unbilledExcess = Math.max(imported - ordered - accounting.legacyExtraAssigned(poId, v), 0);

    int financiallyReturned = Math.min(Math.max(returned - unbilledExcess, 0), ordered);

    return Math.max(
        0,
        Math.min(imported, ordered) - financiallyReturned - accounting.originalAssigned(poId, v));
  }

  private int legacyExtraCapacity(Long poId, Map<String, Object> d) {
    Long v = id(d.get("phien_ban_id"));
    int imported = Math.max(0, movement(poId, v, "NHAP_HANG"));
    int returned = Math.abs(movement(poId, v, "TRA_NCC"));

    return Math.max(
        0,
        imported - integer(d.get("so_luong")) - returned - accounting.legacyExtraAssigned(poId, v));
  }

  private Map<String, Object> stock(Long warehouseId, Long variantId) {
    recallSafety.reconcileJdbc(warehouseId, variantId);

    List<Map<String, Object>> rows =
        jdbc.queryForList(
            """
                        SELECT * FROM ton_kho
                        WHERE kho_hang_id = ? AND phien_ban_id = ?
                        FOR UPDATE
                        """,
            warehouseId,
            variantId);

    if (rows.isEmpty()) {
      jdbc.update(
          """
                    INSERT INTO ton_kho (
                      kho_hang_id, phien_ban_id, ton_thuc_te, ton_co_the_ban,
                      hang_loi, so_luong_giu_cho_bao_hanh, muc_ton_toi_thieu
                    ) VALUES (?, ?, 0, 0, 0, 0, 0)
                    """,
          warehouseId,
          variantId);

      rows =
          jdbc.queryForList(
              """
                            SELECT * FROM ton_kho
                            WHERE kho_hang_id = ? AND phien_ban_id = ?
                            FOR UPDATE
                            """,
              warehouseId,
              variantId);
    }

    require(rows.size() == 1, "Tồn kho bị trùng.");
    Map<String, Object> s = rows.get(0);
    held(s);
    return s;
  }

  private long held(Map<String, Object> stock) {
    int actual = integer(stock.get("ton_thuc_te"));
    int available = integer(stock.get("ton_co_the_ban"));
    int damaged = integer(stock.get("hang_loi"));
    int warranty = integer(stock.get("so_luong_giu_cho_bao_hanh"));
    int quarantine = integer(stock.get("so_luong_cach_ly_thu_hoi"));

    long held = (long) actual - available - damaged - warranty - quarantine;

    require(
        actual >= 0
            && available >= 0
            && damaged >= 0
            && warranty >= 0
            && quarantine >= 0
            && held >= 0,
        "Tồn kho không nhất quán; cần đối soát.");

    return held;
  }

  private void move(
      Long warehouseId,
      Long variantId,
      int actualDelta,
      int availableDelta,
      int damagedDelta,
      String type,
      Long caseId,
      LocalDateTime at) {

    moveStock(
        warehouseId, variantId, actualDelta, availableDelta, damagedDelta, 0, type, caseId, at);
  }

  private void moveStock(
      Long warehouseId,
      Long variantId,
      int actualDelta,
      int availableDelta,
      int damagedDelta,
      int quarantineDelta,
      String type,
      Long caseId,
      LocalDateTime at) {

    Map<String, Object> stock = stock(warehouseId, variantId);
    long beforeHeld = held(stock);

    int actual;
    int available;
    int damaged;
    int quarantine;

    try {
      actual = Math.addExact(integer(stock.get("ton_thuc_te")), actualDelta);
      available = Math.addExact(integer(stock.get("ton_co_the_ban")), availableDelta);
      damaged = Math.addExact(integer(stock.get("hang_loi")), damagedDelta);
      quarantine = Math.addExact(integer(stock.get("so_luong_cach_ly_thu_hoi")), quarantineDelta);
    } catch (ArithmeticException exception) {
      throw conflict("Số lượng tồn vượt giới hạn.");
    }

    require(
        actual >= 0 && available >= 0 && damaged >= 0 && quarantine >= 0,
        "Không đủ tồn đúng loại để thực hiện.");

    long afterHeld =
        (long) actual
            - available
            - damaged
            - integer(stock.get("so_luong_giu_cho_bao_hanh"))
            - quarantine;

    require(beforeHeld == afterHeld, "Thao tác làm thay đổi lượng đang giữ cho đơn.");

    jdbc.update(
        """
                UPDATE ton_kho
                SET ton_thuc_te = ?, ton_co_the_ban = ?,
                    hang_loi = ?, so_luong_cach_ly_thu_hoi = ?
                WHERE id = ?
                """,
        actual,
        available,
        damaged,
        quarantine,
        id(stock.get("id")));

    jdbc.update(
        """
                INSERT INTO the_kho (
                  kho_hang_id, phien_ban_id, loai_giao_dich,
                  ma_chung_tu_goc, so_luong_thay_doi,
                  ton_cuoi, ghi_chu, ngay_tao
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
        warehouseId,
        variantId,
        type,
        caseId,
        actualDelta,
        actual,
        "Xử lý Nhà Cung Cấp #" + caseId,
        Timestamp.valueOf(at));
  }

  private Map<String, Object> ownedSerial(
      Long serialId, Long poId, Long variantId, boolean outgoing) {

    Map<String, Object> s =
        row("SELECT * FROM so_serial_san_pham WHERE id = ? FOR UPDATE", serialId);

    require(
        Objects.equals(id(s.get("phien_ban_id")), variantId)
            && Objects.equals(id(s.get("don_nhap_hang_id")), poId)
            && s.get("don_hang_id") == null
            && s.get("chi_tiet_dong_goi_id") == null,
        "Serial không còn thuộc hàng cửa hàng có thể xử lý.");

    if (outgoing) {
      require(
          Set.of("TRONG_KHO", "LOI").contains(text(s.get("trang_thai"))),
          "Serial không còn nằm trong kho.");
      require(
          s.get("ngay_kich_hoat") == null && s.get("han_bao_hanh") == null,
          "Serial có dấu vết kích hoạt; cần đối soát quyền sở hữu.");

      Long active =
          entityManager
              .createQuery(
                  """
                                    select count(p.id)
                                    from PhieuBaoHanh p
                                    left join p.soSerial sourceSerial
                                    left join p.thietBi device
                                    left join device.soSerial deviceSerial
                                    left join p.thietBiThayThe replacement
                                    left join replacement.soSerial replacementSerial
                                    where p.trangThaiXuLy <> :completed
                                      and (
                                        sourceSerial.id = :id
                                        or deviceSerial.id = :id
                                        or replacementSerial.id = :id
                                      )
                                    """,
                  Long.class)
              .setParameter("completed", TrangThaiBaoHanh.HOAN_TAT)
              .setParameter("id", serialId)
              .getSingleResult();

      require(active == 0, "Serial đang thuộc hồ sơ bảo hành chưa hoàn tất.");
    } else {
      require(
          "DANG_GUI_NCC".equals(text(s.get("trang_thai"))),
          "Serial không còn ở trạng thái đang gửi NCC.");
    }

    return s;
  }

  private String condition(String value, boolean passed) {
    String result = value == null ? "CHUA_XAC_DINH" : value;

    require(
        Set.of("MOI", "DA_SUA_CHUA", "DA_QUA_SU_DUNG", "CHUA_XAC_DINH").contains(result),
        "Tình trạng hàng không hợp lệ.");
    require(!passed || !"CHUA_XAC_DINH".equals(result), "Phải xác định tình trạng hàng.");
    return result;
  }

  private Long newSerial(Long poId, Long variantId, String code, String condition, boolean passed) {

    require(code != null && !code.isBlank(), "Thiếu serial hàng nhận.");
    code = code.strip();
    require(code.length() <= 100, "Serial tối đa 100 ký tự.");

    require(
        jdbc.queryForObject(
                "SELECT COUNT(*) FROM so_serial_san_pham WHERE so_serial = ?", Integer.class, code)
            == 0,
        "Serial đã tồn tại trong hệ thống: " + code);

    try {
      return insert(
          """
                    INSERT INTO so_serial_san_pham (
                      phien_ban_id, so_serial, trang_thai, don_nhap_hang_id, tinh_trang_hang
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
          variantId,
          code,
          passed ? "TRONG_KHO" : "LOI",
          poId,
          condition);
    } catch (DuplicateKeyException exception) {
      throw conflict("Serial vừa được sử dụng bởi giao dịch khác: " + code);
    }
  }

  private long event(
      Long caseId,
      Long unitId,
      String action,
      Long oldSerial,
      Long newSerial,
      Long voucherId,
      String document,
      String note,
      Object payload,
      Long actorId,
      LocalDateTime at) {

    return insert(
        """
                INSERT INTO ncc_event (
                  case_id, unit_id, action, old_serial_id, new_serial_id,
                  voucher_id, document, note, payload, actor_id, occurred_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)
                """,
        caseId,
        unitId,
        action,
        oldSerial,
        newSerial,
        voucherId,
        document,
        note,
        json.writeValueAsString(payload),
        actorId,
        at,
        now());
  }

  private void adjustment(
      DonNhapHang order,
      Long eventId,
      Long unitId,
      String kind,
      BigDecimal oldValue,
      BigDecimal credit,
      BigDecimal newValue,
      BigDecimal fee) {

    BigDecimal delta = newValue.subtract(credit).add(fee);

    BigDecimal effective = purchases.getDetail(order.getId()).getGiaTriSauTra().add(delta);

    require(
        effective.signum() >= 0 && effective.compareTo(MAX) <= 0,
        "Điều chỉnh làm nghĩa vụ NCC âm hoặc vượt giới hạn.");

    jdbc.update(
        """
                INSERT INTO ncc_adjustment (
                  event_id, source_po_id, unit_id, kind,
                  old_value, credit, new_value, fee
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
        eventId,
        order.getId(),
        unitId,
        kind,
        oldValue,
        credit,
        newValue,
        fee);
  }

  private long addUnit(
      Long caseId,
      Long detailId,
      Long parentId,
      Long rootId,
      String origin,
      Long variantId,
      Long serialId,
      String method,
      String state,
      boolean planned,
      BigDecimal bookValue,
      String condition,
      LocalDateTime at) {

    long unitId =
        insert(
            """
                        INSERT INTO ncc_unit (
                          case_id, source_line_id, parent_id, root_id, origin,
                          variant_id, expected_variant_id, initial_serial_id, serial_id,
                          method, status, planned, book_value, receive_value,
                          condition_code, last_moved_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
            caseId,
            detailId,
            parentId,
            rootId,
            origin,
            variantId,
            variantId,
            serialId,
            serialId,
            method,
            state,
            planned,
            bookValue,
            bookValue,
            condition,
            at);

    if (rootId == null) {
      jdbc.update("UPDATE ncc_unit SET root_id = ? WHERE id = ?", unitId, unitId);
    }

    return unitId;
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result open(Long poId, String key, NccRequest.Open request) {
    NguoiDung actor = context.actor();

    return warehouse.once(
        "NCC_OPEN",
        poId,
        key,
        request,
        actor.getId(),
        Result.class,
        () -> {
          DonNhapHang order = lockOrder(poId);
          LocalDateTime at = actual(request.at(), order);

          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận tạo hồ sơ.");

          String purpose = request.purpose();

          require(
              purpose != null && Set.of(PURPOSE_SEND, PURPOSE_EXTRA).contains(purpose),
              "Chọn loại hồ sơ gửi hàng xử lý hoặc nhận mua bổ sung.");

          /*
           * Đơn nhập đã được khóa bởi lockOrder().
           * Kiểm tra giới hạn ngay trong giao dịch, không chỉ dựa vào FE.
           */
          requireAvailableCaseSlot(poId, null, purpose);

          Long employeeId = context.employee(request.employeeId(), actor).getId();

          String code = "XLNCC-" + UUID.randomUUID().toString().replace("-", "");

          long caseId =
              insert(
                  """
                                    INSERT INTO ncc_case (
                                      source_po_id, warehouse_id, code, status, purpose,
                                      reason, employee_id, deadline, revision, created_at
                                    ) VALUES (?, ?, ?, 'DANG_XU_LY', ?, ?, ?, ?, 0, ?)
                                    """,
                  poId,
                  context.defaultWarehouseId(),
                  code,
                  purpose,
                  request.reason().strip(),
                  employeeId,
                  request.deadline() == null
                      ? null
                      : request.deadline().atZoneSameInstant(zone()).toLocalDateTime(),
                  now());

          event(
              caseId,
              null,
              "MO_HO_SO",
              null,
              null,
              null,
              documentReference(caseId, "MO_HO_SO", request.document(), 0L),
              request.reason().strip(),
              request,
              actor.getId(),
              at);

          return new Result(caseId, code, "MO_HO_SO");
        });
  }

  @Transactional(readOnly = false, isolation = Isolation.READ_COMMITTED)
  public Result execute(Long poId, Long caseId, String key, NccRequest.Command request) {

    NguoiDung actor = context.actor();

    return warehouse.once(
        "NCC_EVENT",
        caseId,
        key,
        List.of(poId, request),
        actor.getId(),
        Result.class,
        () -> {
          DonNhapHang order = lockOrder(poId);
          Map<String, Object> c = lockCase(poId, caseId);

          require(
              Objects.equals(id(c.get("revision")), request.revision()),
              "Hồ sơ đã thay đổi. Hãy mở lại thao tác.");
          require(Boolean.TRUE.equals(request.confirmed()), "Chưa xác nhận thao tác.");

          String action = request.action();
          String state = text(c.get("status"));

          require("DANG_XU_LY".equals(state) || "MO_LAI".equals(action), "Hồ sơ đã kết thúc.");

          LocalDateTime at = actual(request.at(), order);

          validateCaseAction(c, request);

          documentReference(caseId, action, request.document(), id(c.get("revision")) + 1L);

          switch (action) {
            case "GUI" -> send(order, c, request, actor, at);
            case "NHAN_BO_SUNG" -> extra(order, c, request, actor, at);

            case "PHUONG_AN", "NHAN", "GUI_LAI", "CHOT_TRA", "CHAP_NHAN_LOI" ->
                handleUnit(order, c, request, actor, at);

            case "PHI" -> {
              BigDecimal fee = money(request.amount(), true);
              require(fee.signum() != 0, "Phí điều chỉnh phải khác 0.");
              require(
                  accounting.caseFees(caseId).add(fee).signum() >= 0,
                  "Không được giảm phí vượt phần phí đã chốt.");

              long eventId = log(c, null, request, actor, at, null, null, null);

              adjustment(order, eventId, null, "FEE", ZERO, ZERO, ZERO, fee);
            }

            case "THU_TIEN", "CHI_TIEN" -> cash(order, c, request, actor, key, at);

            case "THEO_DOI" -> {
              Long employeeId = context.employee(request.employeeId(), actor).getId();

              jdbc.update(
                  "UPDATE ncc_case SET employee_id = ?, deadline = ? WHERE id = ?",
                  employeeId,
                  request.deadline() == null
                      ? null
                      : Timestamp.valueOf(
                          request.deadline().atZoneSameInstant(zone()).toLocalDateTime()),
                  caseId);

              log(c, null, request, actor, at, null, null, null);
            }

            case "MO_LAI" -> {
              require(!"DANG_XU_LY".equals(state), "Hồ sơ đang được xử lý.");

              requireAvailableCaseSlot(poId, caseId, casePurpose(c));

              jdbc.update("UPDATE ncc_case SET status = 'DANG_XU_LY' WHERE id = ?", caseId);

              log(c, null, request, actor, at, null, null, null);
            }

            case "KET_THUC" -> {
              String blocker = closeBlocker(poId, caseId);
              require(blocker.isEmpty(), blocker);

              Integer acceptedFault =
                  jdbc.queryForObject(
                      """
                                    SELECT COUNT(*)
                                    FROM ncc_unit
                                    WHERE case_id = ?
                                      AND status = 'CHAP_NHAN_LOI'
                                    """,
                      Integer.class,
                      caseId);

              jdbc.update(
                  "UPDATE ncc_case SET status = ? WHERE id = ?",
                  acceptedFault != null && acceptedFault > 0 ? "KET_THUC_DOI_SOAT" : "HOAN_TAT",
                  caseId);

              log(c, null, request, actor, at, null, null, null);
            }

            default -> throw conflict("Thao tác NCC không hợp lệ.");
          }

          jdbc.update("UPDATE ncc_case SET revision = revision + 1 WHERE id = ?", caseId);

          for (Long variantId :
              jdbc.queryForList(
                  """
                            SELECT DISTINCT variant_id
                            FROM ncc_unit
                            WHERE case_id = ?
                            ORDER BY variant_id
                            """,
                  Long.class,
                  caseId)) {

            recallSafety.reconcileJdbc(context.defaultWarehouseId(), variantId);
          }

          purchases.synchronizeNcc(poId);

          return new Result(caseId, text(c.get("code")), action);
        });
  }

  private long log(
      Map<String, Object> c,
      Long unitId,
      NccRequest.Command request,
      NguoiDung actor,
      LocalDateTime at,
      Long oldSerial,
      Long newSerial,
      Long voucherId) {

    long eventId =
        event(
            id(c.get("id")),
            unitId,
            request.action(),
            oldSerial,
            newSerial,
            voucherId,
            documentReference(
                id(c.get("id")), request.action(), request.document(), id(c.get("revision")) + 1L),
            request.note().strip(),
            request,
            actor.getId(),
            at);

    sourceTraceService.recordNccReceipt(
        eventId,
        id(c.get("id")),
        unitId,
        request.action(),
        newSerial,
        request.document(),
        Boolean.TRUE.equals(request.alreadyInStock()));

    return eventId;
  }

  private void send(
      DonNhapHang order,
      Map<String, Object> c,
      NccRequest.Command request,
      NguoiDung actor,
      LocalDateTime at) {

    Long poId = order.getId();
    Long caseId = id(c.get("id"));
    Long warehouseId = id(c.get("warehouse_id"));

    String method = request.method();
    require(
        method != null && Set.of("SUA_CHUA", "DOI_HANG", "TRA_HANG").contains(method),
        "Chưa chọn mục đích gửi NCC.");

    Map<String, Object> previous = null;
    Long detailId = request.detailId();

    if (request.previousUnitId() != null) {
      previous =
          row(
              """
                            SELECT u.*, c.source_po_id
                            FROM ncc_unit u
                            JOIN ncc_case c ON c.id = u.case_id
                            WHERE u.id = ? FOR UPDATE
                            """,
              request.previousUnitId());

      require(
          Objects.equals(id(previous.get("source_po_id")), poId)
              && Set.of("DA_NHAN_DAT", "CHAP_NHAN_LOI").contains(text(previous.get("status"))),
          "Thiết bị chưa đủ điều kiện mở lần xử lý tiếp theo.");

      require(
          jdbc.queryForObject(
                  "SELECT COUNT(*) FROM ncc_unit WHERE parent_id = ?",
                  Integer.class,
                  request.previousUnitId())
              == 0,
          "Thiết bị đã có lần xử lý tiếp theo.");

      require(
          !at.isBefore(timestamp(previous.get("last_moved_at"))),
          "Thời điểm gửi nằm trước lần nhận gần nhất.");

      if (PURPOSE_EXTRA.equals(casePurpose(c))) {
        require(
            Objects.equals(id(previous.get("case_id")), caseId)
                && Set.of("EXTRA", "LEGACY_EXTRA").contains(text(previous.get("origin"))),
            "Chỉ được gửi xử lý hàng bổ sung thuộc chính hồ sơ này.");
      }

      detailId = id(previous.get("source_line_id"));
    }

    Map<String, Object> d = source(poId, detailId);
    Long variantId = previous == null ? id(d.get("phien_ban_id")) : id(previous.get("variant_id"));

    PhienBanSanPham v = variant(variantId);

    List<Long> serialIds = request.serialIds() == null ? List.of() : request.serialIds();

    int quantity = request.quantity() == null ? 0 : request.quantity();
    int defects = request.damagedQuantity() == null ? 0 : request.damagedQuantity();

    if (previous != null) {
      quantity = 1;
      serialIds =
          previous.get("serial_id") == null ? List.of() : List.of(id(previous.get("serial_id")));
    }

    require(quantity > 0 && quantity <= 100, "Mỗi lần gửi từ 1 đến 100 thiết bị.");
    require(defects >= 0 && defects <= quantity, "Số lượng lỗi không hợp lệ.");

    if (previous != null
        && !Boolean.TRUE.equals(v.getCoQuanLySerial())
        && "CHAP_NHAN_LOI".equals(text(previous.get("status")))) {

      require(
          defects == 1,
          "Thiết bị đang được theo dõi là hàng lỗi; "
              + "khi gửi tiếp phải lấy từ hàng lỗi, không lấy từ tồn có thể bán.");
    }

    if (previous == null) {
      require(
          quantity <= originalCapacity(poId, d),
          "Vượt số lượng nguồn chưa được đưa vào hồ sơ NCC.");
    }

    if (Boolean.TRUE.equals(v.getCoQuanLySerial())) {
      require(
          serialIds.size() == quantity
              && serialIds.stream().allMatch(Objects::nonNull)
              && new HashSet<>(serialIds).size() == quantity,
          "Phải chọn đủ serial và không được trùng.");
    } else {
      require(serialIds.isEmpty(), "Hàng không quản lý serial phải gửi danh sách rỗng.");
    }

    stock(warehouseId, variantId);

    List<Map<String, Object>> selected = new ArrayList<>();

    for (Long serialId : serialIds.stream().sorted().toList()) {
      if (previous == null) {
        require(
            !accounting.trackedSerial(serialId),
            "Serial đã có hồ sơ; hãy chọn xử lý tiếp từ thiết bị của hồ sơ cũ.");
      }
      selected.add(ownedSerial(serialId, poId, variantId, true));
    }

    if (!selected.isEmpty()) {
      defects =
          (int) selected.stream().filter(s -> "LOI".equals(text(s.get("trang_thai")))).count();
    }

    BigDecimal bookValue =
        previous != null
            ? decimal(previous.get("book_value"))
            : decimal(d.get("gia_nhap"))
                .multiply(
                    Boolean.TRUE.equals(order.getApDungThue())
                        ? new BigDecimal("1.10")
                        : BigDecimal.ONE)
                .setScale(2, RoundingMode.HALF_UP);

    for (int i = 0; i < quantity; i++) {
      Map<String, Object> s = selected.isEmpty() ? null : selected.get(i);
      Long serialId = s == null ? null : id(s.get("id"));

      boolean faulty = s == null ? i < defects : "LOI".equals(text(s.get("trang_thai")));

      String condition =
          s == null
              ? previous == null ? "CHUA_XAC_DINH" : text(previous.get("condition_code"))
              : text(s.get("tinh_trang_hang"));

      boolean quarantined =
          !faulty
              && (s == null ? recallSafety.variantBlocked(variantId) : bool(s.get("bi_thu_hoi")));

      moveStock(
          warehouseId,
          variantId,
          -1,
          faulty || quarantined ? 0 : -1,
          faulty ? -1 : 0,
          quarantined ? -1 : 0,
          "GUI_XU_LY_NCC",
          caseId,
          at);

      if (serialId != null) {
        jdbc.update(
            "UPDATE so_serial_san_pham SET trang_thai = 'DANG_GUI_NCC' WHERE id = ?", serialId);
      }

      long unitId =
          addUnit(
              caseId,
              detailId,
              previous == null ? null : id(previous.get("id")),
              previous == null ? null : id(previous.get("root_id")),
              previous == null ? "ORIGINAL" : text(previous.get("origin")),
              variantId,
              serialId,
              method,
              "DANG_O_NCC",
              "SUA_CHUA".equals(method),
              bookValue,
              condition,
              at);

      log(c, unitId, request, actor, at, serialId, serialId, null);
    }
  }

  private void extra(
      DonNhapHang order,
      Map<String, Object> c,
      NccRequest.Command request,
      NguoiDung actor,
      LocalDateTime at) {

    Map<String, Object> d = source(order.getId(), request.detailId());

    Long variantId = id(d.get("phien_ban_id"));
    PhienBanSanPham v = variant(variantId);

    int quantity = request.quantity() == null ? 0 : request.quantity();

    require(quantity > 0 && quantity <= 100, "Mỗi lần nhận từ 1 đến 100 thiết bị.");

    boolean alreadyInStock = Boolean.TRUE.equals(request.alreadyInStock());

    boolean managed = Boolean.TRUE.equals(v.getCoQuanLySerial());

    boolean passed = Boolean.TRUE.equals(request.passed());

    if (!alreadyInStock) {
      require(request.passed() != null, "Chưa xác nhận kết quả kiểm tra hàng.");
    }

    String receivedCondition =
        alreadyInStock ? "CHUA_XAC_DINH" : condition(request.condition(), passed);

    BigDecimal value = money(request.value(), false);

    List<String> codes = request.serialCodes() == null ? List.of() : request.serialCodes();

    List<Long> ids = request.serialIds() == null ? List.of() : request.serialIds();

    if (alreadyInStock) {
      require(
          quantity <= legacyExtraCapacity(order.getId(), d),
          "Không còn số lượng nhập thừa cũ chưa được chốt nhận mua.");

      require(codes.isEmpty(), "Không tạo serial mới khi đối chiếu hàng đã nhập.");

      if (managed) {
        require(
            ids.size() == quantity
                && ids.stream().allMatch(valueId -> valueId != null && valueId > 0)
                && new HashSet<>(ids).size() == quantity,
            "Phải chọn đúng số lượng serial nhập thừa, không được trùng.");
      } else {
        require(ids.isEmpty(), "Phiên bản không quản lý serial.");
      }
    } else {
      require(ids.isEmpty(), "Nhận mới không được dùng serial đã tồn tại.");

      if (managed) {
        require(codes.size() == quantity, "Thiếu serial hàng nhận bổ sung.");
      } else {
        require(codes.isEmpty(), "Phiên bản không quản lý serial.");
      }
    }

    Long caseId = id(c.get("id"));
    Long warehouseId = id(c.get("warehouse_id"));

    Map<String, Object> inventory = stock(warehouseId, variantId);

    List<Map<String, Object>> existing = new ArrayList<>();

    for (Long serialId : ids.stream().sorted().toList()) {
      require(!accounting.trackedSerial(serialId), "Serial đã có hồ sơ xử lý NCC.");

      existing.add(ownedSerial(serialId, order.getId(), variantId, true));
    }

    int existingDefects = 0;

    if (alreadyInStock) {
      if (managed) {
        existingDefects =
            (int)
                existing.stream()
                    .filter(serial -> "LOI".equals(text(serial.get("trang_thai"))))
                    .count();
      } else {
        require(request.damagedQuantity() != null, "Phải khai số lượng hàng lỗi đang có.");

        existingDefects = request.damagedQuantity();

        require(
            existingDefects >= 0 && existingDefects <= quantity, "Số lượng hàng lỗi không hợp lệ.");
      }

      int normalQuantity = quantity - existingDefects;

      require(
          integer(inventory.get("hang_loi")) >= existingDefects,
          "Số lượng hàng lỗi trong kho không đủ để đối chiếu.");

      require(
          (long) integer(inventory.get("ton_co_the_ban"))
                  + integer(inventory.get("so_luong_cach_ly_thu_hoi"))
              >= normalQuantity,
          "Không đủ hàng tự do trong kho để đối chiếu phần hàng thừa. "
              + "Cần kiểm tra hàng đã bán hoặc đang được giữ.");
    }

    for (int i = 0; i < quantity; i++) {
      Long serialId = null;

      boolean faulty =
          alreadyInStock
              ? managed
                  ? "LOI".equals(text(existing.get(i).get("trang_thai")))
                  : i < existingDefects
              : !passed;

      String actualCondition = receivedCondition;

      if (managed) {
        if (alreadyInStock) {
          Map<String, Object> serial = existing.get(i);

          serialId = id(serial.get("id"));
          actualCondition = text(serial.get("tinh_trang_hang"));

          if (actualCondition.isBlank()) {
            actualCondition = "CHUA_XAC_DINH";
          }
        } else {
          serialId = newSerial(order.getId(), variantId, codes.get(i), receivedCondition, passed);
        }
      }

      if (!alreadyInStock) {
        move(
            warehouseId,
            variantId,
            1,
            faulty ? 0 : 1,
            faulty ? 1 : 0,
            "NHAP_BO_SUNG_NCC",
            caseId,
            at);
      }

      long unitId =
          addUnit(
              caseId,
              request.detailId(),
              null,
              null,
              alreadyInStock ? "LEGACY_EXTRA" : "EXTRA",
              variantId,
              serialId,
              "DOI_HANG",
              faulty ? "DA_NHAN_LOI" : "DA_NHAN_DAT",
              false,
              value,
              actualCondition,
              at);

      long eventId = log(c, unitId, request, actor, at, null, serialId, null);

      adjustment(order, eventId, unitId, "EXTRA", ZERO, ZERO, value, ZERO);
    }
  }

  private void handleUnit(
      DonNhapHang order,
      Map<String, Object> c,
      NccRequest.Command request,
      NguoiDung actor,
      LocalDateTime at) {

    Long caseId = id(c.get("id"));
    Long warehouseId = id(c.get("warehouse_id"));
    Map<String, Object> u = unit(caseId, request.unitId());

    require(
        !at.isBefore(timestamp(u.get("last_moved_at"))),
        "Thời điểm nằm trước lần di chuyển gần nhất.");

    Long variantId = id(u.get("variant_id"));
    Long expectedId = id(u.get("expected_variant_id"));
    Long oldSerial = id(u.get("serial_id"));
    String status = text(u.get("status"));
    String method = text(u.get("method"));

    Map<Long, PhienBanSanPham> locked =
        variants(
            variantId,
            expectedId,
            "PHUONG_AN".equals(request.action()) ? request.variantId() : null);

    switch (request.action()) {
      case "PHUONG_AN" -> {
        require("DANG_O_NCC".equals(status), "Hàng không còn ở NCC.");

        String newMethod = request.method();
        require(
            newMethod != null && Set.of("SUA_CHUA", "DOI_HANG", "TRA_HANG").contains(newMethod),
            "Phương án không hợp lệ.");

        Long target = "DOI_HANG".equals(newMethod) ? request.variantId() : variantId;

        require(target != null && locked.containsKey(target), "Thiếu phiên bản nhận.");

        BigDecimal credit = "SUA_CHUA".equals(newMethod) ? ZERO : money(request.credit(), false);

        BigDecimal receiveValue =
            "DOI_HANG".equals(newMethod)
                ? money(request.value(), false)
                : decimal(u.get("book_value"));

        jdbc.update(
            """
                        UPDATE ncc_unit
                        SET method = ?, expected_variant_id = ?, credit = ?,
                            receive_value = ?, planned = TRUE
                        WHERE id = ?
                        """,
            newMethod,
            target,
            credit,
            receiveValue,
            request.unitId());

        log(c, request.unitId(), request, actor, at, oldSerial, oldSerial, null);
      }

      case "NHAN" -> {
        require(
            "DANG_O_NCC".equals(status) && bool(u.get("planned")),
            "Phải chốt phương án trước khi nhận.");
        require(
            Objects.equals(request.variantId(), expectedId),
            "Phiên bản nhận không đúng phương án đã chốt.");
        require(request.passed() != null, "Thiếu kết quả kiểm tra.");

        boolean passed = Boolean.TRUE.equals(request.passed());
        String condition = condition(request.condition(), passed);

        require(
            !"SUA_CHUA".equals(method) || !"MOI".equals(condition),
            "Thiết bị sửa chữa không được ghi nhận thành hàng mới.");

        for (Long stockVariantId : new TreeSet<>(List.of(variantId, expectedId))) {

          stock(warehouseId, stockVariantId);
        }

        if (oldSerial != null) {
          ownedSerial(oldSerial, order.getId(), variantId, false);
        }

        boolean swapping = "DOI_HANG".equals(method);
        Long newSerial = oldSerial;

        List<String> codes = request.serialCodes() == null ? List.of() : request.serialCodes();

        if (swapping) {
          if (Boolean.TRUE.equals(locked.get(expectedId).getCoQuanLySerial())) {
            require(codes.size() == 1, "Phải nhập đúng một serial hàng đổi.");
            newSerial = newSerial(order.getId(), expectedId, codes.get(0), condition, passed);
          } else {
            require(codes.isEmpty(), "Hàng nhận không quản lý serial.");
            newSerial = null;
          }

          if (oldSerial != null) {
            jdbc.update(
                "UPDATE so_serial_san_pham SET trang_thai = 'DA_DOI_NCC' WHERE id = ?", oldSerial);
          }
        } else {
          require(
              Objects.equals(variantId, expectedId),
              "Sửa chữa hoặc nhận lại hàng bị từ chối phải giữ nguyên phiên bản.");

          if (oldSerial != null) {
            String code =
                jdbc.queryForObject(
                    "SELECT so_serial FROM so_serial_san_pham WHERE id = ?",
                    String.class,
                    oldSerial);

            require(
                codes.size() == 1 && code.equals(codes.get(0).strip()),
                "Phải nhận lại đúng serial đã gửi.");

            jdbc.update(
                """
                                UPDATE so_serial_san_pham
                                SET trang_thai = ?, tinh_trang_hang = ?
                                WHERE id = ?
                                """,
                passed ? "TRONG_KHO" : "LOI",
                condition,
                oldSerial);
          } else {
            require(codes.isEmpty(), "Hàng không quản lý serial.");
          }
        }

        move(
            warehouseId,
            expectedId,
            1,
            passed ? 1 : 0,
            passed ? 0 : 1,
            "NHAN_XU_LY_NCC",
            caseId,
            at);

        long eventId = log(c, request.unitId(), request, actor, at, oldSerial, newSerial, null);

        BigDecimal nextBook =
            swapping ? decimal(u.get("receive_value")) : decimal(u.get("book_value"));

        if (swapping) {
          adjustment(
              order,
              eventId,
              request.unitId(),
              "SWAP",
              decimal(u.get("book_value")),
              decimal(u.get("credit")),
              nextBook,
              ZERO);
        }

        jdbc.update(
            """
                        UPDATE ncc_unit
                        SET variant_id = ?, serial_id = ?, status = ?, planned = FALSE,
                            book_value = ?, condition_code = ?, last_moved_at = ?
                        WHERE id = ?
                        """,
            expectedId,
            newSerial,
            passed ? "DA_NHAN_DAT" : "DA_NHAN_LOI",
            nextBook,
            condition,
            Timestamp.valueOf(at),
            request.unitId());
      }

      case "GUI_LAI" -> {
        require("DA_NHAN_LOI".equals(status), "Chỉ gửi lại hàng đã nhận nhưng còn lỗi.");
        stock(warehouseId, variantId);

        if (oldSerial != null) {
          Map<String, Object> s = ownedSerial(oldSerial, order.getId(), variantId, true);
          require("LOI".equals(text(s.get("trang_thai"))), "Serial không còn là hàng lỗi.");
        }

        move(warehouseId, variantId, -1, 0, -1, "GUI_XU_LY_NCC", caseId, at);

        if (oldSerial != null) {
          jdbc.update(
              "UPDATE so_serial_san_pham SET trang_thai = 'DANG_GUI_NCC' WHERE id = ?", oldSerial);
        }

        jdbc.update(
            """
                        UPDATE ncc_unit
                        SET status = 'DANG_O_NCC', method = 'SUA_CHUA',
                            expected_variant_id = variant_id, planned = TRUE,
                            credit = 0, receive_value = book_value, last_moved_at = ?
                        WHERE id = ?
                        """,
            Timestamp.valueOf(at),
            request.unitId());

        log(c, request.unitId(), request, actor, at, oldSerial, oldSerial, null);
      }

      case "CHOT_TRA" -> {
        require(
            "DANG_O_NCC".equals(status) && "TRA_HANG".equals(method) && bool(u.get("planned")),
            "Chưa có phương án trả hàng đã chốt.");

        if (oldSerial != null) {
          ownedSerial(oldSerial, order.getId(), variantId, false);
          jdbc.update(
              "UPDATE so_serial_san_pham SET trang_thai = 'DA_TRA_NCC' WHERE id = ?", oldSerial);
        }

        long eventId = log(c, request.unitId(), request, actor, at, oldSerial, null, null);

        adjustment(
            order,
            eventId,
            request.unitId(),
            "RETURN",
            decimal(u.get("book_value")),
            decimal(u.get("credit")),
            ZERO,
            ZERO);

        jdbc.update(
            """
                        UPDATE ncc_unit
                        SET status = 'DA_TRA_NCC', planned = FALSE
                        WHERE id = ?
                        """,
            request.unitId());
      }

      case "CHAP_NHAN_LOI" -> {
        require("DA_NHAN_LOI".equals(status), "Thiết bị không ở trạng thái nhận lỗi.");

        jdbc.update("UPDATE ncc_unit SET status = 'CHAP_NHAN_LOI' WHERE id = ?", request.unitId());

        log(c, request.unitId(), request, actor, at, oldSerial, oldSerial, null);
      }

      default -> throw conflict("Thao tác thiết bị không hợp lệ.");
    }
  }

  private void cash(
      DonNhapHang order,
      Map<String, Object> c,
      NccRequest.Command request,
      NguoiDung actor,
      String key,
      LocalDateTime at) {

    BigDecimal amount = money(request.amount(), false);
    require(amount.signum() > 0, "Số tiền phải lớn hơn 0.");

    String method = request.paymentMethod();
    require(
        method != null && Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE").contains(method),
        "Phương thức tiền không hợp lệ.");

    String reference = request.transactionId() == null ? "" : request.transactionId().strip();

    require("TIEN_MAT".equals(method) || !reference.isBlank(), "Phải có mã giao dịch.");

    String uuid = UUID.fromString(key.strip()).toString();

    String note =
        c.get("code")
            + " | "
            + documentReference(
                id(c.get("id")), request.action(), request.document(), id(c.get("revision")) + 1L)
            + " | "
            + request.note()
            + (reference.isBlank() ? "" : " | GD: " + reference);

    String voucherCode;

    if ("CHI_TIEN".equals(request.action())) {
      purchases.pay(
          order.getId(),
          uuid,
          AdminPurchaseOrderPaymentRequest.builder()
              .soTienThanhToan(amount)
              .phuongThucThanhToan(method)
              .ngayThanhToan(request.at())
              .ghiChu(note)
              .xacNhanDaChiTien(true)
              .build());

      voucherCode = "CHI-NCC-" + uuid;
    } else {
      purchases.receiveRefund(
          order.getId(),
          uuid,
          AdminPurchaseOrderRefundRequest.builder()
              .soTienNhan(amount)
              .phuongThucHoan(method)
              .ngayNhanTien(request.at())
              .maGiaoDich(reference)
              .ghiChu(note)
              .xacNhanDaNhanTien(true)
              .build());

      voucherCode = "THU-NCC-" + uuid;
    }

    Long voucherId =
        jdbc.queryForObject(
            "SELECT id FROM so_quy_thu_chi WHERE ma_phieu = ?", Long.class, voucherCode);

    log(c, null, request, actor, at, null, null, voucherId);
  }

  public Object screen(Long poId) {
    context.actor();

    var order = purchases.getDetail(poId);

    List<Map<String, Object>> sources =
        jdbc.queryForList(
            """
                        SELECT d.*, v.ten_phien_ban, v.co_quan_ly_serial
                        FROM chi_tiet_don_nhap d
                        JOIN phien_ban_san_pham v ON v.id = d.phien_ban_id
                        WHERE d.don_nhap_hang_id = ?
                        ORDER BY d.id
                        """,
            poId);

    for (Map<String, Object> d : sources) {
      d.put("capacity", originalCapacity(poId, d));
      d.put("legacy_extra_capacity", legacyExtraCapacity(poId, d));

      List<Map<String, Object>> serials =
          jdbc.queryForList(
              """
                            SELECT s.id, s.so_serial, s.trang_thai, s.tinh_trang_hang
                            FROM so_serial_san_pham s
                            WHERE s.don_nhap_hang_id = ?
                              AND s.phien_ban_id = ?
                              AND s.don_hang_id IS NULL
                              AND s.chi_tiet_dong_goi_id IS NULL
                              AND s.trang_thai IN ('TRONG_KHO', 'LOI')
                            ORDER BY s.id
                            """,
              poId,
              id(d.get("phien_ban_id")));

      d.put(
          "serials",
          serials.stream().filter(s -> !accounting.trackedSerial(id(s.get("id")))).toList());
    }

    List<Map<String, Object>> cases =
        jdbc.queryForList(
            """
                        SELECT c.*, n.ho_ten AS employee_name
                        FROM ncc_case c
                        JOIN nguoi_dung n ON n.id = c.employee_id
                        WHERE c.source_po_id = ?
                        ORDER BY c.id DESC
                        """,
            poId);

    for (Map<String, Object> c : cases) {
      Long caseId = id(c.get("id"));

      c.put(
          "units",
          jdbc.queryForList(
              """
                          SELECT
                            u.*,
                            v.ten_phien_ban AS variant_name,
                            v.co_quan_ly_serial AS serial_managed,
                            target.ten_phien_ban AS expected_variant_name,
                            target.co_quan_ly_serial AS expected_serial_managed,
                            s.so_serial,
                            s.trang_thai AS live_serial_status,
                            EXISTS(
                              SELECT 1
                              FROM ncc_unit child
                              WHERE child.parent_id = u.id
                            ) AS has_child
                          FROM ncc_unit u
                          JOIN phien_ban_san_pham v
                            ON v.id = u.variant_id
                          JOIN phien_ban_san_pham target
                            ON target.id = u.expected_variant_id
                          LEFT JOIN so_serial_san_pham s
                            ON s.id = u.serial_id
                          WHERE u.case_id = ?
                          ORDER BY u.id
                          """,
              caseId));

      c.put(
          "events",
          jdbc.queryForList(
"""
                          SELECT
                            e.id,
                            e.unit_id,
                            e.action,
                            e.document,
                            e.note,
                            CAST(e.payload AS CHAR) AS payload,
                            e.occurred_at,
                            e.voucher_id,
                            n.ho_ten AS actor_name,
                            old_s.so_serial AS old_serial,
                            new_s.so_serial AS new_serial,
                            a.kind AS adjustment_kind,
                            a.old_value,
                            a.credit AS settled_credit,
                            a.new_value,
                            a.fee AS service_fee,
                            a.delta,
                            voucher.ma_phieu AS voucher_code,
                            voucher.so_tien AS cash_amount,
                            voucher.phuong_thuc_thanh_toan AS cash_method
                          FROM ncc_event e
                          JOIN nguoi_dung n
                            ON n.id = e.actor_id
                          LEFT JOIN so_serial_san_pham old_s
                            ON old_s.id = e.old_serial_id
                          LEFT JOIN so_serial_san_pham new_s
                            ON new_s.id = e.new_serial_id
                          LEFT JOIN ncc_adjustment a
                            ON a.event_id = e.id
                          LEFT JOIN so_quy_thu_chi voucher
                            ON voucher.id = e.voucher_id
WHERE e.case_id = ?
  AND e.action <> 'GHI_CHU'
ORDER BY e.id
                          """,
              caseId));

      c.put("adjustment", accounting.caseAdjustments(caseId));

      boolean active = "DANG_XU_LY".equals(text(c.get("status")));
      String blocker = active ? closeBlocker(poId, caseId) : "";

      c.put("can_close", active && blocker.isEmpty());
      c.put("close_blocker", blocker);

      boolean reopenConflict = !active && hasActiveCaseConflict(poId, caseId, casePurpose(c));

      c.put("can_reopen", !active && !reopenConflict);
      c.put(
          "reopen_blocker",
          reopenConflict ? "Đang có hồ sơ cùng loại hoặc hồ sơ cũ chưa kết thúc." : "");
    }

    List<Map<String, Object>> variants =
        jdbc.queryForList(
            """
                        SELECT v.id, p.ten_san_pham, v.ten_phien_ban, v.co_quan_ly_serial
                        FROM phien_ban_san_pham v
                        JOIN san_pham p ON p.id = v.san_pham_id
                        WHERE p.loai_san_pham = 'DON'
                          AND v.co_quan_ly_serial IS NOT NULL
                        ORDER BY p.ten_san_pham, v.id
                        """);

    List<Map<String, Object>> employees =
        entityManager
            .createQuery(
                """
                                select n.id, n.hoTen
                                from NguoiDung n
                                where n.trangThai = :active
                                  and n.vaiTro.tenVaiTro in :roles
                                order by n.hoTen
                                """,
                Object[].class)
            .setParameter("active", TrangThaiCoBanEnum.HOAT_DONG)
            .setParameter("roles", List.of("ADMIN", "QUAN_LY", "STAFF", "NHAN_VIEN_BAN_HANG"))
            .getResultList()
            .stream()
            .map(
                r -> {
                  Map<String, Object> value = new LinkedHashMap<>();
                  value.put("id", r[0]);
                  value.put("name", r[1]);
                  return value;
                })
            .toList();

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("sources", sources);
    result.put("variants", variants);
    result.put("employees", employees);

    boolean eligible =
        order.getTrangThaiNhap() != TrangThaiNhapHang.DAT_HANG
            && order.getTrangThaiNhap() != TrangThaiNhapHang.HUY;

    List<Map<String, Object>> caseTypes = new ArrayList<>();

    for (String purpose : List.of(PURPOSE_SEND, PURPOSE_EXTRA)) {
      boolean conflict = hasActiveCaseConflict(poId, null, purpose);

      caseTypes.add(
          Map.of(
              "code",
              purpose,
              "label",
              PURPOSE_SEND.equals(purpose) ? "Gửi hàng xử lý" : "Nhận mua bổ sung",
              "can_create",
              eligible && !conflict,
              "blocker",
              !eligible
                  ? "Đơn nhập chưa được duyệt hoặc đã bị hủy."
                  : conflict ? "Đang có hồ sơ cùng loại hoặc hồ sơ cũ chưa kết thúc." : ""));
    }

    result.put("case_types", caseTypes);

    result.put("cases", cases);
    result.put(
        "balance",
        Map.of(
            "effective",
            order.getGiaTriSauTra(),
            "adjustment",
            accounting.adjustments(poId),
            "debt",
            order.getSoTienConNo(),
            "refundDue",
            order.getSoTienNccConPhaiHoan(),
            "canPay",
            order.getSoTienConNo().signum() > 0,
            "canRefund",
            order.getSoTienNccConPhaiHoan().signum() > 0));

    return safe(result);
  }

  private Object safe(Object value) {
    if (value instanceof Timestamp t) {
      return t.toLocalDateTime().atZone(zone()).toOffsetDateTime().toString();
    }

    if (value instanceof LocalDateTime t) {
      return t.atZone(zone()).toOffsetDateTime().toString();
    }

    if (value instanceof Map<?, ?> map) {
      Map<String, Object> result = new LinkedHashMap<>();
      map.forEach((key, item) -> result.put(key.toString(), safe(item)));
      return result;
    }

    if (value instanceof List<?> list) {
      return list.stream().map(this::safe).toList();
    }

    return value;
  }
}
