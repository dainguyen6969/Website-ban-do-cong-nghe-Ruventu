package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashFlowBucketItemResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashFlowResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookFilterResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookOverviewResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookSummaryResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookTransactionResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Specification.CashbookSpecification;
import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCashbookService {

  private static final BigDecimal ZERO = BigDecimal.ZERO;
  private static final Sort CASHBOOK_SORT =
      Sort.by("ngayGhiNhan").descending().and(Sort.by("id").descending());
  private static final Set<String> PAYMENT_METHODS = Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE");

  private final SoQuyThuChiRepository cashbookRepository;
  private final NguoiDungRepository userRepository;
  private final CashbookExcelExporter excelExporter;

  @Value("${ruventu.cashbook.time-zone:Asia/Ho_Chi_Minh}")
  private String cashbookTimeZone;

  public CashbookResponse getCashbook(
      String rawStartDate,
      String rawEndDate,
      String rawKeyword,
      String rawVoucherType,
      String rawPaymentMethod,
      String rawPayerGroup,
      String rawPayerName,
      String rawCreatorId,
      String rawPage,
      String rawLimit) {

    CashbookCriteria criteria =
        prepareCriteria(
            rawStartDate,
            rawEndDate,
            rawKeyword,
            rawVoucherType,
            rawPaymentMethod,
            rawPayerGroup,
            rawPayerName,
            rawCreatorId,
            ErrorCode.INVALID_CASHBOOK_FILTER,
            ErrorCode.CASHBOOK_FILTER_REFERENCE_NOT_FOUND);

    int page = parseInteger(rawPage, ErrorCode.INVALID_CASHBOOK_FILTER);
    int limit = parseInteger(rawLimit, ErrorCode.INVALID_CASHBOOK_FILTER);
    validatePagination(page, limit, ErrorCode.INVALID_CASHBOOK_FILTER);

    Page<SoQuyThuChi> result =
        cashbookRepository.findAll(
            buildSpecification(criteria), PageRequest.of(page, limit, CASHBOOK_SORT));
    CashbookSummaryResponse summary = calculateSummary(criteria);

    return CashbookResponse.builder()
        .boLoc(toFilterResponse(criteria))
        .tongHop(summary)
        .items(toTransactions(result.getContent(), (long) page * limit + 1))
        .pagination(toPagination(result))
        .build();
  }

  public CashbookOverviewResponse getOverview(
      String rawStartDate,
      String rawEndDate,
      String rawKeyword,
      String rawVoucherType,
      String rawPaymentMethod,
      String rawPayerGroup,
      String rawPayerName,
      String rawCreatorId) {
    try {
      CashbookCriteria criteria =
          prepareCriteria(
              rawStartDate,
              rawEndDate,
              rawKeyword,
              rawVoucherType,
              rawPaymentMethod,
              rawPayerGroup,
              rawPayerName,
              rawCreatorId,
              ErrorCode.INVALID_CASHBOOK_OVERVIEW_FILTER,
              null);

      // Dùng đúng phép tổng hợp của /cashbook để bảo đảm ton_quy = ton_cuoi_ky.
      CashbookSummaryResponse summary = calculateSummary(criteria);
      return CashbookOverviewResponse.builder()
          .boLoc(toFilterResponse(criteria))
          .soDuDauKy(summary.getSoDuDauKy())
          .tongThu(summary.getTongThu())
          .tongChi(summary.getTongChi())
          .tonQuy(summary.getTonCuoiKy())
          .build();
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không thể tổng hợp dữ liệu tổng quan quỹ", exception);
      throw new AppException(ErrorCode.CASHBOOK_OVERVIEW_AGGREGATION_FAILED);
    }
  }

  public CashFlowResponse getCashFlow(
      String rawStartDate,
      String rawEndDate,
      String rawGrouping,
      String rawKeyword,
      String rawVoucherType,
      String rawPaymentMethod,
      String rawPayerGroup,
      String rawPayerName,
      String rawCreatorId) {
    try {
      CashFlowGrouping grouping = parseGrouping(rawGrouping);
      CashbookCriteria criteria =
          prepareCriteria(
              rawStartDate,
              rawEndDate,
              rawKeyword,
              rawVoucherType,
              rawPaymentMethod,
              rawPayerGroup,
              rawPayerName,
              rawCreatorId,
              ErrorCode.INVALID_CASH_FLOW_FILTER,
              null);

      CashFlowDateRange dateRange = resolveCashFlowDateRange(criteria);
      boolean hasData = dateRange != null;
      List<CashFlowBucketItemResponse> items =
          hasData
              ? aggregateCashFlowBuckets(
                  criteria, grouping, dateRange.startDate(), dateRange.endDate())
              : List.of();

      return CashFlowResponse.builder()
          .boLoc(toFilterResponse(criteria))
          .nhomTheo(grouping.name())
          .coDuLieu(hasData)
          .items(items)
          .build();
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không thể tổng hợp dữ liệu biểu đồ dòng tiền", exception);
      throw new AppException(ErrorCode.CASH_FLOW_AGGREGATION_FAILED);
    }
  }

  public byte[] exportCashbook(
      String rawStartDate,
      String rawEndDate,
      String rawKeyword,
      String rawVoucherType,
      String rawPaymentMethod,
      String rawPayerGroup,
      String rawPayerName,
      String rawCreatorId,
      boolean paginationParameterPresent) {
    if (paginationParameterPresent) {
      throw new AppException(ErrorCode.INVALID_CASHBOOK_EXPORT_FILTER);
    }

    try {
      CashbookCriteria criteria =
          prepareCriteria(
              rawStartDate,
              rawEndDate,
              rawKeyword,
              rawVoucherType,
              rawPaymentMethod,
              rawPayerGroup,
              rawPayerName,
              rawCreatorId,
              ErrorCode.INVALID_CASHBOOK_EXPORT_FILTER,
              ErrorCode.CASHBOOK_EXPORT_REFERENCE_NOT_FOUND);

      List<SoQuyThuChi> result =
          cashbookRepository.findAll(buildSpecification(criteria), CASHBOOK_SORT);
      CashbookSummaryResponse summary = calculateSummary(criteria);
      List<CashbookTransactionResponse> transactions = toTransactions(result, 1L);

      // Excel được dựng hoàn chỉnh thành byte[] trước khi Controller tạo response 200.
      return excelExporter.export(toFilterResponse(criteria), summary, transactions);
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không thể truy vấn hoặc tạo file Excel sổ quỹ", exception);
      throw new AppException(ErrorCode.CASHBOOK_EXPORT_FAILED);
    }
  }

  private CashbookCriteria prepareCriteria(
      String rawStartDate,
      String rawEndDate,
      String rawKeyword,
      String rawVoucherType,
      String rawPaymentMethod,
      String rawPayerGroup,
      String rawPayerName,
      String rawCreatorId,
      ErrorCode invalidFilterError,
      ErrorCode referenceNotFoundError) {
    LocalDate startDate = parseOptionalDate(rawStartDate, invalidFilterError);
    LocalDate endDate = parseOptionalDate(rawEndDate, invalidFilterError);
    if ((startDate != null && endDate != null && startDate.isAfter(endDate))
        || LocalDate.MAX.equals(endDate)) {
      throw new AppException(invalidFilterError);
    }

    LoaiPhieuThuChi voucherType =
        parseOptionalEnum(rawVoucherType, LoaiPhieuThuChi.class, invalidFilterError);
    NhomNguoiNopNhanEnum payerGroup =
        parseOptionalEnum(rawPayerGroup, NhomNguoiNopNhanEnum.class, invalidFilterError);
    // Ngoại lệ nghiệp vụ: phương thức không hợp lệ được bỏ qua thay vì trả 400.
    String paymentMethod = parseLenientPaymentMethod(rawPaymentMethod);
    String keyword = normalizeOptional(rawKeyword);
    String keywordPattern = toLikePattern(keyword);
    String payerName = normalizeOptional(rawPayerName);
    String payerNamePattern = toLikePattern(payerName);
    Long creatorId = parseOptionalPositiveId(rawCreatorId, invalidFilterError);

    if (referenceNotFoundError != null) {
      validateReferencedFilters(creatorId, payerGroup, payerName, referenceNotFoundError);
    }

    ZoneId zoneId = timeZone();
    LocalDateTime startInclusive =
        startDate == null ? null : startDate.atStartOfDay(zoneId).toLocalDateTime();
    // Cận trên độc quyền đầu ngày kế tiếp bao phủ toàn bộ den_ngay tại Asia/Ho_Chi_Minh.
    LocalDateTime endExclusive =
        endDate == null ? null : endDate.plusDays(1).atStartOfDay(zoneId).toLocalDateTime();

    return new CashbookCriteria(
        startDate,
        endDate,
        keyword,
        keywordPattern,
        voucherType,
        paymentMethod,
        payerGroup,
        payerName,
        payerNamePattern,
        creatorId,
        startInclusive,
        endExclusive);
  }

  private org.springframework.data.jpa.domain.Specification<SoQuyThuChi> buildSpecification(
      CashbookCriteria criteria) {
    return CashbookSpecification.build(
        criteria.startInclusive(),
        criteria.endExclusive(),
        criteria.keywordPattern(),
        criteria.voucherType(),
        criteria.paymentMethod(),
        criteria.payerGroup(),
        criteria.payerNamePattern(),
        criteria.creatorId());
  }

  private CashbookSummaryResponse calculateSummary(CashbookCriteria criteria) {
    BigDecimal totalReceipts =
        sumAmount(
            LoaiPhieuThuChi.THU, criteria, criteria.startInclusive(), criteria.endExclusive());
    BigDecimal totalDisbursements =
        sumAmount(
            LoaiPhieuThuChi.CHI, criteria, criteria.startInclusive(), criteria.endExclusive());
    BigDecimal openingBalance = calculateOpeningBalance(criteria);

    return CashbookSummaryResponse.builder()
        .soDuDauKy(openingBalance)
        .tongThu(totalReceipts)
        .tongChi(totalDisbursements)
        .tonCuoiKy(openingBalance.add(totalReceipts).subtract(totalDisbursements))
        .build();
  }

  /**
   * Số dư đầu kỳ áp dụng tất cả bộ lọc không phải ngày và chỉ lấy giao dịch trước đầu tu_ngay. Hai
   * phép SUM chạy tại database, không tải lịch sử vào bộ nhớ.
   */
  private BigDecimal calculateOpeningBalance(CashbookCriteria criteria) {
    if (criteria.startInclusive() == null) {
      return ZERO;
    }
    BigDecimal receiptsBeforePeriod =
        sumAmount(LoaiPhieuThuChi.THU, criteria, null, criteria.startInclusive());
    BigDecimal disbursementsBeforePeriod =
        sumAmount(LoaiPhieuThuChi.CHI, criteria, null, criteria.startInclusive());
    return receiptsBeforePeriod.subtract(disbursementsBeforePeriod);
  }

  private BigDecimal sumAmount(
      LoaiPhieuThuChi amountType,
      CashbookCriteria criteria,
      LocalDateTime startInclusive,
      LocalDateTime endExclusive) {
    BigDecimal result =
        cashbookRepository.sumCashbookAmount(
            amountType,
            criteria.voucherType(),
            TrangThaiPhieuThuChi.DA_GHI_NHAN,
            criteria.keywordPattern(),
            criteria.paymentMethod(),
            criteria.payerGroup(),
            criteria.payerNamePattern(),
            criteria.creatorId(),
            startInclusive,
            endExclusive);
    return result == null ? ZERO : result;
  }

  private List<CashFlowBucketItemResponse> aggregateCashFlowBuckets(
      CashbookCriteria criteria,
      CashFlowGrouping grouping,
      LocalDate rangeStartDate,
      LocalDate rangeEndDate) {
    List<BucketRange> ranges = buildBucketRanges(rangeStartDate, rangeEndDate, grouping);
    List<CashFlowBucketItemResponse> items = new ArrayList<>(ranges.size());

    for (BucketRange range : ranges) {
      LocalDateTime bucketStart = range.startDate().atStartOfDay(timeZone()).toLocalDateTime();
      LocalDateTime bucketEndExclusive =
          range.endDateExclusive().atStartOfDay(timeZone()).toLocalDateTime();

      items.add(
          CashFlowBucketItemResponse.builder()
              .tuNgay(range.startDate())
              .denNgay(range.endDateExclusive().minusDays(1))
              .tongThu(sumAmount(LoaiPhieuThuChi.THU, criteria, bucketStart, bucketEndExclusive))
              .tongChi(sumAmount(LoaiPhieuThuChi.CHI, criteria, bucketStart, bucketEndExclusive))
              .build());
    }
    return items;
  }

  private CashFlowDateRange resolveCashFlowDateRange(CashbookCriteria criteria) {
    Page<SoQuyThuChi> firstResult =
        cashbookRepository.findAll(
            buildSpecification(criteria),
            PageRequest.of(
                0, 1, Sort.by("ngayGhiNhan").ascending().and(Sort.by("id").ascending())));
    if (firstResult.isEmpty()) {
      return null;
    }

    LocalDate startDate =
        criteria.startDate() != null
            ? criteria.startDate()
            : firstResult.getContent().getFirst().getNgayGhiNhan().toLocalDate();
    LocalDate endDate = criteria.endDate();
    if (endDate == null) {
      Page<SoQuyThuChi> lastResult =
          cashbookRepository.findAll(
              buildSpecification(criteria),
              PageRequest.of(
                  0, 1, Sort.by("ngayGhiNhan").descending().and(Sort.by("id").descending())));
      endDate = lastResult.getContent().getFirst().getNgayGhiNhan().toLocalDate();
    }
    return new CashFlowDateRange(startDate, endDate);
  }

  /** Tạo bucket tăng dần; bucket đầu/cuối tự động được cắt theo khoảng ngày yêu cầu. */
  List<BucketRange> buildBucketRanges(
      LocalDate startDate, LocalDate endDate, CashFlowGrouping grouping) {
    LocalDate requestedEndExclusive = endDate.plusDays(1);
    LocalDate cursor = startDate;
    List<BucketRange> ranges = new ArrayList<>();

    while (cursor.isBefore(requestedEndExclusive)) {
      LocalDate naturalEndExclusive =
          switch (grouping) {
            case NGAY -> cursor.plusDays(1);
            case TUAN -> cursor.plusDays(8L - cursor.getDayOfWeek().getValue());
            case THANG -> cursor.withDayOfMonth(1).plusMonths(1);
          };
      LocalDate bucketEndExclusive =
          naturalEndExclusive.isAfter(requestedEndExclusive)
              ? requestedEndExclusive
              : naturalEndExclusive;
      ranges.add(new BucketRange(cursor, bucketEndExclusive));
      cursor = bucketEndExclusive;
    }
    return ranges;
  }

  private CashbookFilterResponse toFilterResponse(CashbookCriteria criteria) {
    return CashbookFilterResponse.builder()
        .tuNgay(criteria.startDate())
        .denNgay(criteria.endDate())
        .keyword(criteria.keyword())
        .loaiPhieu(criteria.voucherType())
        .phuongThucThanhToan(criteria.paymentMethod())
        .nhomNguoiNopNhan(criteria.payerGroup())
        .tenNguoiNopNhan(criteria.payerName())
        .nguoiTaoId(criteria.creatorId())
        .build();
  }

  private List<CashbookTransactionResponse> toTransactions(
      List<SoQuyThuChi> transactions, long firstSequence) {
    List<CashbookTransactionResponse> items = new ArrayList<>(transactions.size());
    long sequence = firstSequence;
    for (SoQuyThuChi transaction : transactions) {
      items.add(toTransaction(transaction, sequence++));
    }
    return items;
  }

  private CashbookTransactionResponse toTransaction(SoQuyThuChi transaction, long sequence) {
    NguoiDung creator = transaction.getNguoiTao();
    boolean receipt = transaction.getLoaiPhieu() == LoaiPhieuThuChi.THU;

    return CashbookTransactionResponse.builder()
        .id(transaction.getId())
        .stt(sequence)
        .loaiPhieu(transaction.getLoaiPhieu())
        .ngayGhiNhan(toOffsetDateTime(transaction.getNgayGhiNhan()))
        .maPhieu(transaction.getMaPhieu())
        .nhomNguoiNopNhan(transaction.getNhomNguoiNopNhan())
        .tenNguoiNopNhan(transaction.getTenNguoiNopNhan())
        .phuongThucThanhToan(transaction.getPhuongThucThanhToan())
        .tienThu(receipt ? transaction.getSoTien() : ZERO)
        .tienChi(receipt ? ZERO : transaction.getSoTien())
        .moTa(transaction.getMoTa())
        .nguoiTaoId(creator == null ? null : creator.getId())
        .tenNguoiTao(creator == null ? "Hệ thống" : creator.getHoTen())
        .nguonTao(transaction.getNguonTao())
        .trangThai(transaction.getTrangThai())
        .build();
  }

  private void validateReferencedFilters(
      Long creatorId,
      NhomNguoiNopNhanEnum payerGroup,
      String payerName,
      ErrorCode referenceNotFoundError) {
    if (creatorId != null && !userRepository.existsById(creatorId)) {
      throw new AppException(referenceNotFoundError);
    }

    // Chỉ kiểm tra tồn tại lịch sử khi đồng thời có cả nhóm và tên.
    if (payerGroup != null
        && payerName != null
        && !cashbookRepository.existsByNhomNguoiNopNhanAndTenNguoiNopNhanIgnoreCase(
            payerGroup, payerName)) {
      throw new AppException(referenceNotFoundError);
    }
  }

  private LocalDate parseOptionalDate(String value, ErrorCode invalidFilterError) {
    if (value == null) {
      return null;
    }
    if (value.isBlank()) {
      throw new AppException(invalidFilterError);
    }
    try {
      return LocalDate.parse(value.strip());
    } catch (DateTimeException exception) {
      throw new AppException(invalidFilterError);
    }
  }

  private <E extends Enum<E>> E parseOptionalEnum(
      String value, Class<E> enumType, ErrorCode invalidFilterError) {
    if (value == null) {
      return null;
    }
    if (value.isBlank()) {
      throw new AppException(invalidFilterError);
    }
    try {
      return Enum.valueOf(enumType, value.strip());
    } catch (IllegalArgumentException exception) {
      throw new AppException(invalidFilterError);
    }
  }

  private String parseLenientPaymentMethod(String value) {
    if (value == null) {
      return null;
    }
    String normalized = value.strip();
    return PAYMENT_METHODS.contains(normalized) ? normalized : null;
  }

  private Long parseOptionalPositiveId(String value, ErrorCode invalidFilterError) {
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
      throw new AppException(invalidFilterError);
    }
  }

  private CashFlowGrouping parseGrouping(String value) {
    if (value == null || value.isBlank()) {
      throw new AppException(ErrorCode.INVALID_CASH_FLOW_FILTER);
    }
    try {
      return CashFlowGrouping.valueOf(value.strip());
    } catch (IllegalArgumentException exception) {
      throw new AppException(ErrorCode.INVALID_CASH_FLOW_FILTER);
    }
  }

  private int parseInteger(String value, ErrorCode invalidFilterError) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException exception) {
      throw new AppException(invalidFilterError);
    }
  }

  private void validatePagination(int page, int limit, ErrorCode invalidFilterError) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw new AppException(invalidFilterError);
    }
  }

  private String normalizeOptional(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private String toLikePattern(String value) {
    if (value == null) {
      return null;
    }
    String escaped =
        value.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_");
    return "%" + escaped + "%";
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

  private record CashbookCriteria(
      LocalDate startDate,
      LocalDate endDate,
      String keyword,
      String keywordPattern,
      LoaiPhieuThuChi voucherType,
      String paymentMethod,
      NhomNguoiNopNhanEnum payerGroup,
      String payerName,
      String payerNamePattern,
      Long creatorId,
      LocalDateTime startInclusive,
      LocalDateTime endExclusive) {}

  enum CashFlowGrouping {
    NGAY,
    TUAN,
    THANG
  }

  record BucketRange(LocalDate startDate, LocalDate endDateExclusive) {}

  record CashFlowDateRange(LocalDate startDate, LocalDate endDate) {}
}
