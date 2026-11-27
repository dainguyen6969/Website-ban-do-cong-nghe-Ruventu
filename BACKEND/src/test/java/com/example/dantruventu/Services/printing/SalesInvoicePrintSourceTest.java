package com.example.dantruventu.Services.printing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.printing.SalesSlipReadRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class SalesInvoicePrintSourceTest {
  static class Fixture {
    final DonHangRepository orders = mock(DonHangRepository.class);
    final ChiTietDonHangRepository lines = mock(ChiTietDonHangRepository.class);
    final SalesSlipReadRepository related = mock(SalesSlipReadRepository.class);
    final SalesSlipPrintSource slip = new SalesSlipPrintSource(orders, lines, related);
    final SalesInvoicePrintSource invoice = new SalesInvoicePrintSource(orders, slip, lines);
    final DonHang order =
        DonHang.builder()
            .id(130L)
            .maDonHang("DH-130")
            .loaiDonHang(LoaiDonHang.TAI_QUAY)
            .ngayTao(LocalDateTime.of(2026, 11, 27, 9, 0))
            .trangThaiDonHang(TrangThaiDonHang.HOAN_THANH)
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN)
            .phuongThucThanhToan("TIEN_MAT")
            .tongTienHang(new BigDecimal("1000000"))
            .tienChietKhau(new BigDecimal("100000"))
            .phiGiaoHang(BigDecimal.ZERO)
            .tongThanhToan(new BigDecimal("990000"))
            .tenNguoiNhan("Liên hệ trên đơn")
            .build();
    final PhienBanSanPham variant =
        PhienBanSanPham.builder()
            .id(44L)
            .tenPhienBan("Tiêu chuẩn")
            .giaBanLe(new BigDecimal("7777777"))
            .sanPham(
                SanPham.builder()
                    .id(40L)
                    .maSanPham("SP-40")
                    .tenSanPham("Sản phẩm tra cứu")
                    .thoiHanBaoHanhThang(24)
                    .thueVat(new BigDecimal("99"))
                    .loaiSanPham(LoaiSanPham.DON)
                    .build())
            .build();
    final ChiTietDonHang line =
        ChiTietDonHang.builder()
            .id(130L)
            .donHang(order)
            .phienBan(variant)
            .soLuong(2)
            .donGia(new BigDecimal("500000"))
            .thanhTien(new BigDecimal("1000000"))
            .laQuaTang(false)
            .build();

    Fixture() {
      when(orders.findById(130L)).thenReturn(Optional.of(order));
      when(lines.findByDonHang_IdOrderByIdAsc(130L)).thenReturn(List.of(line));
      when(related.findReturns(130L)).thenReturn(List.of());
      when(related.findMoney(130L, "DH-130")).thenReturn(List.of());
    }
  }

  @Test
  void completedOrderReusesValidatedAmountsWithoutInventingAnIssuedInvoice() {
    var f = new Fixture();
    PrintDocument slip = f.slip.load(130L);
    PrintDocument invoice = f.invoice.load(130L);

    assertEquals("HÓA ĐƠN BÁN HÀNG", invoice.title());
    assertEquals("DH-130", invoice.number());
    assertEquals("THÔNG TIN HÓA ĐƠN BÁN HÀNG", invoice.sections().get(0).title());
    assertTrue(
        invoice
            .sections()
            .get(0)
            .rows()
            .contains(List.of("Nguồn bản in", "Bản in từ đơn hàng đã hoàn tất (ID 130)")));
    for (int i = 1; i < slip.sections().size(); i++) {
      var originalSection = slip.sections().get(i);
      var invoiceSection = invoice.sections().get(i);
      if (originalSection.title().equals("CHI TIẾT HÀNG TRÊN ĐƠN GỐC")) {
        assertEquals(originalSection.headers().size() + 1, invoiceSection.headers().size());
        assertEquals(
            originalSection.rows().getFirst(), invoiceSection.rows().getFirst().subList(0, 6));
        assertEquals("24 tháng", invoiceSection.rows().getFirst().getLast());
        assertTrue(invoiceSection.headers().getLast().contains("chính sách hiện tại"));
        assertEquals(6, originalSection.rows().getFirst().size());
      } else assertEquals(originalSection, invoiceSection);
    }
    assertTrue(invoice.notes().isEmpty());
    assertTrue(slip.notes().isEmpty());
    assertEquals(slip.signatories(), invoice.signatories());
    assertFalse(invoice.cancelled());
    assertEquals("THÔNG TIN ĐƠN BÁN", slip.sections().get(0).title());
    verify(f.orders, never()).save(any());
    verify(f.lines, never()).save(any());
    verify(f.related, never()).save(any());
  }

  @Test
  void repeatedPrintIgnoresNewCatalogPricesTaxAndProductStatus() {
    var f = new Fixture();
    PrintDocument original = f.invoice.load(130L);
    f.variant.setGiaBanLe(new BigDecimal("123456789"));
    f.variant.getSanPham().setThueVat(BigDecimal.ZERO);
    f.variant.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    f.variant.getSanPham().setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);

    assertEquals(original, f.invoice.load(130L));
    assertFalse(original.toString().contains("7.777.777"));
  }

  @Test
  void missingWarrantyDoesNotInventZeroWarrantyOrChangeFinancialTotals() {
    var f = new Fixture();
    f.variant.getSanPham().setThoiHanBaoHanhThang(null);
    var missing = f.invoice.load(130L);
    var items =
        missing.sections().stream()
            .filter(section -> section.title().equals("CHI TIẾT HÀNG TRÊN ĐƠN GỐC"))
            .findFirst()
            .orElseThrow();
    assertEquals("Chưa cung cấp", items.rows().getFirst().getLast());
    f.variant.getSanPham().setThoiHanBaoHanhThang(0);
    var none = f.invoice.load(130L);
    var noWarrantyItems =
        none.sections().stream()
            .filter(section -> section.title().equals("CHI TIẾT HÀNG TRÊN ĐƠN GỐC"))
            .findFirst()
            .orElseThrow();
    assertEquals("Không bảo hành", noWarrantyItems.rows().getFirst().getLast());
    assertEquals(missing.sections().get(4), none.sections().get(4));
    assertEquals(new BigDecimal("990000"), f.order.getTongThanhToan());
  }

  @ParameterizedTest
  @EnumSource(value = TrangThaiDonHang.class, names = "HOAN_THANH", mode = EnumSource.Mode.EXCLUDE)
  void provisionalAndCancelledOrdersCannotProduceSalesInvoice(TrangThaiDonHang status) {
    var f = new Fixture();
    f.order.setTrangThaiDonHang(status);
    AppException exception = assertThrows(AppException.class, () -> f.invoice.load(130L));
    assertEquals(ErrorCode.PRINT_SALES_INVOICE_NOT_READY, exception.getErrorCode());
    verifyNoInteractions(f.lines, f.related);
  }

  @Test
  void invalidAndMissingIdsUseTheirOwnErrors() {
    var f = new Fixture();
    assertEquals(
        ErrorCode.INVALID_PRINT_REQUEST,
        assertThrows(AppException.class, () -> f.invoice.load(0L)).getErrorCode());
    assertEquals(
        ErrorCode.INVALID_PRINT_REQUEST,
        assertThrows(AppException.class, () -> f.invoice.load(null)).getErrorCode());
    assertEquals(
        ErrorCode.PRINT_SALES_INVOICE_NOT_FOUND,
        assertThrows(AppException.class, () -> f.invoice.load(999L)).getErrorCode());
    verifyNoInteractions(f.lines, f.related);
  }

  @Test
  void missingStatusAndInconsistentFinancialDataRemainConflicts() {
    var f = new Fixture();
    f.order.setTrangThaiDonHang(null);
    assertEquals(
        ErrorCode.PRINT_SALES_SLIP_CONFLICT,
        assertThrows(AppException.class, () -> f.invoice.load(130L)).getErrorCode());
    f.order.setTrangThaiDonHang(TrangThaiDonHang.HOAN_THANH);
    f.line.setThanhTien(new BigDecimal("999999"));
    assertEquals(
        ErrorCode.PRINT_SALES_SLIP_CONFLICT,
        assertThrows(AppException.class, () -> f.invoice.load(130L)).getErrorCode());
  }

  @Test
  void returnsAndRefundsStaySeparateAndDoNotReduceOriginalInvoiceTotal() {
    var f = new Fixture();
    var returned =
        PhieuTraHang.builder()
            .id(20L)
            .maTraHang("TH-20")
            .donHang(f.order)
            .ngayTao(f.order.getNgayTao().plusDays(1))
            .trangThaiTraHang(TrangThaiTraHang.DA_HOAN_TIEN)
            .tongTienHoan(new BigDecimal("300000"))
            .lyDoTra("Trả một phần")
            .build();
    var refund =
        SoQuyThuChi.builder()
            .id(30L)
            .maPhieu("CHI-TH-20")
            .loaiPhieu(LoaiPhieuThuChi.CHI)
            .maChungTuThamChieu("TH-20")
            .phieuTraHang(returned)
            .soTien(new BigDecimal("300000"))
            .ngayGhiNhan(f.order.getNgayTao().plusDays(1))
            .phuongThucThanhToan("CHUYEN_KHOAN")
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build();
    when(f.related.findReturns(130L)).thenReturn(List.of(returned));
    when(f.related.findMoney(130L, "DH-130")).thenReturn(List.of(refund));

    PrintDocument invoice = f.invoice.load(130L);

    assertTrue(
        invoice.sections().stream()
            .anyMatch(section -> section.title().equals("PHIẾU TRẢ HÀNG LIÊN QUAN")));
    var totals =
        invoice.sections().stream()
            .filter(section -> section.title().equals("TỔNG TIỀN ĐƠN GỐC"))
            .findFirst()
            .orElseThrow();
    assertEquals(List.of("Tổng thanh toán gốc", "990.000 đ"), totals.rows().get(4));
    assertTrue(invoice.toString().contains("CHI-TH-20"));
    assertEquals(new BigDecimal("990000"), f.order.getTongThanhToan());
  }
}
