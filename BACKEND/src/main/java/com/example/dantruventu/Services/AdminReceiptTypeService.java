package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptTypeCreateRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptTypeStatusRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeListResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeStatusResponse;
import com.example.dantruventu.Entity.LoaiThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Specification.ReceiptTypeSpecification;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReceiptTypeService {

  private static final int MAX_CODE_LENGTH = 50;
  private static final int MAX_NAME_LENGTH = 150;

  private final LoaiThuChiRepository receiptTypeRepository;

  public AdminReceiptTypeListResponse getReceiptTypes(
      String keyword, String status, String usage, String page, String limit) {
    return getTypes(LoaiPhieuThuChi.THU, keyword, status, usage, page, limit);
  }

  public AdminReceiptTypeResponse getReceiptTypeDetail(String rawId) {
    return getTypeDetail(rawId, LoaiPhieuThuChi.THU, ErrorCode.RECEIPT_TYPE_NOT_FOUND_OR_EXPENSE);
  }

  public AdminReceiptTypeResponse getTypeDetail(
      String rawId, LoaiPhieuThuChi voucherType, ErrorCode notFoundError) {
    Long id = parseId(rawId, ErrorCode.INVALID_ID);

    LoaiThuChi receiptType =
        receiptTypeRepository
            .findByIdAndLoaiPhieu(id, voucherType)
            .orElseThrow(() -> new AppException(notFoundError));

    return toResponse(receiptType);
  }

  /*
   * LoaiPhieuThuChi là tham số để cùng luồng truy vấn có thể tái sử dụng cho trang loại
   * phiếu chi sau này chỉ bằng cách truyền LoaiPhieuThuChi.CHI.
   */
  public AdminReceiptTypeListResponse getTypes(
      LoaiPhieuThuChi voucherType,
      String keyword,
      String rawStatus,
      String rawPage,
      String rawLimit) {
    return getTypes(voucherType, keyword, rawStatus, "TAT_CA", rawPage, rawLimit);
  }

  public AdminReceiptTypeListResponse getTypes(
      LoaiPhieuThuChi voucherType,
      String keyword,
      String rawStatus,
      String rawUsage,
      String rawPage,
      String rawLimit) {
    int page = parseInteger(rawPage);
    int limit = parseInteger(rawLimit);
    validatePagination(page, limit);

    TrangThaiCoBanEnum status = parseStatus(rawStatus);
    String usage = rawUsage == null ? "TAT_CA" : rawUsage.strip();
    if (!"TAT_CA".equals(usage) && !"THU_CONG".equals(usage)) {
      throw new AppException(ErrorCode.INVALID_RECEIPT_TYPE_USAGE);
    }
    org.springframework.data.jpa.domain.Specification<LoaiThuChi> specification =
        ReceiptTypeSpecification.build(keyword, voucherType, status);
    if ("THU_CONG".equals(usage)) {
      specification =
          specification.and(
              (root, query, cb) ->
                  cb.not(
                      cb.upper(root.<String>get("maLoai"))
                          .in(CashbookService.SYSTEM_RESERVED_TYPE_CODES)));
    }
    PageRequest pageable = PageRequest.of(page, limit, Sort.by("id").descending());

    Page<LoaiThuChi> result = receiptTypeRepository.findAll(specification, pageable);

    return AdminReceiptTypeListResponse.builder()
        .items(result.getContent().stream().map(this::toResponse).toList())
        .pagination(toPagination(result))
        .build();
  }

  @Transactional
  public AdminReceiptTypeResponse createReceiptType(AdminReceiptTypeCreateRequest request) {
    return createType(LoaiPhieuThuChi.THU, request);
  }

  /*
   * Dùng chung toàn bộ chuẩn hóa, kiểm tra unique và mapper trạng thái cho cả THU/CHI.
   */
  @Transactional
  public AdminReceiptTypeResponse createType(
      LoaiPhieuThuChi voucherType, AdminReceiptTypeCreateRequest request) {
    if (request == null) {
      throw invalidRequest("Mã loại và tên loại không được để trống.");
    }

    if (request.isBackendManagedFieldProvided()) {
      throw invalidRequest("Không được gửi loai_phieu hoặc trang_thai.");
    }

    String code = normalizeRequired(request.getMaLoai(), "Mã loại không được để trống.");
    String name = normalizeRequired(request.getTenLoai(), "Tên loại không được để trống.");

    code = code.toUpperCase(Locale.ROOT);

    if (code.length() > MAX_CODE_LENGTH) {
      throw invalidRequest("Mã loại tối đa 50 ký tự.");
    }

    if (name.length() > MAX_NAME_LENGTH) {
      throw invalidRequest("Tên loại tối đa 150 ký tự.");
    }

    if (CashbookService.SYSTEM_RESERVED_TYPE_CODES.contains(code)) {
      throw invalidRequest("Mã loại dành cho hệ thống không được tạo qua API thủ công.");
    }

    if (receiptTypeRepository.existsByMaLoaiIgnoreCase(code)) {
      throw new AppException(ErrorCode.RECEIPT_TYPE_CODE_EXISTS);
    }

    LoaiThuChi receiptType =
        LoaiThuChi.builder()
            .maLoai(code)
            .tenLoai(name)
            .loaiPhieu(voucherType)
            .ghiChu(normalizeOptional(request.getGhiChu()))
            .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
            .build();

    try {
      receiptType = receiptTypeRepository.saveAndFlush(receiptType);
    } catch (DataIntegrityViolationException exception) {
      if (isDuplicateConstraint(exception)) {
        throw new AppException(ErrorCode.RECEIPT_TYPE_CODE_EXISTS);
      }
      throw exception;
    }

    return toResponse(receiptType);
  }

  @Transactional
  public AdminReceiptTypeStatusResponse updateReceiptTypeStatus(
      String rawId, AdminReceiptTypeStatusRequest request) {
    return updateTypeStatus(
        rawId,
        request,
        LoaiPhieuThuChi.THU,
        ErrorCode.INVALID_RECEIPT_TYPE_STATUS,
        ErrorCode.RECEIPT_TYPE_NOT_FOUND_OR_EXPENSE,
        "Không thể cập nhật trạng thái loại phiếu thu.");
  }

  @Transactional
  public AdminReceiptTypeStatusResponse updateTypeStatus(
      String rawId,
      AdminReceiptTypeStatusRequest request,
      LoaiPhieuThuChi voucherType,
      ErrorCode invalidInputError,
      ErrorCode notFoundError,
      String updateConflictMessage) {
    Long id = parseId(rawId, invalidInputError);
    TrangThaiCoBanEnum requestedStatus = parseStatusRequest(request, invalidInputError);

    LoaiThuChi receiptType =
        receiptTypeRepository
            .findByIdAndLoaiPhieuForUpdate(id, voucherType)
            .orElseThrow(() -> new AppException(notFoundError));

    if (receiptType.getTrangThai() == requestedStatus) {
      return toStatusResponse(receiptType, requestedStatus, false);
    }

    if (voucherType == LoaiPhieuThuChi.CHI
        && requestedStatus == TrangThaiCoBanEnum.NGUNG_HOAT_DONG
        && CashbookService.SYSTEM_RESERVED_TYPE_CODES.contains(
            receiptType.getMaLoai().toUpperCase(Locale.ROOT))) {
      throw new AppException(ErrorCode.SYSTEM_DISBURSEMENT_TYPE_CANNOT_BE_DISABLED);
    }

    int updatedRows = receiptTypeRepository.updateStatus(id, requestedStatus);
    if (updatedRows != 1) {
      throw new AppException(ErrorCode.CONFLICT, updateConflictMessage);
    }

    return toStatusResponse(receiptType, requestedStatus, true);
  }

  private AdminReceiptTypeResponse toResponse(LoaiThuChi receiptType) {
    return AdminReceiptTypeResponse.builder()
        .id(receiptType.getId())
        .maLoai(receiptType.getMaLoai())
        .tenLoai(receiptType.getTenLoai())
        .loaiPhieu(receiptType.getLoaiPhieu())
        .ghiChu(receiptType.getGhiChu())
        .trangThai(toStatusValue(receiptType.getTrangThai()))
        .build();
  }

  private AdminReceiptTypeStatusResponse toStatusResponse(
      LoaiThuChi receiptType, TrangThaiCoBanEnum status, boolean changed) {
    return AdminReceiptTypeStatusResponse.builder()
        .id(receiptType.getId())
        .maLoai(receiptType.getMaLoai())
        .tenLoai(receiptType.getTenLoai())
        .loaiPhieu(receiptType.getLoaiPhieu())
        .trangThai(toStatusValue(status))
        .changed(changed)
        .build();
  }

  private Integer toStatusValue(TrangThaiCoBanEnum status) {
    return status == null ? null : (int) status.getValue();
  }

  private TrangThaiCoBanEnum parseStatus(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    return switch (value.strip()) {
      case "1" -> fromStatusValue(1);
      case "0" -> fromStatusValue(0);
      default -> throw invalidSearch();
    };
  }

  private TrangThaiCoBanEnum parseStatusRequest(
      AdminReceiptTypeStatusRequest request, ErrorCode invalidInputError) {
    if (request == null || !(request.getTrangThai() instanceof Integer value)) {
      throw new AppException(invalidInputError);
    }

    try {
      return fromStatusValue(value);
    } catch (IllegalArgumentException exception) {
      throw new AppException(invalidInputError);
    }
  }

  private TrangThaiCoBanEnum fromStatusValue(int value) {
    if (value != 0 && value != 1) {
      throw new IllegalArgumentException("Trạng thái không hợp lệ");
    }
    return TrangThaiCoBanEnum.fromValue((short) value);
  }

  private String normalizeRequired(String value, String message) {
    String normalized = normalizeOptional(value);
    if (normalized == null) {
      throw invalidRequest(message);
    }
    return normalized;
  }

  private String normalizeOptional(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private int parseInteger(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException exception) {
      throw invalidSearch();
    }
  }

  private Long parseId(String value, ErrorCode invalidInputError) {
    try {
      Long id = Long.valueOf(value == null ? "" : value.strip());
      if (id <= 0) {
        throw new NumberFormatException();
      }
      return id;
    } catch (NumberFormatException exception) {
      throw new AppException(invalidInputError);
    }
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalidSearch();
    }
  }

  private PaginationResponse toPagination(Page<?> result) {
    return PaginationResponse.builder()
        .page(result.getNumber())
        .limit(result.getSize())
        .totalElements(result.getTotalElements())
        .totalPages(result.getTotalPages())
        .build();
  }

  private boolean isDuplicateConstraint(DataIntegrityViolationException exception) {
    Throwable cause = exception.getMostSpecificCause();
    String message = cause == null ? null : cause.getMessage();
    return message != null && message.toLowerCase(Locale.ROOT).contains("duplicate");
  }

  private AppException invalidSearch() {
    return new AppException(ErrorCode.INVALID_CUSTOMER_SEARCH_PARAM);
  }

  private AppException invalidRequest(String message) {
    return new AppException(ErrorCode.INVALID_RECEIPT_TYPE_REQUEST, message);
  }
}
