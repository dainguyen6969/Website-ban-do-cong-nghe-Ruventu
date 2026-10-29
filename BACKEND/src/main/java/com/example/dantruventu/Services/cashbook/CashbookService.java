package com.example.dantruventu.Services.cashbook;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Services.documents.DocumentNumberService;
import com.example.dantruventu.Services.order.OrderEvents;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class CashbookService {

  // Mã cấu hình mà các nghiệp vụ nguồn dùng để tự động lập phiếu.
  public static final Set<String> SYSTEM_RESERVED_TYPE_CODES =
      Set.of(
          "THU_BAN_HANG",
          "THU_HOAN_NCC",
          "CHI_NHAP_HANG",
          "CHI_HOAN_DON_HANG",
          "THU_BAO_HANH",
          "CHI_HOAN_BAO_HANH",
          "CHI_DON_VI_BAO_HANH",
          "THU_HOAN_DON_VI_BAO_HANH",
          "THU_DOI_SOAT_BAO_HANH",
          "BH-THU",
          "BH-CHI",
          "THU_KHACH_BAO_HANH",
          "HOAN_KHACH_BAO_HANH",
          "HOAN_TIEN_TRA_HANG");

  private static final ZoneId CASHBOOK_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private static final Set<String> PAYMENT_METHODS = Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE");

  private final SoQuyThuChiRepository cashRepository;
  private final LoaiThuChiRepository cashTypeRepository;
  private final SalesIdempotencyRepository idempotencyRepository;
  private final ObjectMapper objectMapper;
  private final OrderEvents orderEvents;
  private final JdbcTemplate jdbc;
  private final DocumentNumberService documentNumbers;

  /*
   * Command nội bộ.
   * Không dùng record này làm @RequestBody của controller.
   *
   * Các entity đối tượng phải được nghiệp vụ nguồn lấy từ database.
   */
  @Builder
  public record AutomaticVoucher(
      String khoaNghiepVu,
      LoaiPhieuThuChi loaiPhieu,
      String maLoaiThuChi,
      NhomNguoiNopNhanEnum nhomNguoiNopNhan,
      NguoiDung nguoiNopNhan,
      NhaCungCap nhaCungCap,
      DoiTacVanChuyen doiTacVanChuyen,
      String tenDoiTuongTuDo,
      String maChungTuThamChieu,
      BigDecimal soTien,
      String phuongThucThanhToan,
      OffsetDateTime ngayGhiNhan,
      String moTa,
      String tags,
      NguoiDung nguoiTao,
      HoaDonBaoHanh hoaDonBaoHanh,
      PhieuBaoHanh phieuBaoHanh,
      PhieuTraHang phieuTraHang,
      DonHang donHang,
      DonNhapHang donNhapHang,
      PhieuGiaoHang phieuGiaoHang) {}

  @Transactional(propagation = Propagation.MANDATORY)
  public SoQuyThuChi createAutomatic(AutomaticVoucher command) {

    requireWritableTransaction();

    if (command == null) {
      throw invalid("Thiếu dữ liệu lập phiếu");
    }

    String businessKey = requiredText(command.khoaNghiepVu(), "Khóa nghiệp vụ", 100);

    String typeCode = requiredText(command.maLoaiThuChi(), "Mã loại thu/chi", 50);

    if (command.loaiPhieu() == null) {
      throw invalid("Thiếu loại phiếu");
    }

    String sourceCode = requiredText(command.maChungTuThamChieu(), "Mã chứng từ nguồn", 100);

    String paymentMethod =
        requiredText(command.phuongThucThanhToan(), "Phương thức thanh toán", 50);

    if (!PAYMENT_METHODS.contains(paymentMethod)) {
      throw invalid("Phương thức thanh toán không hợp lệ");
    }

    BigDecimal amount = normalizeAmount(command.soTien());

    LocalDateTime occurredAt = normalizeOccurredAt(command.ngayGhiNhan());

    validateSourceLinks(command, occurredAt);
    validateDocumentLinks(command, sourceCode);

    String counterpartyName = resolveCounterpartyName(command);

    String tags = optionalText(command.tags(), "Tags", 255);

    if (command.nguoiTao() != null) {
      requirePersistedId(command.nguoiTao().getId(), "Người tạo");
    }

    if (cashRepository.findByBusinessKey(businessKey).isPresent()) {
      throw conflict("Khoản thu/chi này đã được ghi nhận");
    }

    LoaiThuChi cashType =
        cashTypeRepository
            .findByMaLoaiForUpdate(typeCode)
            .orElseThrow(() -> conflict("Chưa cấu hình loại thu/chi " + typeCode));

    if (cashType.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Loại thu/chi đã ngừng hoạt động");
    }

    if (cashType.getLoaiPhieu() != command.loaiPhieu()) {
      throw invalid("Loại thu/chi không khớp THU hoặc CHI");
    }

    String voucherCode = nextVoucherCode(command.loaiPhieu());

    SoQuyThuChi voucher =
        SoQuyThuChi.builder()
            .maPhieu(voucherCode)
            .khoaNghiepVu(businessKey)
            .donHang(command.donHang())
            .donNhapHang(command.donNhapHang())
            .phieuGiaoHang(command.phieuGiaoHang())
            .loaiPhieu(command.loaiPhieu())
            .loaiThuChi(cashType)
            .nhomNguoiNopNhan(command.nhomNguoiNopNhan())
            .nguoiNopNhan(command.nguoiNopNhan())
            .nhaCungCap(command.nhaCungCap())
            .doiTacVanChuyen(command.doiTacVanChuyen())
            .tenNguoiNopNhan(counterpartyName)
            .maChungTuThamChieu(sourceCode)
            .soTien(amount)
            .phuongThucThanhToan(paymentMethod)
            .ngayGhiNhan(occurredAt)
            .moTa(command.moTa())
            .tags(tags)
            .nguoiTao(command.nguoiTao())
            .hoaDonBaoHanh(command.hoaDonBaoHanh())
            .phieuBaoHanh(command.phieuBaoHanh())
            .phieuTraHang(command.phieuTraHang())
            .nguonTao(NguonTaoPhieuThuChi.TU_DONG)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build();

    voucher = cashRepository.saveAndFlush(voucher);

    orderEvents.receipt(voucher);

    return voucher;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public String nextVoucherCode(LoaiPhieuThuChi type) {

    if (type != LoaiPhieuThuChi.THU && type != LoaiPhieuThuChi.CHI) {
      throw invalid("Loại phiếu không hợp lệ để cấp mã.");
    }

    return documentNumbers.next(type == LoaiPhieuThuChi.THU ? "PT" : "PC");
  }

  public static String businessKey(SoQuyThuChi voucher) {

    if (voucher == null) {
      return null;
    }

    String key = voucher.getKhoaNghiepVu();

    return key == null || key.isBlank() ? voucher.getMaPhieu() : key;
  }

  public static boolean isReservedManualCode(String value) {

    if (value == null) {
      return false;
    }

    String code = value.strip().toUpperCase(Locale.ROOT);

    return code.startsWith("THU-")
        || code.startsWith("CHI-")
        || code.startsWith("PT-")
        || code.startsWith("PC-");
  }

  /*
   * Dùng cho nghiệp vụ cần trả lại kết quả cũ khi gửi lại
   * cùng một yêu cầu, như trả hàng NCC.
   *
   * Bản ghi idempotency, thay đổi nghiệp vụ và phiếu
   * đều nằm trong transaction của service gọi bên ngoài.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public <T> T executeOnce(
      String requestKey,
      NguoiDung actor,
      Object payload,
      Class<T> responseType,
      Supplier<T> operation) {

    if (actor == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    requirePersistedId(actor.getId(), "Người thực hiện");

    return executeOnce(requestKey, actor.getId(), payload, responseType, operation);
  }

  /*
   * actorId = 0 dành riêng cho checkout khách vãng lai.
   *
   * Payload của checkout guest phải chứa dấu vân tay
   * gắn với guest_cart_id. Không nhận actorId từ HTTP request.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public <T> T executeOnce(
      String requestKey,
      Long actorId,
      Object payload,
      Class<T> responseType,
      Supplier<T> operation) {

    requireWritableTransaction();

    String key = requiredText(requestKey, "Khóa giao dịch", 50);

    if (actorId == null || actorId < 0) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    String requestHash = fingerprint(actorId, payload);

    SalesIdempotencyRepository.Entry entry =
        idempotencyRepository.acquire(key, actorId, requestHash);

    if (entry == null
        || !Objects.equals(entry.actorId(), actorId)
        || !Objects.equals(entry.requestHash(), requestHash)) {

      throw conflict("Idempotency-Key đã được sử dụng cho một yêu cầu khác");
    }

    if (entry.responseJson() != null) {
      return deserialize(entry.responseJson(), responseType);
    }

    T result = operation.get();

    idempotencyRepository.complete(key, serialize(result));

    return result;
  }

  private void validateDocumentLinks(AutomaticVoucher command, String sourceCode) {

    DonHang order = command.donHang();
    DonNhapHang purchase = command.donNhapHang();
    PhieuGiaoHang delivery = command.phieuGiaoHang();
    PhieuTraHang returned = command.phieuTraHang();

    boolean warranty = command.hoaDonBaoHanh() != null || command.phieuBaoHanh() != null;

    if (order != null && purchase != null) {
      throw invalid("Một phiếu không được trộn nguồn đơn bán và đơn nhập.");
    }

    if (warranty && (order != null || purchase != null || delivery != null)) {
      throw invalid("Chứng từ bảo hành phải sử dụng liên kết bảo hành riêng.");
    }

    if (order != null) {
      requirePersistedId(order.getId(), "Đơn hàng nguồn");

      if (returned != null) {
        if (returned.getDonHang() == null
            || !Objects.equals(returned.getDonHang().getId(), order.getId())
            || !Objects.equals(sourceCode, returned.getMaTraHang())) {

          throw invalid("Phiếu trả hoặc mã tham chiếu không khớp đơn hàng nguồn.");
        }
      } else if (!Objects.equals(sourceCode, order.getMaDonHang())) {
        throw invalid("Mã tham chiếu không khớp đơn hàng nguồn.");
      }
    }

    if (purchase != null) {
      requirePersistedId(purchase.getId(), "Đơn nhập nguồn");

      if (returned != null
          || delivery != null
          || !Objects.equals(sourceCode, purchase.getMaDonNhap())
          || command.nhaCungCap() == null
          || purchase.getNhaCungCap() == null
          || !Objects.equals(command.nhaCungCap().getId(), purchase.getNhaCungCap().getId())) {

        throw invalid("Đơn nhập, Nhà Cung Cấp hoặc mã tham chiếu không khớp.");
      }
    }

    if (delivery != null) {
      requirePersistedId(delivery.getId(), "Phiếu giao hàng nguồn");

      if (order == null
          || delivery.getDonHang() == null
          || !Objects.equals(delivery.getDonHang().getId(), order.getId())
          || command.loaiPhieu() != LoaiPhieuThuChi.THU
          || command.nhomNguoiNopNhan() != NhomNguoiNopNhanEnum.DOI_TAC_GIAO_HANG
          || command.doiTacVanChuyen() == null
          || delivery.getDoiTacVanChuyen() == null
          || !Objects.equals(
              command.doiTacVanChuyen().getId(), delivery.getDoiTacVanChuyen().getId())) {

        throw invalid("Phiếu thu COD không khớp đơn hàng hoặc đối tác giao hàng.");
      }
    }
  }

  private void validateSourceLinks(AutomaticVoucher command, LocalDateTime occurredAt) {

    var invoice = command.hoaDonBaoHanh();
    var warranty = command.phieuBaoHanh();
    var returned = command.phieuTraHang();

    if (returned != null && (invoice != null || warranty != null)) {
      throw invalid("Phiếu trả hàng không được trộn liên kết bảo hành");
    }

    if (invoice != null) {
      requirePersistedId(invoice.getId(), "Hóa đơn bảo hành");

      if (warranty == null
          || !Objects.equals(invoice.getPhieuBaoHanh().getId(), warranty.getId())) {
        throw invalid("Hóa đơn không thuộc phiếu bảo hành đã liên kết");
      }
    }

    if (warranty != null) {
      requirePersistedId(warranty.getId(), "Phiếu bảo hành");
    }

    if (returned != null) {
      requirePersistedId(returned.getId(), "Phiếu trả hàng");

      if (command.loaiPhieu() != LoaiPhieuThuChi.CHI
          || command.nhomNguoiNopNhan() != NhomNguoiNopNhanEnum.KHACH_HANG
          || returned.getTrangThaiTraHang() != TrangThaiTraHang.DA_NHAN_HANG) {
        throw conflict("Phiếu trả chưa đủ điều kiện ghi nhận hoàn tiền");
      }

      if (returned.getNgayNhanHang() == null || occurredAt.isBefore(returned.getNgayNhanHang())) {
        throw invalid("Ngày hoàn tiền phải từ thời điểm đã nhận hàng trả");
      }

      if (returned.getTongTienHoan() == null
          || command.soTien().compareTo(returned.getTongTienHoan()) != 0) {
        throw conflict("MVP phải hoàn đủ khoản tiền của phiếu trả");
      }
    }
  }

  public static boolean protectedVoucher(SoQuyThuChi voucher) {
    return voucher.getNguonTao() != NguonTaoPhieuThuChi.THU_CONG
        || voucher.getHoaDonBaoHanh() != null
        || voucher.getPhieuBaoHanh() != null
        || voucher.getPhieuTraHang() != null;
  }

  public static String sourceBusiness(SoQuyThuChi voucher) {
    boolean warranty = voucher.getHoaDonBaoHanh() != null || voucher.getPhieuBaoHanh() != null;

    if (voucher.getPhieuTraHang() != null) {
      return !warranty
              && voucher.getLoaiPhieu() == LoaiPhieuThuChi.CHI
              && voucher.getNhomNguoiNopNhan() == NhomNguoiNopNhanEnum.KHACH_HANG
          ? "HOAN_TIEN_TRA_HANG"
          : null;
    }

    if (!warranty) return null;

    if (voucher.getNhomNguoiNopNhan() == NhomNguoiNopNhanEnum.KHACH_HANG) {
      return voucher.getLoaiPhieu() == LoaiPhieuThuChi.THU
          ? "THU_KHACH_BAO_HANH"
          : "HOAN_KHACH_BAO_HANH";
    }

    if (voucher.getNhomNguoiNopNhan() == NhomNguoiNopNhanEnum.NHA_CUNG_CAP) {
      return voucher.getLoaiPhieu() == LoaiPhieuThuChi.THU
          ? "THU_HOAN_DON_VI_BAO_HANH"
          : "CHI_DON_VI_BAO_HANH";
    }

    return null;
  }

  public static String uuidKey(String prefix, String value) {
    try {
      var uuid = java.util.UUID.fromString(value);

      if (!uuid.toString().equalsIgnoreCase(value)) {
        throw new IllegalArgumentException();
      }

      return prefix + uuid;
    } catch (IllegalArgumentException | NullPointerException exception) {
      throw new AppException(
          ErrorCode.INVALID_DATA,
          "Idempotency-Key",
          "IDEMPOTENCY_KEY_INVALID",
          "Idempotency-Key phải là UUID hợp lệ");
    }
  }

  private String resolveCounterpartyName(AutomaticVoucher command) {

    NhomNguoiNopNhanEnum group = command.nhomNguoiNopNhan();

    if (group == null) {
      throw invalid("Thiếu nhóm người nộp/nhận");
    }

    NguoiDung user = command.nguoiNopNhan();
    NhaCungCap supplier = command.nhaCungCap();
    DoiTacVanChuyen partner = command.doiTacVanChuyen();

    int linkCount = (user == null ? 0 : 1) + (supplier == null ? 0 : 1) + (partner == null ? 0 : 1);

    if (linkCount > 1) {
      throw invalid("Một phiếu chỉ được liên kết một đối tượng");
    }

    if (user != null) {
      requirePersistedId(user.getId(), "Người nộp/nhận");
    }

    if (supplier != null) {
      requirePersistedId(supplier.getId(), "Nhà cung cấp");
    }

    if (partner != null) {
      requirePersistedId(partner.getId(), "Đối tác vận chuyển");
    }

    return switch (group) {
      case KHACH_HANG, NHAN_VIEN -> {
        if (supplier != null || partner != null) {
          throw invalid("Đối tượng không khớp nhóm khách hàng/nhân viên");
        }

        if (user == null) {
          if (group == NhomNguoiNopNhanEnum.NHAN_VIEN) {
            throw invalid("Phiếu nhân viên phải có người nộp/nhận");
          }

          yield requiredText(command.tenDoiTuongTuDo(), "Tên khách lẻ", 150);
        }

        yield requiredText(user.getHoTen(), "Tên người nộp/nhận", 150);
      }

      case NHA_CUNG_CAP -> {
        if (supplier == null || user != null || partner != null) {
          throw invalid("Phiếu nhà cung cấp phải liên kết đúng nhà cung cấp");
        }

        yield requiredText(supplier.getTenNhaCungCap(), "Tên nhà cung cấp", 150);
      }

      case DOI_TAC_GIAO_HANG -> {
        if (partner == null || user != null || supplier != null) {
          throw invalid("Phiếu vận chuyển phải liên kết đúng đối tác");
        }

        yield requiredText(partner.getTenDoiTac(), "Tên đối tác vận chuyển", 150);
      }

      case KHAC, HE_THONG_TU_DONG -> {
        if (linkCount != 0) {
          throw invalid("Nhóm " + group + " không được gắn FK đối tượng");
        }

        yield requiredText(command.tenDoiTuongTuDo(), "Tên người nộp/nhận", 150);
      }
    };
  }

  private BigDecimal normalizeAmount(BigDecimal value) {

    if (value == null || value.signum() <= 0) {
      throw invalid("Số tiền phải lớn hơn 0");
    }

    BigDecimal normalized;

    try {
      normalized = value.setScale(2, RoundingMode.UNNECESSARY);
    } catch (ArithmeticException exception) {
      throw invalid("Số tiền chỉ được có tối đa 2 chữ số thập phân");
    }

    if (normalized.precision() > 15) {
      throw invalid("Số tiền vượt giới hạn DECIMAL(15,2)");
    }

    return normalized;
  }

  private LocalDateTime normalizeOccurredAt(OffsetDateTime value) {

    if (value == null) {
      throw invalid("Phải cung cấp ngày thực thu/chi");
    }

    if (value.toInstant().isAfter(Instant.now())) {
      throw invalid("Ngày thực thu/chi không được nằm trong tương lai");
    }

    /*
     * Schema hiện tại dùng TIMESTAMP không có phần giây lẻ.
     * Chuẩn hóa về giây trước khi lưu để tránh làm tròn ngoài ý muốn.
     */
    return value.atZoneSameInstant(CASHBOOK_ZONE).toLocalDateTime().truncatedTo(ChronoUnit.SECONDS);
  }

  private String fingerprint(Long actorId, Object payload) {

    String source = actorId + "\n" + serialize(payload);

    try {
      byte[] hash =
          MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8));

      return HexFormat.of().formatHex(hash);

    } catch (Exception exception) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR, "Không thể xác định nội dung giao dịch");
    }
  }

  private String serialize(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception exception) {
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể lưu nội dung giao dịch");
    }
  }

  private <T> T deserialize(String json, Class<T> type) {
    try {
      return objectMapper.readValue(json, type);
    } catch (Exception exception) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR, "Không thể đọc kết quả giao dịch đã lưu");
    }
  }

  private static void requireWritableTransaction() {
    if (!TransactionSynchronizationManager.isActualTransactionActive()
        || TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {

      throw new IllegalStateException(
          "Lập phiếu phải nằm trong transaction ghi của nghiệp vụ nguồn");
    }
  }

  private static void requirePersistedId(Long id, String label) {
    if (id == null || id <= 0) {
      throw invalid(label + " chưa có ID hợp lệ");
    }
  }

  private static String requiredText(String value, String label, int maxLength) {

    String normalized = optionalText(value, label, maxLength);

    if (normalized == null) {
      throw invalid(label + " không được để trống");
    }

    return normalized;
  }

  private static String optionalText(String value, String label, int maxLength) {

    if (value == null || value.isBlank()) {
      return null;
    }

    String normalized = value.strip();

    if (normalized.length() > maxLength) {
      throw invalid(label + " vượt quá " + maxLength + " ký tự");
    }

    return normalized;
  }

  private static AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private static AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }
}
