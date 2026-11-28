package com.example.dantruventu.Services.printing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CashVoucherPrintSourceTest {
  private SoQuyThuChiRepository repository;
  private CashVoucherPrintSource source;

  @BeforeEach
  void setup() {
    repository = mock(SoQuyThuChiRepository.class);
    source = new CashVoucherPrintSource(repository);
  }

  @Test
  void automaticReceiptPrintsStoredPayerAndSystemCreatorWithoutCreatingMoney() {
    SoQuyThuChi voucher = voucher(LoaiPhieuThuChi.THU);
    when(repository.findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.THU))
        .thenReturn(Optional.of(voucher));
    PrintDocument result = source.load(30L, LoaiPhieuThuChi.THU);
    String text = result.toString();
    assertEquals("PHIẾU THU", result.title());
    assertTrue(text.contains("Tên đã lưu lúc lập"));
    assertTrue(text.contains("Hệ thống"));
    assertTrue(text.contains("150.000 VNĐ"));
    assertFalse(result.cancelled());
    verify(repository).findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.THU);
    verifyNoMoreInteractions(repository);
  }

  @Test
  void cancelledDisbursementPreservesOriginalAmountAndReference() {
    SoQuyThuChi voucher = voucher(LoaiPhieuThuChi.CHI);
    voucher.setTrangThai(TrangThaiPhieuThuChi.HUY);
    when(repository.findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.CHI))
        .thenReturn(Optional.of(voucher));
    PrintDocument result = source.load(30L, LoaiPhieuThuChi.CHI);
    assertEquals("PHIẾU CHI", result.title());
    assertTrue(result.cancelled());
    assertTrue(result.toString().contains("150.000 VNĐ"));
    assertTrue(result.toString().contains("BH-GOC"));
    assertEquals(new BigDecimal("150000.00"), voucher.getSoTien());
    assertEquals(TrangThaiPhieuThuChi.HUY, voucher.getTrangThai());
    verify(repository).findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.CHI);
    verifyNoMoreInteractions(repository);
  }

  @Test
  void missingOrOppositeVoucherTypeIsNotFound() {
    when(repository.findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.THU)).thenReturn(Optional.empty());
    AppException exception =
        assertThrows(AppException.class, () -> source.load(30L, LoaiPhieuThuChi.THU));
    assertEquals(ErrorCode.PRINT_RECORD_NOT_FOUND, exception.getErrorCode());
    verify(repository).findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.THU);
    verifyNoMoreInteractions(repository);
  }

  @Test
  void legacyCancelledVoucherWithoutDatePrintsExplicitGapWithoutInventingDate() {
    SoQuyThuChi voucher = voucher(LoaiPhieuThuChi.THU);
    voucher.setTrangThai(TrangThaiPhieuThuChi.HUY);
    voucher.setNgayGhiNhan(null);
    voucher.setCreatedAt(LocalDateTime.of(2026, 1, 1, 12, 0));
    when(repository.findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.THU))
        .thenReturn(Optional.of(voucher));
    PrintDocument result = source.load(30L, LoaiPhieuThuChi.THU);
    assertTrue(result.cancelled());
    assertTrue(result.toString().contains("Chưa có dữ liệu ngày ghi nhận trong phiếu gốc"));
    assertTrue(result.toString().contains("150.000 VNĐ"));
    assertFalse(result.toString().contains("01/01/2026"));
    assertNull(voucher.getNgayGhiNhan());
    verify(repository).findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.THU);
    verifyNoMoreInteractions(repository);
  }

  @Test
  void malformedStoredMoneyIsNotPresentedAsZero() {
    SoQuyThuChi voucher = voucher(LoaiPhieuThuChi.THU);
    voucher.setSoTien(null);
    when(repository.findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.THU))
        .thenReturn(Optional.of(voucher));
    assertEquals(
        ErrorCode.PRINT_HISTORY_CONFLICT,
        assertThrows(AppException.class, () -> source.load(30L, LoaiPhieuThuChi.THU))
            .getErrorCode());
  }

  @Test
  void missingStatusIsNotPrintedAsConfirmed() {
    SoQuyThuChi voucher = voucher(LoaiPhieuThuChi.THU);
    voucher.setTrangThai(null);
    when(repository.findByIdAndLoaiPhieu(30L, LoaiPhieuThuChi.THU))
        .thenReturn(Optional.of(voucher));
    assertEquals(
        ErrorCode.PRINT_HISTORY_CONFLICT,
        assertThrows(AppException.class, () -> source.load(30L, LoaiPhieuThuChi.THU))
            .getErrorCode());
  }

  private SoQuyThuChi voucher(LoaiPhieuThuChi type) {
    return SoQuyThuChi.builder()
        .id(30L)
        .loaiPhieu(type)
        .maPhieu("PT-TEST")
        .loaiThuChi(LoaiThuChi.builder().id(1L).tenLoai("Thu/chi bảo hành").build())
        .tenNguoiNopNhan("Tên đã lưu lúc lập")
        .soTien(new BigDecimal("150000.00"))
        .phuongThucThanhToan("TIEN_MAT")
        .maChungTuThamChieu("BH-GOC")
        .ngayGhiNhan(LocalDateTime.of(2026, 11, 25, 9, 0))
        .nguonTao(NguonTaoPhieuThuChi.TU_DONG)
        .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
        .build();
  }
}
