package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.cashbook.AdminDisbursementCancelRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminDisbursementCreateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementCancelResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementListItemResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementListResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminDisbursementResponse;
import com.example.dantruventu.DTO.Response.cashbook.PayerSuggestionListResponse;
import com.example.dantruventu.Entity.LoaiThuChi;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Specification.DisbursementSpecification;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDisbursementService {

  private static final int MAX_CODE_LENGTH = 50;
  private static final int MAX_PAYER_NAME_LENGTH = 150;
  private static final int MAX_REFERENCE_LENGTH = 100;
  private static final int MAX_PAYMENT_METHOD_LENGTH = 50;
  private static final int MAX_TAGS_LENGTH = 255;
  private static final int MAX_TEXT_BYTES = 65_535;
  private static final Set<String> PAYMENT_METHODS = Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE");

  private final SoQuyThuChiRepository disbursementRepository;
  private final LoaiThuChiRepository disbursementTypeRepository;
  private final AdminReceiptService receiptService;

  @Value("${ruventu.cashbook.time-zone:Asia/Ho_Chi_Minh}")
  private String cashbookTimeZone;

  public AdminDisbursementListResponse getDisbursements(
      String keyword,
      String rawReceiptTypeId,
      String rawPayerGroup,
      String rawPaymentMethod,
      String rawCreatorId,
      String rawSource,
      String rawStatus,
      String rawStartDate,
      String rawEndDate,
      String rawPage,
      String rawLimit) {

    int pageNumber = parseInteger(rawPage);
    int pageSize = parseInteger(rawLimit);
    validatePagination(pageNumber, pageSize);

    Long receiptTypeId = parsePositiveFilterId(rawReceiptTypeId);
    Long creatorId = parsePositiveFilterId(rawCreatorId);
    NhomNguoiNopNhanEnum payerGroup = parseOptionalEnum(rawPayerGroup, NhomNguoiNopNhanEnum.class);
    String paymentMethod = parseOptionalPaymentMethod(rawPaymentMethod);
    NguonTaoPhieuThuChi source = parseOptionalEnum(rawSource, NguonTaoPhieuThuChi.class);
    TrangThaiPhieuThuChi status = parseOptionalEnum(rawStatus, TrangThaiPhieuThuChi.class);
    LocalDate startDate = parseOptionalDate(rawStartDate);
    LocalDate endDate = parseOptionalDate(rawEndDate);

    if (endDate != null && endDate.equals(LocalDate.MAX)) {
      throw invalidSearch();
    }

    if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
      throw invalidSearch();
    }

    ZoneId timeZone = timeZone();
    LocalDateTime startInclusive =
        startDate == null ? null : startDate.atStartOfDay(timeZone).toLocalDateTime();

    // Lọc ngay_ghi_nhan với cận trên độc quyền tại đầu ngày kế tiếp ở Asia/Ho_Chi_Minh.
    LocalDateTime endExclusive =
        endDate == null ? null : endDate.plusDays(1).atStartOfDay(timeZone).toLocalDateTime();

    PageRequest pageable =
        PageRequest.of(
            pageNumber,
            pageSize,
            Sort.by("ngayGhiNhan").descending().and(Sort.by("id").descending()));

    Page<SoQuyThuChi> result =
        disbursementRepository.findAll(
            DisbursementSpecification.build(
                keyword,
                receiptTypeId,
                payerGroup,
                paymentMethod,
                creatorId,
                source,
                status,
                startInclusive,
                endExclusive),
            pageable);

    return AdminDisbursementListResponse.builder()
        .items(result.getContent().stream().map(this::toListItem).toList())
        .pagination(toPagination(result))
        .build();
  }

  public PayerSuggestionListResponse getPayeeSuggestions(
      String group, String keyword, String page, String limit) {
    try {
      return receiptService.getPayerSuggestions(group, keyword, page, limit);
    } catch (AppException exception) {
      if (exception.getErrorCode() == ErrorCode.INVALID_RECEIPT_PAYER_SEARCH) {
        throw new AppException(ErrorCode.INVALID_DISBURSEMENT_PAYEE_SEARCH);
      }
      throw exception;
    }
  }

  public AdminDisbursementResponse getDisbursementDetail(String rawId) {
    Long id = parseDetailId(rawId);

    SoQuyThuChi disbursement =
        disbursementRepository
            .findByIdAndLoaiPhieu(id, LoaiPhieuThuChi.CHI)
            .orElseThrow(() -> new AppException(ErrorCode.DISBURSEMENT_DETAIL_NOT_FOUND));

    return toResponse(disbursement);
  }

  @Transactional
  public AdminDisbursementResponse createDisbursement(
      AdminDisbursementCreateRequest request, NguoiDung authenticatedAdmin) {

    if (authenticatedAdmin == null || authenticatedAdmin.getId() == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    if (request == null) {
      throw invalidRequest("Thiếu dữ liệu tạo phiếu chi.");
    }

    if (request.isBackendManagedFieldProvided()) {
      throw invalidRequest("Không được gửi các trường do backend quản lý.");
    }

    if (request.getLoaiThuChiId() == null || request.getLoaiThuChiId() <= 0) {
      throw invalidRequest("Loại chi không hợp lệ.");
    }

    String payerName =
        requiredText(request.getTenNguoiNopNhan(), "Tên người nhận không được để trống.");
    NhomNguoiNopNhanEnum payerGroup = parseRequiredPayerGroup(request.getNhomNguoiNopNhan());
    String paymentMethod = parseRequiredPaymentMethod(request.getPhuongThucThanhToan());
    BigDecimal amount = requirePositiveAmount(request.getSoTien());
    LocalDateTime recordedAt = toLocalDateTime(request.getNgayGhiNhan());
    String referenceCode = normalizeOptional(request.getMaChungTuThamChieu());

    validateLength(payerName, MAX_PAYER_NAME_LENGTH, "Tên người nhận tối đa 150 ký tự.");
    validateLength(referenceCode, MAX_REFERENCE_LENGTH, "Mã chứng từ tham chiếu tối đa 100 ký tự.");
    validateLength(
        paymentMethod, MAX_PAYMENT_METHOD_LENGTH, "Phương thức thanh toán tối đa 50 ký tự.");
    validateLength(request.getTags(), MAX_TAGS_LENGTH, "Tags tối đa 255 ký tự.");
    validateTextLength(request.getMoTa());

    String receiptCode = normalizeOptional(request.getMaPhieu());
    if (receiptCode == null) {
      receiptCode = generateDisbursementCode();
    } else {
      validateLength(receiptCode, MAX_CODE_LENGTH, "Mã phiếu tối đa 50 ký tự.");
    }

    LoaiThuChi disbursementType =
        disbursementTypeRepository
            .findByIdForShare(request.getLoaiThuChiId())
            .orElseThrow(() -> new AppException(ErrorCode.DISBURSEMENT_TYPE_NOT_FOUND));

    if (disbursementType.getLoaiPhieu() != LoaiPhieuThuChi.CHI) {
      throw invalidRequest("Không thể chọn loại THU cho phiếu chi.");
    }

    if (disbursementType.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(ErrorCode.DISBURSEMENT_TYPE_INACTIVE);
    }

    if (disbursementRepository.existsByMaPhieuIgnoreCase(receiptCode)) {
      throw new AppException(ErrorCode.DISBURSEMENT_CODE_EXISTS);
    }

    if (referenceCode != null
        && disbursementRepository.existsByLoaiPhieuAndNguonTaoAndMaChungTuThamChieuAndSoTien(
            LoaiPhieuThuChi.CHI, NguonTaoPhieuThuChi.TU_DONG, referenceCode, amount)) {
      throw new AppException(ErrorCode.DISBURSEMENT_ALREADY_AUTO_RECORDED);
    }

    SoQuyThuChi disbursement =
        SoQuyThuChi.builder()
            .maPhieu(receiptCode)
            .loaiPhieu(LoaiPhieuThuChi.CHI)
            .loaiThuChi(disbursementType)
            .nhomNguoiNopNhan(payerGroup)
            .tenNguoiNopNhan(payerName)
            .maChungTuThamChieu(referenceCode)
            .soTien(amount)
            .phuongThucThanhToan(paymentMethod)
            .ngayGhiNhan(recordedAt)
            .moTa(request.getMoTa())
            .tags(request.getTags())
            .nguoiTao(authenticatedAdmin)
            .nguonTao(NguonTaoPhieuThuChi.THU_CONG)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build();

    try {
      disbursement = disbursementRepository.saveAndFlush(disbursement);
    } catch (DataIntegrityViolationException exception) {
      if (isDuplicateConstraint(exception)) {
        throw new AppException(ErrorCode.DISBURSEMENT_CODE_EXISTS);
      }
      throw exception;
    }

    return toResponse(disbursement);
  }

  @Transactional
  public AdminDisbursementCancelResponse cancelDisbursement(
      String rawId, AdminDisbursementCancelRequest request) {
    Long id = parseCancelId(rawId);

    if (request == null || !Boolean.TRUE.equals(request.getXacNhan())) {
      throw new AppException(ErrorCode.INVALID_DISBURSEMENT_CANCEL_REQUEST);
    }

    SoQuyThuChi disbursement =
        disbursementRepository
            .findByIdAndLoaiPhieuForUpdate(id, LoaiPhieuThuChi.CHI)
            .orElseThrow(() -> new AppException(ErrorCode.DISBURSEMENT_CANCEL_NOT_FOUND));

    if (disbursement.getNguonTao() == NguonTaoPhieuThuChi.TU_DONG) {
      throw new AppException(ErrorCode.AUTOMATIC_DISBURSEMENT_CANNOT_BE_CANCELLED);
    }

    if (disbursement.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN) {
      throw new AppException(ErrorCode.DISBURSEMENT_ALREADY_CANCELLED);
    }

    LocalDateTime updatedAt = LocalDateTime.now(timeZone()).truncatedTo(ChronoUnit.MICROS);
    int updatedRows =
        disbursementRepository.updateCancellationStatus(id, TrangThaiPhieuThuChi.HUY, updatedAt);

    if (updatedRows != 1) {
      throw new AppException(ErrorCode.CONFLICT, "Không thể cập nhật trạng thái phiếu chi.");
    }

    return AdminDisbursementCancelResponse.builder()
        .id(disbursement.getId())
        .maPhieu(disbursement.getMaPhieu())
        .loaiPhieu(disbursement.getLoaiPhieu())
        .nguonTao(disbursement.getNguonTao())
        .trangThai(TrangThaiPhieuThuChi.HUY)
        .soTien(disbursement.getSoTien())
        .updatedAt(toOffsetDateTime(updatedAt))
        .build();
  }

  private AdminDisbursementListItemResponse toListItem(SoQuyThuChi disbursement) {
    NguoiDung creator = disbursement.getNguoiTao();

    return AdminDisbursementListItemResponse.builder()
        .id(disbursement.getId())
        .maPhieu(disbursement.getMaPhieu())
        .loaiPhieu(disbursement.getLoaiPhieu())
        .nhomNguoiNopNhan(disbursement.getNhomNguoiNopNhan())
        .tenNguoiNopNhan(disbursement.getTenNguoiNopNhan())
        .loaiThuChiId(disbursement.getLoaiThuChi().getId())
        .maLoai(disbursement.getLoaiThuChi().getMaLoai())
        .tenLoai(disbursement.getLoaiThuChi().getTenLoai())
        .phuongThucThanhToan(disbursement.getPhuongThucThanhToan())
        .nguoiTaoId(creator == null ? null : creator.getId())
        .tenNguoiTao(creator == null ? null : creator.getHoTen())
        .soTien(disbursement.getSoTien())
        .ngayGhiNhan(toOffsetDateTime(disbursement.getNgayGhiNhan()))
        .nguonTao(disbursement.getNguonTao())
        .trangThai(disbursement.getTrangThai())
        .build();
  }

  private AdminDisbursementResponse toResponse(SoQuyThuChi disbursement) {
    NguoiDung creator = disbursement.getNguoiTao();

    return AdminDisbursementResponse.builder()
        .id(disbursement.getId())
        .maPhieu(disbursement.getMaPhieu())
        .loaiPhieu(disbursement.getLoaiPhieu())
        .loaiThuChiId(disbursement.getLoaiThuChi().getId())
        .maLoai(disbursement.getLoaiThuChi().getMaLoai())
        .tenLoai(disbursement.getLoaiThuChi().getTenLoai())
        .nhomNguoiNopNhan(disbursement.getNhomNguoiNopNhan())
        .tenNguoiNopNhan(disbursement.getTenNguoiNopNhan())
        .maChungTuThamChieu(disbursement.getMaChungTuThamChieu())
        .soTien(disbursement.getSoTien())
        .phuongThucThanhToan(disbursement.getPhuongThucThanhToan())
        .ngayGhiNhan(toOffsetDateTime(disbursement.getNgayGhiNhan()))
        .moTa(disbursement.getMoTa())
        .tags(disbursement.getTags())
        .nguoiTaoId(creator == null ? null : creator.getId())
        .tenNguoiTao(creator == null ? null : creator.getHoTen())
        .nguonTao(disbursement.getNguonTao())
        .trangThai(disbursement.getTrangThai())
        .createdAt(toOffsetDateTime(disbursement.getCreatedAt()))
        .updatedAt(toOffsetDateTime(disbursement.getUpdatedAt()))
        .build();
  }

  private String generateDisbursementCode() {
    for (int attempt = 0; attempt < 5; attempt++) {
      String code = "PC" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
      if (!disbursementRepository.existsByMaPhieuIgnoreCase(code)) {
        return code;
      }
    }
    throw new AppException(ErrorCode.DISBURSEMENT_CODE_EXISTS);
  }

  private NhomNguoiNopNhanEnum parseRequiredPayerGroup(String value) {
    String normalized = requiredText(value, "Nhóm người nhận không được để trống.");
    try {
      return NhomNguoiNopNhanEnum.valueOf(normalized);
    } catch (IllegalArgumentException exception) {
      throw invalidRequest("Nhóm người nhận không hợp lệ.");
    }
  }

  private String parseRequiredPaymentMethod(String value) {
    String normalized = requiredText(value, "Phương thức thanh toán không được để trống.");
    if (!PAYMENT_METHODS.contains(normalized)) {
      throw invalidRequest("Phương thức thanh toán không hợp lệ.");
    }
    return normalized;
  }

  private BigDecimal requirePositiveAmount(BigDecimal amount) {
    if (amount == null
        || amount.compareTo(BigDecimal.ZERO) <= 0
        || amount.scale() > 2
        || amount.precision() - amount.scale() > 13) {
      throw invalidRequest("Số tiền phải lớn hơn 0 và phù hợp DECIMAL(15,2).");
    }
    return amount;
  }

  private LocalDateTime toLocalDateTime(OffsetDateTime value) {
    if (value == null) {
      throw invalidRequest("Ngày ghi nhận không được để trống.");
    }
    return value.atZoneSameInstant(timeZone()).toLocalDateTime();
  }

  private <E extends Enum<E>> E parseOptionalEnum(String value, Class<E> enumType) {
    if (value == null) {
      return null;
    }
    if (value.isBlank()) {
      throw invalidSearch();
    }
    try {
      return Enum.valueOf(enumType, value.strip());
    } catch (IllegalArgumentException exception) {
      throw invalidSearch();
    }
  }

  private String parseOptionalPaymentMethod(String value) {
    if (value == null) {
      return null;
    }
    String normalized = value.strip();
    if (normalized.isEmpty() || !PAYMENT_METHODS.contains(normalized)) {
      throw invalidSearch();
    }
    return normalized;
  }

  private Long parsePositiveFilterId(String value) {
    if (value == null) {
      return null;
    }
    try {
      Long id = Long.valueOf(value.strip());
      if (id <= 0) {
        throw new NumberFormatException();
      }
      return id;
    } catch (NumberFormatException exception) {
      throw invalidSearch();
    }
  }

  private LocalDate parseOptionalDate(String value) {
    if (value == null) {
      return null;
    }
    if (value.isBlank()) {
      throw invalidSearch();
    }
    try {
      return LocalDate.parse(value.strip());
    } catch (DateTimeException exception) {
      throw invalidSearch();
    }
  }

  private int parseInteger(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException exception) {
      throw invalidSearch();
    }
  }

  private Long parseDetailId(String value) {
    try {
      Long id = Long.valueOf(value);
      if (id <= 0) {
        throw new NumberFormatException();
      }
      return id;
    } catch (NumberFormatException exception) {
      throw new AppException(ErrorCode.INVALID_ID);
    }
  }

  private Long parseCancelId(String value) {
    try {
      Long id = Long.valueOf(value);
      if (id <= 0) {
        throw new NumberFormatException();
      }
      return id;
    } catch (NumberFormatException exception) {
      throw new AppException(ErrorCode.INVALID_DISBURSEMENT_CANCEL_REQUEST);
    }
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalidSearch();
    }
  }

  private String requiredText(String value, String message) {
    String normalized = normalizeOptional(value);
    if (normalized == null) {
      throw invalidRequest(message);
    }
    return normalized;
  }

  private String normalizeOptional(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private void validateLength(String value, int maxLength, String message) {
    if (value != null && value.length() > maxLength) {
      throw invalidRequest(message);
    }
  }

  private void validateTextLength(String value) {
    if (value != null && value.getBytes(StandardCharsets.UTF_8).length > MAX_TEXT_BYTES) {
      throw invalidRequest("Mô tả vượt giới hạn cột TEXT.");
    }
  }

  private boolean isDuplicateConstraint(DataIntegrityViolationException exception) {
    Throwable cause = exception.getMostSpecificCause();
    String message = cause == null ? null : cause.getMessage();
    return message != null && message.toLowerCase(Locale.ROOT).contains("duplicate");
  }

  private PaginationResponse toPagination(Page<?> result) {
    return PaginationResponse.builder()
        .page(result.getNumber())
        .limit(result.getSize())
        .totalElements(result.getTotalElements())
        .totalPages(result.getTotalPages())
        .build();
  }

  private OffsetDateTime toOffsetDateTime(LocalDateTime value) {
    return value == null ? null : value.atZone(timeZone()).toOffsetDateTime();
  }

  private ZoneId timeZone() {
    return ZoneId.of(cashbookTimeZone);
  }

  private AppException invalidSearch() {
    return new AppException(ErrorCode.INVALID_DISBURSEMENT_SEARCH);
  }

  private AppException invalidRequest(String message) {
    return new AppException(ErrorCode.INVALID_DISBURSEMENT_REQUEST, message);
  }
}
