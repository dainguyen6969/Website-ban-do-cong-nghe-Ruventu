package com.example.dantruventu.Services.printing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.LichSuXuLyDonHangRepository;
import com.example.dantruventu.Repository.printing.OrderIssueEvidenceRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;

class OrderIssuePrintSourceTest {
  static class Fixture {
    final DonHangRepository orders = mock(DonHangRepository.class);
    final ChiTietDonHangRepository lines = mock(ChiTietDonHangRepository.class);
    final TheKhoRepository ledgers = mock(TheKhoRepository.class);
    final LichSuXuLyDonHangRepository histories = mock(LichSuXuLyDonHangRepository.class);
    final SoSerialSanPhamRepository serials = mock(SoSerialSanPhamRepository.class);
    final SoQuyThuChiRepository cash = mock(SoQuyThuChiRepository.class);
    final OrderIssueEvidenceRepository evidence = mock(OrderIssueEvidenceRepository.class);
    final OrderIssuePrintSource source =
        new OrderIssuePrintSource(orders, lines, ledgers, histories, serials, cash, evidence);
    final LocalDateTime time = LocalDateTime.of(2026, 11, 20, 9, 30);
    final NguoiDung exporter = NguoiDung.builder().id(8L).hoTen("Nguyễn Văn An").build();
    final DonHang order =
        DonHang.builder()
            .id(1L)
            .maDonHang("DH-001")
            .loaiDonHang(LoaiDonHang.ONLINE)
            .trangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO)
            .build();
    final PhienBanSanPham variant = variant(10L, LoaiSanPham.DON, false);
    final ChiTietDonHang line = line(1L, variant, 2, false);
    final TheKho issue = issue(1L, variant, -2);
    final LichSuXuLyDonHang event =
        LichSuXuLyDonHang.builder()
            .id(1L)
            .donHang(order)
            .nguoiThucHien(exporter)
            .hanhDong("XUAT_KHO")
            .ngayThucHien(time)
            .trangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO)
            .build();

    Fixture() {
      when(orders.findById(1L)).thenReturn(Optional.of(order));
      when(lines.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of(line));
      when(ledgers.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(1L, LoaiGiaoDichKho.XUAT_BAN))
          .thenReturn(List.of(issue));
      when(histories.findByDonHang_IdOrderByNgayThucHienAscIdAsc(1L)).thenReturn(List.of(event));
      when(serials.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of());
    }

    PhienBanSanPham variant(Long id, LoaiSanPham type, boolean serial) {
      return PhienBanSanPham.builder()
          .id(id)
          .tenPhienBan("Phiên bản " + id)
          .coQuanLySerial(serial)
          .sanPham(
              SanPham.builder()
                  .id(id)
                  .tenSanPham("Sản phẩm " + id)
                  .maSanPham("SP-" + id)
                  .loaiSanPham(type)
                  .build())
          .build();
    }

    ChiTietDonHang line(Long id, PhienBanSanPham version, int quantity, boolean gift) {
      return ChiTietDonHang.builder()
          .id(id)
          .donHang(order)
          .phienBan(version)
          .soLuong(quantity)
          .laQuaTang(gift)
          .build();
    }

    TheKho issue(Long id, PhienBanSanPham version, int delta) {
      return TheKho.builder()
          .id(id)
          .maChungTuGoc(1L)
          .loaiGiaoDich(LoaiGiaoDichKho.XUAT_BAN)
          .phienBan(version)
          .khoHang(KhoHang.builder().id(1L).tenKho("Kho chính").build())
          .soLuongThayDoi(delta)
          .ngayTao(time)
          .build();
    }

    void conflict() {
      assertEquals(
          ErrorCode.PRINT_HISTORY_CONFLICT,
          assertThrows(AppException.class, () -> source.load(1L)).getErrorCode());
    }
  }

  @Test
  void rejectsInvalidAndAbsentOrderIds() {
    var f = new Fixture();
    assertEquals(
        ErrorCode.INVALID_PRINT_REQUEST,
        assertThrows(AppException.class, () -> f.source.load(0L)).getErrorCode());
    assertEquals(
        ErrorCode.PRINT_RECORD_NOT_FOUND,
        assertThrows(AppException.class, () -> f.source.load(99L)).getErrorCode());
  }

  @Test
  void packedOrReservedOrderIsNotAnIssue() {
    var f = new Fixture();
    f.order.setTrangThaiXuatKho(TrangThaiXuatKho.CHUA_XUAT_KHO);
    f.order.setTrangThaiDongGoi(TrangThaiDongGoi.DA_DONG_GOI);
    f.conflict();
    verifyNoInteractions(f.ledgers);
  }

  @Test
  void returnedNonserialOrderRetainsOriginalQuantityAndDoesNotWriteAnything() {
    var f = new Fixture();
    f.order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_HOAN_KHO);
    var result = f.source.load(1L);
    assertEquals("PHIẾU XUẤT KHO", result.title());
    assertEquals("2", result.sections().get(2).rows().get(0).get(4));
    assertTrue(result.notes().stream().anyMatch(note -> note.contains("hoàn kho")));
    assertFalse(result.cancelled());
    assertEquals(-2, f.issue.getSoLuongThayDoi());
    verify(f.ledgers).findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(1L, LoaiGiaoDichKho.XUAT_BAN);
    verify(f.ledgers, never()).save(any());
    verify(f.orders, never()).save(any());
  }

  @Test
  void componentAndGiftQuantitiesComeFromOriginalLedgerWithoutExpandingCurrentCombo() {
    var f = new Fixture();
    var combo = f.variant(50L, LoaiSanPham.BO_PC, false);
    var gift = f.variant(12L, LoaiSanPham.DON, false);
    when(f.lines.findByDonHang_IdOrderByIdAsc(1L))
        .thenReturn(List.of(f.line(1L, combo, 1, false), f.line(2L, gift, 1, true)));
    when(f.ledgers.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(1L, LoaiGiaoDichKho.XUAT_BAN))
        .thenReturn(List.of(f.issue, f.issue(2L, gift, -1)));
    var result = f.source.load(1L);
    assertEquals("Bộ PC / combo", result.sections().get(1).rows().get(0).get(5));
    assertEquals("Quà tặng", result.sections().get(1).rows().get(1).get(5));
    assertEquals("SP-10", result.sections().get(2).rows().get(0).get(2));
    assertEquals("2", result.sections().get(2).rows().get(0).get(4));
    assertEquals(2, result.sections().get(2).rows().size());
  }

  @Test
  void rejectsMissingOrInconsistentOriginalMovements() {
    var f = new Fixture();
    when(f.ledgers.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(1L, LoaiGiaoDichKho.XUAT_BAN))
        .thenReturn(List.of());
    f.conflict();
    when(f.ledgers.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(1L, LoaiGiaoDichKho.XUAT_BAN))
        .thenReturn(List.of(f.issue));
    f.issue.setSoLuongThayDoi(-1);
    f.conflict();
    f.issue.setSoLuongThayDoi(2);
    f.conflict();
  }

  @Test
  void rejectsDuplicateIssueEvidenceRatherThanDoublingQuantity() {
    var f = new Fixture();
    when(f.ledgers.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(1L, LoaiGiaoDichKho.XUAT_BAN))
        .thenReturn(List.of(f.issue, f.issue(2L, f.variant, -2)));
    f.conflict();
  }

  @Test
  void serialWarrantyStatusDoesNotHideOriginallyIssuedSerial() {
    var f = new Fixture();
    f.variant.setCoQuanLySerial(true);
    var first =
        SoSerialSanPham.builder()
            .id(1L)
            .soSerial("SN-01")
            .phienBan(f.variant)
            .donHang(f.order)
            .trangThai(TrangThaiSerial.DANG_BAO_HANH)
            .build();
    var second =
        SoSerialSanPham.builder()
            .id(2L)
            .soSerial("SN-02")
            .phienBan(f.variant)
            .donHang(f.order)
            .trangThai(TrangThaiSerial.DA_BAN)
            .build();
    when(f.serials.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of(first, second));
    String printed = f.source.load(1L).sections().get(2).rows().get(0).get(5);
    assertEquals("SN-01\nSN-02", printed);
  }

  @Test
  void removedSerialAfterReturnCannotBeInvented() {
    var f = new Fixture();
    f.order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_HOAN_KHO);
    f.variant.setCoQuanLySerial(true);
    f.conflict();
    f.variant.setCoQuanLySerial(false);
    when(f.serials.countByPhienBanId(10L)).thenReturn(5L);
    f.conflict();
  }

  @Test
  void replacementSerialAttachedToOriginalOrderIsNeverPrintedAsOriginalIssue() {
    var f = new Fixture();
    f.line.setSoLuong(1);
    f.issue.setSoLuongThayDoi(-1);
    f.variant.setCoQuanLySerial(true);
    var original =
        SoSerialSanPham.builder()
            .id(1L)
            .soSerial("ORIGINAL")
            .phienBan(f.variant)
            .donHang(f.order)
            .build();
    var replacement =
        SoSerialSanPham.builder()
            .id(2L)
            .soSerial("REPLACEMENT")
            .phienBan(f.variant)
            .donHang(f.order)
            .build();
    when(f.evidence.findReplacementSerialIds(1L)).thenReturn(List.of(2L));
    when(f.serials.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of(original, replacement));
    assertEquals("ORIGINAL", f.source.load(1L).sections().get(2).rows().get(0).get(5));
    when(f.serials.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of(replacement));
    f.conflict();
  }

  @Test
  void posUsesOriginalCheckoutActorInsteadOfAssignedSalesEmployee() {
    var f = new Fixture();
    f.order.setLoaiDonHang(LoaiDonHang.TAI_QUAY);
    f.order.setNhanVien(NguoiDung.builder().id(9L).hoTen("Nhân viên phụ trách").build());
    when(f.histories.findByDonHang_IdOrderByNgayThucHienAscIdAsc(1L)).thenReturn(List.of());
    when(f.cash.findByMaPhieu("THU-POS-1"))
        .thenReturn(
            Optional.of(
                SoQuyThuChi.builder()
                    .loaiPhieu(LoaiPhieuThuChi.THU)
                    .nguonTao(NguonTaoPhieuThuChi.TU_DONG)
                    .maChungTuThamChieu("DH-001")
                    .nguoiTao(f.exporter)
                    .createdAt(f.time)
                    .build()));
    var result = f.source.load(1L);
    assertEquals("Nguyễn Văn An", result.sections().get(0).rows().get(2).get(1));
  }

  @Test
  void noExporterOrDuplicateExportHistoryCannotProduceConfirmation() {
    var f = new Fixture();
    when(f.histories.findByDonHang_IdOrderByNgayThucHienAscIdAsc(1L)).thenReturn(List.of());
    f.conflict();
    when(f.histories.findByDonHang_IdOrderByNgayThucHienAscIdAsc(1L))
        .thenReturn(List.of(f.event, f.event));
    f.conflict();
  }
}
