package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyListItemResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyListResponse;
import com.example.dantruventu.Enum.TrangThaiBaoGiaBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiHoaDonBaoHanh;
import com.example.dantruventu.Enum.TrangThaiHoanTienBaoHanh;
import com.example.dantruventu.Enum.TrangThaiThanhToanBaoHanh;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.warranty.WarrantyListRepository;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminWarrantyService {
  private static final ZoneId VIETNAM_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private final WarrantyListRepository repository;

  public AdminWarrantyListResponse getWarranties(
      String keyword,
      String processingStatus,
      String quoteStatus,
      String paymentStatus,
      String refundStatus,
      String startDate,
      String endDate,
      String page,
      String limit) {
    int pageNumber = parseInteger(page, 0);
    int pageSize = parseInteger(limit, 20);
    if (pageNumber < 0
        || pageSize < 1
        || pageSize > 100
        || (long) pageNumber * pageSize > Integer.MAX_VALUE) {
      throw invalidSearch();
    }

    LocalDate start = parseDate(startDate);
    LocalDate end = parseDate(endDate);
    if (start != null && end != null && start.isAfter(end)) {
      throw invalidSearch();
    }
    // MySQL DATETIME/TIMESTAMP comparisons must stay within the supported date range.
    if (end != null && end.equals(LocalDate.of(9999, 12, 31))) {
      throw invalidSearch();
    }

    WarrantyListRepository.Filter filter =
        new WarrantyListRepository.Filter(
            normalize(keyword),
            parseEnum(processingStatus, TrangThaiBaoHanh.class),
            parseEnum(quoteStatus, TrangThaiBaoGiaBaoHanh.class),
            parseEnum(paymentStatus, TrangThaiThanhToanBaoHanh.class),
            parseEnum(refundStatus, TrangThaiHoanTienBaoHanh.class),
            start == null ? null : start.atStartOfDay(),
            end == null ? null : end.plusDays(1).atStartOfDay());

    Page<WarrantyListRepository.Row> result =
        repository.findAll(filter, PageRequest.of(pageNumber, pageSize));
    return AdminWarrantyListResponse.builder()
        .items(result.getContent().stream().map(this::toResponse).toList())
        .pagination(
            PaginationResponse.builder()
                .page(pageNumber)
                .limit(pageSize)
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build())
        .build();
  }

  private AdminWarrantyListItemResponse toResponse(WarrantyListRepository.Row row) {
    if (row.activeInvoiceCount() > 1) {
      throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    }
    String feeStatus =
        row.hoaDonId() == null
            ? "Không phát sinh phí"
            : row.invoiceStatus() == TrangThaiHoaDonBaoHanh.HUY
                ? "Hóa đơn đã hủy"
                : "Có hóa đơn bảo hành";
    return AdminWarrantyListItemResponse.builder()
        .id(row.id())
        .maPhieu(row.maPhieu())
        .donHangId(row.donHangId())
        .maDonHang(row.maDonHang())
        .khachHangId(row.khachHangId())
        .tenNguoiLienHe(row.tenNguoiLienHe())
        .sdtNguoiLienHe(row.sdtNguoiLienHe())
        .tenSanPham(row.tenSanPham())
        .maTheoDoi(row.maTheoDoi())
        .soSerial(row.soSerial())
        .trangThaiXuLy(row.processingStatus())
        .trangThaiBaoGia(row.quoteStatus())
        .trangThaiThanhToan(row.paymentStatus())
        .trangThaiHoanTien(row.refundStatus())
        .ngayTiepNhan(toVietnamTime(row.ngayTiepNhan()))
        .ngayCapNhat(toVietnamTime(row.ngayCapNhat()))
        .hoaDonId(row.hoaDonId())
        .trangThaiHoaDon(row.invoiceStatus())
        .tinhTrangPhi(feeStatus)
        .conPhaiHoan(row.conPhaiHoan())
        .doiSoatNccConMo(null)
        .build();
  }

  private OffsetDateTime toVietnamTime(LocalDateTime time) {
    return time == null ? null : time.atZone(VIETNAM_TIME_ZONE).toOffsetDateTime();
  }

  private int parseInteger(String value, int defaultValue) {
    if (value == null) return defaultValue;
    try {
      if (!value.trim().matches("[0-9]+")) throw invalidSearch();
      return Integer.parseInt(value.trim());
    } catch (NumberFormatException exception) {
      throw invalidSearch();
    }
  }

  private LocalDate parseDate(String value) {
    if (value == null) return null;
    try {
      if (!value.trim().matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw invalidSearch();
      LocalDate result = LocalDate.parse(value.trim());
      if (result.getYear() < 1000) throw invalidSearch();
      return result;
    } catch (DateTimeException exception) {
      throw invalidSearch();
    }
  }

  private <E extends Enum<E>> E parseEnum(String value, Class<E> type) {
    if (value == null) return null;
    try {
      return Enum.valueOf(type, value.trim());
    } catch (IllegalArgumentException exception) {
      throw invalidSearch();
    }
  }

  private String normalize(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private AppException invalidSearch() {
    return new AppException(ErrorCode.INVALID_WARRANTY_SEARCH);
  }
}
