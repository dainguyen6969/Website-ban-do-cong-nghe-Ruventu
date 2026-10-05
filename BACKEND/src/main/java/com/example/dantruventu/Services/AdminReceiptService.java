package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptCancelRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptCreateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptCancelResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptListItemResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptListResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptResponse;
import com.example.dantruventu.DTO.Response.cashbook.PayerSuggestionListResponse;
import com.example.dantruventu.DTO.Response.cashbook.PayerSuggestionResponse;
import com.example.dantruventu.Entity.DoiTacVanChuyen;
import com.example.dantruventu.Entity.LoaiThuChi;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.NhaCungCap;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.partner.DoiTacVanChuyenRepository;
import com.example.dantruventu.Repository.partner.NhaCungCapRepository;
import com.example.dantruventu.Specification.ReceiptSpecification;
import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Set;
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
public class AdminReceiptService {

  private static final Set<String> PAYMENT_METHODS = Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE");

  private final SoQuyThuChiRepository receiptRepository;
  private final LoaiThuChiRepository receiptTypeRepository;
  private final NguoiDungRepository userRepository;
  private final NhaCungCapRepository supplierRepository;
  private final DoiTacVanChuyenRepository shippingPartnerRepository;

  @Value("${ruventu.cashbook.time-zone:Asia/Ho_Chi_Minh}")
  private String cashbookTimeZone;

  public AdminReceiptListResponse getReceipts(
      String keyword, String trangThai, String tuNgay, String denNgay, String page, String limit) {

    int pageNumber = parsePageNumber(page);
    int pageSize = parsePageSize(limit);
    validatePagination(pageNumber, pageSize);

    TrangThaiPhieuThuChi status = parseStatus(trangThai);
    LocalDate startDate = parseDate(tuNgay);
    LocalDate endDate = parseDate(denNgay);

    if (endDate != null && endDate.equals(LocalDate.MAX)) {
      throw invalidSearch();
    }

    if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
      throw invalidSearch();
    }

    PageRequest pageable =
        PageRequest.of(
            pageNumber,
            pageSize,
            Sort.by("ngayGhiNhan").descending().and(Sort.by("id").descending()));

    Page<SoQuyThuChi> result =
        receiptRepository.findAll(
            ReceiptSpecification.build(keyword, status, startDate, endDate), pageable);

    return AdminReceiptListResponse.builder()
        .items(result.getContent().stream().map(this::toListItem).toList())
        .pagination(toPagination(result))
        .build();
  }

  public PayerSuggestionListResponse getPayerSuggestions(
      String rawGroup, String keyword, String page, String limit) {
    NhomNguoiNopNhanEnum group = parsePayerGroupFilter(rawGroup);
    int pageNumber = parsePayerPageValue(page);
    int pageSize = parsePayerPageValue(limit);
    validatePayerPagination(pageNumber, pageSize);

    String keywordPattern = toKeywordPattern(keyword);

    Page<PayerSuggestionResponse> result =
        switch (group) {
          case KHACH_HANG ->
              userRepository
                  .findActiveCustomerPayers(
                      TrangThaiCoBanEnum.HOAT_DONG,
                      keywordPattern,
                      payerPageable(pageNumber, pageSize, "hoTen"))
                  .map(this::toPayerSuggestion);
          case NHAN_VIEN ->
              userRepository
                  .findActiveEmployeePayers(
                      TrangThaiCoBanEnum.HOAT_DONG,
                      keywordPattern,
                      payerPageable(pageNumber, pageSize, "hoTen"))
                  .map(this::toPayerSuggestion);
          case NHA_CUNG_CAP ->
              supplierRepository
                  .findActiveReceiptPayers(
                      TrangThaiCoBanEnum.HOAT_DONG,
                      keywordPattern,
                      payerPageable(pageNumber, pageSize, "tenNhaCungCap"))
                  .map(this::toPayerSuggestion);
          case DOI_TAC_GIAO_HANG ->
              shippingPartnerRepository
                  .findActiveReceiptPayers(
                      TrangThaiCoBanEnum.HOAT_DONG,
                      keywordPattern,
                      payerPageable(pageNumber, pageSize, "tenDoiTac"))
                  .map(this::toPayerSuggestion);
          case KHAC -> Page.empty(PageRequest.of(pageNumber, pageSize));
        };

    return PayerSuggestionListResponse.builder()
        .nhomNguoiNopNhan(group)
        .items(result.getContent())
        .pagination(toPagination(result))
        .build();
  }

  public AdminReceiptResponse getReceiptDetail(String rawId) {
    Long id = parseReceiptId(rawId);

    SoQuyThuChi receipt =
        receiptRepository
            .findByIdAndLoaiPhieu(id, LoaiPhieuThuChi.THU)
            .orElseThrow(() -> new AppException(ErrorCode.RECEIPT_DETAIL_NOT_FOUND));

    return toResponse(receipt);
  }

  @Transactional
  public AdminReceiptResponse createReceipt(
      AdminReceiptCreateRequest request, NguoiDung authenticatedAdmin) {

    if (authenticatedAdmin == null || authenticatedAdmin.getId() == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    if (request.isBackendManagedFieldProvided()) {
      throw invalidRequest("Không được gửi các trường do backend quản lý.");
    }

    String receiptCode = requiredText(request.getMaPhieu(), "Mã phiếu không được để trống.");
    String payerName =
        requiredText(request.getTenNguoiNopNhan(), "Tên người nộp không được để trống.");
    NhomNguoiNopNhanEnum payerGroup = parsePayerGroup(request.getNhomNguoiNopNhan());
    String paymentMethod = parsePaymentMethod(request.getPhuongThucThanhToan());
    BigDecimal amount = requirePositiveAmount(request.getSoTien());
    LocalDateTime recordedAt = toLocalDateTime(request.getNgayGhiNhan());
    String referenceCode = optionalText(request.getMaChungTuThamChieu());

    if (request.getLoaiThuChiId() == null || request.getLoaiThuChiId() <= 0) {
      throw invalidRequest("Loại thu không hợp lệ.");
    }

    LoaiThuChi receiptType =
        receiptTypeRepository
            .findByIdForShare(request.getLoaiThuChiId())
            .orElseThrow(() -> new AppException(ErrorCode.RECEIPT_TYPE_NOT_FOUND));

    if (receiptType.getLoaiPhieu() != LoaiPhieuThuChi.THU) {
      throw invalidRequest("Không thể chọn loại CHI cho phiếu thu.");
    }

    if (receiptType.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(ErrorCode.RECEIPT_TYPE_INACTIVE);
    }

    if (receiptRepository.existsByMaPhieuIgnoreCase(receiptCode)) {
      throw new AppException(ErrorCode.RECEIPT_CODE_EXISTS);
    }

    if (referenceCode != null
        && receiptRepository.existsByLoaiPhieuAndNguonTaoAndMaChungTuThamChieuAndSoTien(
            LoaiPhieuThuChi.THU, NguonTaoPhieuThuChi.TU_DONG, referenceCode, amount)) {
      throw new AppException(ErrorCode.RECEIPT_ALREADY_AUTO_RECORDED);
    }

    SoQuyThuChi receipt =
        SoQuyThuChi.builder()
            .maPhieu(receiptCode)
            .loaiPhieu(LoaiPhieuThuChi.THU)
            .loaiThuChi(receiptType)
            .nhomNguoiNopNhan(payerGroup)
            .tenNguoiNopNhan(payerName)
            .maChungTuThamChieu(referenceCode)
            .soTien(amount)
            .phuongThucThanhToan(paymentMethod)
            .ngayGhiNhan(recordedAt)
            .moTa(optionalText(request.getMoTa()))
            .tags(request.getTags())
            .nguoiTao(authenticatedAdmin)
            .nguonTao(NguonTaoPhieuThuChi.THU_CONG)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build();

    try {
      receipt = receiptRepository.saveAndFlush(receipt);
    } catch (DataIntegrityViolationException exception) {
      // Ràng buộc unique của so_quy_thu_chi.ma_phieu là lớp bảo vệ cuối cho request đồng thời.
      throw new AppException(ErrorCode.RECEIPT_CODE_EXISTS);
    }

    return toResponse(receipt);
  }

  @Transactional
  public AdminReceiptCancelResponse cancelReceipt(String rawId, AdminReceiptCancelRequest request) {
    Long id = parseReceiptId(rawId);

    if (request == null || !Boolean.TRUE.equals(request.getXacNhan())) {
      throw new AppException(ErrorCode.INVALID_RECEIPT_CANCEL_CONFIRMATION);
    }

    SoQuyThuChi receipt =
        receiptRepository
            .findByIdAndLoaiPhieuForUpdate(id, LoaiPhieuThuChi.THU)
            .orElseThrow(() -> new AppException(ErrorCode.RECEIPT_CANCEL_NOT_FOUND));

    if (receipt.getNguonTao() == NguonTaoPhieuThuChi.TU_DONG) {
      throw new AppException(ErrorCode.AUTOMATIC_RECEIPT_CANNOT_BE_CANCELLED);
    }

    if (receipt.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN) {
      throw new AppException(ErrorCode.RECEIPT_ALREADY_CANCELLED);
    }

    LocalDateTime updatedAt = LocalDateTime.now(timeZone()).truncatedTo(ChronoUnit.MICROS);
    int updatedRows =
        receiptRepository.updateCancellationStatus(id, TrangThaiPhieuThuChi.HUY, updatedAt);

    if (updatedRows != 1) {
      throw new AppException(ErrorCode.CONFLICT, "Không thể cập nhật trạng thái phiếu thu.");
    }

    return AdminReceiptCancelResponse.builder()
        .id(receipt.getId())
        .maPhieu(receipt.getMaPhieu())
        .loaiPhieu(receipt.getLoaiPhieu())
        .nguonTao(receipt.getNguonTao())
        .trangThai(TrangThaiPhieuThuChi.HUY)
        .soTien(receipt.getSoTien())
        .updatedAt(toOffsetDateTime(updatedAt))
        .build();
  }

  private AdminReceiptListItemResponse toListItem(SoQuyThuChi receipt) {
    NguoiDung creator = receipt.getNguoiTao();

    return AdminReceiptListItemResponse.builder()
        .id(receipt.getId())
        .maPhieu(receipt.getMaPhieu())
        .loaiPhieu(receipt.getLoaiPhieu())
        .nhomNguoiNopNhan(receipt.getNhomNguoiNopNhan())
        .tenNguoiNopNhan(receipt.getTenNguoiNopNhan())
        .loaiThuChiId(receipt.getLoaiThuChi().getId())
        .maLoai(receipt.getLoaiThuChi().getMaLoai())
        .tenLoai(receipt.getLoaiThuChi().getTenLoai())
        .phuongThucThanhToan(receipt.getPhuongThucThanhToan())
        .nguoiTaoId(creator == null ? null : creator.getId())
        .tenNguoiTao(creator == null ? null : creator.getHoTen())
        .soTien(receipt.getSoTien())
        .ngayGhiNhan(toOffsetDateTime(receipt.getNgayGhiNhan()))
        .nguonTao(receipt.getNguonTao())
        .trangThai(receipt.getTrangThai())
        .build();
  }

  private PayerSuggestionResponse toPayerSuggestion(NguoiDung user) {
    return payerSuggestion(user.getId(), user.getHoTen(), user.getSoDienThoai());
  }

  private PayerSuggestionResponse toPayerSuggestion(NhaCungCap supplier) {
    return payerSuggestion(
        supplier.getId(), supplier.getTenNhaCungCap(), supplier.getSoDienThoai());
  }

  private PayerSuggestionResponse toPayerSuggestion(DoiTacVanChuyen partner) {
    return payerSuggestion(partner.getId(), partner.getTenDoiTac(), partner.getSoDienThoai());
  }

  private PayerSuggestionResponse payerSuggestion(Long id, String name, String phone) {
    return PayerSuggestionResponse.builder()
        .id(id)
        .tenNguoiNopNhan(name)
        .soDienThoai(phone)
        .build();
  }

  private AdminReceiptResponse toResponse(SoQuyThuChi receipt) {
    NguoiDung creator = receipt.getNguoiTao();

    return AdminReceiptResponse.builder()
        .id(receipt.getId())
        .maPhieu(receipt.getMaPhieu())
        .loaiPhieu(receipt.getLoaiPhieu())
        .loaiThuChiId(receipt.getLoaiThuChi().getId())
        .maLoai(receipt.getLoaiThuChi().getMaLoai())
        .tenLoai(receipt.getLoaiThuChi().getTenLoai())
        .nhomNguoiNopNhan(receipt.getNhomNguoiNopNhan())
        .tenNguoiNopNhan(receipt.getTenNguoiNopNhan())
        .maChungTuThamChieu(receipt.getMaChungTuThamChieu())
        .soTien(receipt.getSoTien())
        .phuongThucThanhToan(receipt.getPhuongThucThanhToan())
        .ngayGhiNhan(toOffsetDateTime(receipt.getNgayGhiNhan()))
        .moTa(receipt.getMoTa())
        .tags(receipt.getTags())
        .nguoiTaoId(creator == null ? null : creator.getId())
        .tenNguoiTao(creator == null ? null : creator.getHoTen())
        .nguonTao(receipt.getNguonTao())
        .trangThai(receipt.getTrangThai())
        .createdAt(toOffsetDateTime(receipt.getCreatedAt()))
        .updatedAt(toOffsetDateTime(receipt.getUpdatedAt()))
        .build();
  }

  private TrangThaiPhieuThuChi parseStatus(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    try {
      return TrangThaiPhieuThuChi.valueOf(value.strip());
    } catch (IllegalArgumentException exception) {
      throw invalidSearch();
    }
  }

  private LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    try {
      return LocalDate.parse(value.strip());
    } catch (DateTimeException exception) {
      throw invalidSearch();
    }
  }

  private NhomNguoiNopNhanEnum parsePayerGroup(String value) {
    String normalized = requiredText(value, "Nhóm người nộp không được để trống.");
    try {
      return NhomNguoiNopNhanEnum.valueOf(normalized);
    } catch (IllegalArgumentException exception) {
      throw invalidRequest("Nhóm người nộp không hợp lệ.");
    }
  }

  private NhomNguoiNopNhanEnum parsePayerGroupFilter(String value) {
    if (value == null || value.isBlank()) {
      throw invalidPayerSearch();
    }

    try {
      return NhomNguoiNopNhanEnum.valueOf(value.strip());
    } catch (IllegalArgumentException exception) {
      throw invalidPayerSearch();
    }
  }

  private String parsePaymentMethod(String value) {
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
      throw invalidRequest("Số tiền phải lớn hơn 0.");
    }
    return amount;
  }

  private LocalDateTime toLocalDateTime(OffsetDateTime value) {
    if (value == null) {
      throw invalidRequest("Ngày ghi nhận không được để trống.");
    }
    return value.atZoneSameInstant(timeZone()).toLocalDateTime();
  }

  private OffsetDateTime toOffsetDateTime(LocalDateTime value) {
    return value == null ? null : value.atZone(timeZone()).toOffsetDateTime();
  }

  private ZoneId timeZone() {
    return ZoneId.of(cashbookTimeZone);
  }

  private String requiredText(String value, String message) {
    String normalized = optionalText(value);
    if (normalized == null) {
      throw invalidRequest(message);
    }
    return normalized;
  }

  private String optionalText(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalidSearch();
    }
  }

  private int parsePageNumber(String value) {
    return parseInteger(value);
  }

  private int parsePageSize(String value) {
    return parseInteger(value);
  }

  private int parseInteger(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException exception) {
      throw invalidSearch();
    }
  }

  private int parsePayerPageValue(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException exception) {
      throw invalidPayerSearch();
    }
  }

  private void validatePayerPagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalidPayerSearch();
    }
  }

  private PageRequest payerPageable(int page, int limit, String nameProperty) {
    return PageRequest.of(
        page, limit, Sort.by(nameProperty).ascending().and(Sort.by("id").ascending()));
  }

  private String toKeywordPattern(String keyword) {
    if (keyword == null || keyword.isBlank()) {
      return null;
    }

    String escaped =
        keyword
            .strip()
            .toLowerCase(Locale.ROOT)
            .replace("!", "!!")
            .replace("%", "!%")
            .replace("_", "!_");
    return "%" + escaped + "%";
  }

  private Long parseReceiptId(String value) {
    try {
      Long id = Long.valueOf(value == null ? "" : value.strip());
      if (id <= 0) {
        throw new NumberFormatException();
      }
      return id;
    } catch (NumberFormatException exception) {
      throw new AppException(ErrorCode.INVALID_ID);
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

  private AppException invalidSearch() {
    return new AppException(ErrorCode.INVALID_RECEIPT_SEARCH);
  }

  private AppException invalidPayerSearch() {
    return new AppException(ErrorCode.INVALID_RECEIPT_PAYER_SEARCH);
  }

  private AppException invalidRequest(String message) {
    return new AppException(ErrorCode.INVALID_RECEIPT_REQUEST, message);
  }
}
