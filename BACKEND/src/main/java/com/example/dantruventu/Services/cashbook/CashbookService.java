package com.example.dantruventu.Services.cashbook;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class CashbookService {

  private static final ZoneId CASHBOOK_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private static final Set<String> PAYMENT_METHODS = Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE");

  private final SoQuyThuChiRepository cashRepository;
  private final LoaiThuChiRepository cashTypeRepository;
  private final SalesIdempotencyRepository idempotencyRepository;
  private final ObjectMapper objectMapper;

  /*
   * Command nội bộ.
   * Không dùng record này làm @RequestBody của controller.
   *
   * Các entity đối tượng phải được nghiệp vụ nguồn lấy từ database.
   */
  @Builder
  public record AutomaticVoucher(
      String maPhieu,
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
      NguoiDung nguoiTao) {}

  @Transactional(propagation = Propagation.MANDATORY)
  public SoQuyThuChi createAutomatic(AutomaticVoucher command) {

    requireWritableTransaction();

    if (command == null) {
      throw invalid("Thiếu dữ liệu lập phiếu");
    }

    String code = requiredText(command.maPhieu(), "Mã phiếu", 50);

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

    String counterpartyName = resolveCounterpartyName(command);

    String tags = optionalText(command.tags(), "Tags", 255);

    if (command.nguoiTao() != null) {
      requirePersistedId(command.nguoiTao().getId(), "Người tạo");
    }

    if (cashRepository.findByMaPhieu(code).isPresent()) {
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

    SoQuyThuChi voucher =
        SoQuyThuChi.builder()
            .maPhieu(code)
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
            .nguonTao(NguonTaoPhieuThuChi.TU_DONG)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build();

    /*
     * UNIQUE(ma_phieu) tại database là ràng buộc cuối cùng
     * khi có các yêu cầu đồng thời.
     *
     * Không bắt lỗi rồi tiếp tục trong transaction đã thất bại.
     * GlobalExceptionHandler hiện có xử lý lỗi ràng buộc thành 409.
     */
    return cashRepository.saveAndFlush(voucher);
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

      case KHAC -> {
        if (linkCount != 0) {
          throw invalid("Nhóm KHAC không được gắn FK đối tượng");
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
