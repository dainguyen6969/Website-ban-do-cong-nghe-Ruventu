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
import com.example.dantruventu.Services.cashbook.CashbookService;
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
public class AdminReceiptService {

  private static final Set<String> PAYMENT_METHODS = Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE");

  private final SoQuyThuChiRepository receiptRepository;
  private final LoaiThuChiRepository receiptTypeRepository;
  private final NguoiDungRepository userRepository;
  private final NhaCungCapRepository supplierRepository;
  private final DoiTacVanChuyenRepository shippingPartnerRepository;
  private final CashbookService cashbookService;

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
    return getActiveCounterpartySuggestions(rawGroup, keyword, page, limit);
  }

  public PayerSuggestionListResponse getActiveCounterpartySuggestions(
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
      AdminReceiptCreateRequest request, NguoiDung authenticatedAdmin, String requestKey) {
    try {
      UUID.fromString(requestKey);
      if (requestKey.length() != 36) {
        throw new IllegalArgumentException();
      }
    } catch (IllegalArgumentException | NullPointerException exception) {
      throw invalidRequest("Idempotency-Key bắt buộc và phải là UUID.");
    }
    return cashbookService.executeOnce(
        "PT-" + requestKey.toLowerCase(Locale.ROOT),
        authenticatedAdmin,
        request,
        AdminReceiptResponse.class,
        () -> persistReceipt(request, authenticatedAdmin));
  }

  private AdminReceiptResponse persistReceipt(
      AdminReceiptCreateRequest request, NguoiDung authenticatedAdmin) {

    if (authenticatedAdmin == null || authenticatedAdmin.getId() == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    if (request.isBackendManagedFieldProvided()) {
      throw invalidRequest("Không được gửi các trường do backend quản lý.");
    }

    String receiptCode = optionalText(request.getMaPhieu());
    if (receiptCode == null) {
      receiptCode = "PT" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
    }
    if (receiptCode.length() > 50 || receiptCode.toUpperCase(Locale.ROOT).startsWith("THU-")) {
      throw invalidRequest("Mã phiếu vượt 50 ký tự hoặc thuộc mã dành cho tự động.");
    }
    NhomNguoiNopNhanEnum payerGroup = parsePayerGroup(request.getNhomNguoiNopNhan());
    Counterparty payer =
        resolveCounterparty(
            payerGroup,
            request.getNguoiNopNhanId(),
            request.getNhaCungCapId(),
            request.getDoiTacVanChuyenId(),
            request.getTenNguoiNopNhan());
    if (payer.name() == null || payer.name().isBlank() || payer.name().length() > 150) {
      throw invalidRequest("Tên người nộp bắt buộc và tối đa 150 ký tự.");
    }
    String paymentMethod = parsePaymentMethod(request.getPhuongThucThanhToan());
    BigDecimal amount = requirePositiveAmount(request.getSoTien());
    LocalDateTime recordedAt = toLocalDateTime(request.getNgayGhiNhan());
    String referenceCode = optionalText(request.getMaChungTuThamChieu());
    if (request.getMoTa() != null
        && request.getMoTa().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 65_535) {
      throw invalidRequest("Mô tả vượt giới hạn cột TEXT.");
    }

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

    if (CashbookService.SYSTEM_RESERVED_TYPE_CODES.contains(
        receiptType.getMaLoai().toUpperCase(Locale.ROOT))) {
      throw invalidRequest("Loại thu này phải được ghi nhận qua nghiệp vụ nguồn.");
    }

    if (receiptRepository.existsByMaPhieuIgnoreCase(receiptCode)) {
      throw new AppException(ErrorCode.RECEIPT_CODE_EXISTS);
    }

    if (referenceCode != null
        && receiptRepository.existsByLoaiPhieuAndNguonTaoAndMaChungTuThamChieuAndSoTien(
            LoaiPhieuThuChi.THU, NguonTaoPhieuThuChi.TU_DONG, referenceCode, amount)) {
      throw new AppException(ErrorCode.RECEIPT_ALREADY_AUTO_RECORDED);
    }

    if (referenceCode != null
        && ((payerGroup == NhomNguoiNopNhanEnum.NHA_CUNG_CAP
                && receiptRepository.isPurchaseOrderReference(referenceCode))
            || receiptRepository.isCodReference(referenceCode))) {
      throw invalidRequest(
          "COD và tiền nhà cung cấp hoàn đơn nhập phải ghi nhận qua nghiệp vụ nguồn.");
    }

    SoQuyThuChi receipt =
        SoQuyThuChi.builder()
            .maPhieu(receiptCode)
            .loaiPhieu(LoaiPhieuThuChi.THU)
            .loaiThuChi(receiptType)
            .nhomNguoiNopNhan(payerGroup)
            .nguoiNopNhan(payer.user())
            .nhaCungCap(payer.supplier())
            .doiTacVanChuyen(payer.partner())
            .tenNguoiNopNhan(payer.name())
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
      String message = exception.getMostSpecificCause().getMessage();
      if (message != null && message.toLowerCase(Locale.ROOT).contains("duplicate")) {
        throw new AppException(ErrorCode.RECEIPT_CODE_EXISTS);
      }
      throw exception;
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
        .nguoiNopNhanId(
            receipt.getNguoiNopNhan() == null ? null : receipt.getNguoiNopNhan().getId())
        .nhaCungCapId(receipt.getNhaCungCap() == null ? null : receipt.getNhaCungCap().getId())
        .doiTacVanChuyenId(
            receipt.getDoiTacVanChuyen() == null ? null : receipt.getDoiTacVanChuyen().getId())
        .maChungTuThamChieu(receipt.getMaChungTuThamChieu())
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
    PayerSuggestionResponse result =
        payerSuggestion(user.getId(), user.getHoTen(), user.getSoDienThoai());
    result.setNguoiNopNhanId(user.getId());
    return result;
  }

  private PayerSuggestionResponse toPayerSuggestion(NhaCungCap supplier) {
    PayerSuggestionResponse result =
        payerSuggestion(supplier.getId(), supplier.getTenNhaCungCap(), supplier.getSoDienThoai());
    result.setNhaCungCapId(supplier.getId());
    return result;
  }

  private PayerSuggestionResponse toPayerSuggestion(DoiTacVanChuyen partner) {
    PayerSuggestionResponse result =
        payerSuggestion(partner.getId(), partner.getTenDoiTac(), partner.getSoDienThoai());
    result.setDoiTacVanChuyenId(partner.getId());
    return result;
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
        .nguoiNopNhanId(
            receipt.getNguoiNopNhan() == null ? null : receipt.getNguoiNopNhan().getId())
        .nhaCungCapId(receipt.getNhaCungCap() == null ? null : receipt.getNhaCungCap().getId())
        .doiTacVanChuyenId(
            receipt.getDoiTacVanChuyen() == null ? null : receipt.getDoiTacVanChuyen().getId())
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
    if (value.toInstant().isAfter(java.time.Instant.now())) {
      throw invalidRequest("Ngày ghi nhận không được ở tương lai.");
    }
    return value.atZoneSameInstant(timeZone()).toLocalDateTime().truncatedTo(ChronoUnit.SECONDS);
  }

  private OffsetDateTime toOffsetDateTime(LocalDateTime value) {
    return value == null ? null : value.atZone(timeZone()).toOffsetDateTime();
  }

  private ZoneId timeZone() {
    return ZoneId.of(cashbookTimeZone);
  }

  public Counterparty resolveCounterparty(
      NhomNguoiNopNhanEnum group, Long userId, Long supplierId, Long partnerId, String freeName) {
    for (Long id : new Long[] {userId, supplierId, partnerId}) {
      if (id != null && id <= 0) {
        throw invalidRequest("FK người nộp không hợp lệ.");
      }
    }
    switch (group) {
      case KHACH_HANG, NHAN_VIEN -> {
        if (supplierId != null || partnerId != null) {
          throw invalidRequest("Nhóm khách hàng/nhân viên chỉ dùng nguoi_nop_nhan_id.");
        }
        if (userId == null) {
          if (group == NhomNguoiNopNhanEnum.NHAN_VIEN) {
            throw invalidRequest("Nhân viên bắt buộc có nguoi_nop_nhan_id.");
          }
          return new Counterparty(null, null, null, freeTextName(freeName));
        }
        NguoiDung user =
            userRepository
                .findById(userId)
                .orElseThrow(() -> invalidRequest("Người nộp không tồn tại."));
        String role =
            user.getVaiTro() == null
                ? ""
                : user.getVaiTro().getTenVaiTro().toLowerCase(Locale.ROOT);
        String roleDescription =
            user.getVaiTro() == null || user.getVaiTro().getMoTa() == null
                ? ""
                : user.getVaiTro().getMoTa().toLowerCase(Locale.ROOT);
        boolean customer =
            Set.of("user", "khach_hang", "khách hàng", "khach hang").contains(role)
                || roleDescription.contains("khách hàng")
                || roleDescription.contains("khach hang");
        if (user.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
            || user.getVaiTro() == null
            || customer != (group == NhomNguoiNopNhanEnum.KHACH_HANG)) {
          throw invalidRequest("Người nộp không hoạt động hoặc không đúng nhóm.");
        }
        return new Counterparty(user, null, null, user.getHoTen());
      }
      case NHA_CUNG_CAP -> {
        if (supplierId == null || userId != null || partnerId != null) {
          throw invalidRequest("Nhóm nhà cung cấp bắt buộc chỉ có nha_cung_cap_id.");
        }
        NhaCungCap supplier =
            supplierRepository
                .findById(supplierId)
                .orElseThrow(() -> invalidRequest("Nhà cung cấp không tồn tại."));
        if (supplier.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
          throw invalidRequest("Nhà cung cấp không hoạt động.");
        }
        return new Counterparty(null, supplier, null, supplier.getTenNhaCungCap());
      }
      case DOI_TAC_GIAO_HANG -> {
        if (partnerId == null || userId != null || supplierId != null) {
          throw invalidRequest("Nhóm giao hàng bắt buộc chỉ có doi_tac_van_chuyen_id.");
        }
        DoiTacVanChuyen partner =
            shippingPartnerRepository
                .findById(partnerId)
                .orElseThrow(() -> invalidRequest("Đối tác giao hàng không tồn tại."));
        if (partner.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
          throw invalidRequest("Đối tác giao hàng không hoạt động.");
        }
        return new Counterparty(null, null, partner, partner.getTenDoiTac());
      }
      case KHAC -> {
        if (userId != null || supplierId != null || partnerId != null) {
          throw invalidRequest("Nhóm KHAC không được gửi FK.");
        }
        return new Counterparty(null, null, null, freeTextName(freeName));
      }
      default -> throw invalidRequest("Nhóm người nộp không hợp lệ.");
    }
  }

  private String freeTextName(String name) {
    return requiredText(name, "Tên khách lẻ/người nộp nhận không được để trống.");
  }

  public record Counterparty(
      NguoiDung user, NhaCungCap supplier, DoiTacVanChuyen partner, String name) {}

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
    return PageRequest.of(page, limit, Sort.by("id").descending());
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
