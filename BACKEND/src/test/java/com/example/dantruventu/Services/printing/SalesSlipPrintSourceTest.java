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
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class SalesSlipPrintSourceTest {
  static class Fixture {
    final DonHangRepository orders = mock(DonHangRepository.class);
    final ChiTietDonHangRepository lines = mock(ChiTietDonHangRepository.class);
    final SalesSlipReadRepository related = mock(SalesSlipReadRepository.class);
    final SalesSlipPrintSource source = new SalesSlipPrintSource(orders, lines, related);
    final LocalDateTime time = LocalDateTime.of(2026, 11, 27, 10, 30);
    final DonHang order =
        DonHang.builder()
            .id(130L)
            .maDonHang("DH-130")
            .loaiDonHang(LoaiDonHang.TAI_QUAY)
            .ngayTao(time)
            .tongTienHang(bd("1000000"))
            .tienChietKhau(bd("100000"))
            .phiGiaoHang(bd("20000"))
            .tongThanhToan(bd("1010000"))
            .trangThaiDonHang(TrangThaiDonHang.HOAN_THANH)
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN)
            .phuongThucThanhToan("TIEN_MAT")
            .tenNguoiNhan("Tên liên hệ đã lưu")
            .sdtNguoiNhan("0900000000")
            .ghiChu("Ghi chú đã lưu")
            .nhanVien(NguoiDung.builder().id(8L).hoTen("Tên nhân viên hiện tại").build())
            .build();
    final PhienBanSanPham variant =
        PhienBanSanPham.builder()
            .id(44L)
            .tenPhienBan("Tiêu chuẩn")
            .giaBanLe(bd("9000000"))
            .giaNhap(bd("1"))
            .sanPham(
                SanPham.builder()
                    .id(40L)
                    .maSanPham("SP-40")
                    .tenSanPham("Tên hàng hiện tại")
                    .thueVat(bd("99"))
                    .loaiSanPham(LoaiSanPham.DON)
                    .build())
            .build();
    final ChiTietDonHang line =
        ChiTietDonHang.builder()
            .id(130L)
            .donHang(order)
            .phienBan(variant)
            .soLuong(2)
            .donGia(bd("500000"))
            .thanhTien(bd("1000000"))
            .laQuaTang(false)
            .build();

    Fixture() {
      when(orders.findById(130L)).thenReturn(Optional.of(order));
      when(lines.findByDonHang_IdOrderByIdAsc(130L)).thenReturn(List.of(line));
      when(related.findReturns(130L)).thenReturn(List.of());
      when(related.findMoney(130L, "DH-130")).thenReturn(List.of());
    }

    PrintDocument print() {
      return source.load(130L);
    }

    void conflict() {
      assertEquals(
          ErrorCode.PRINT_SALES_SLIP_CONFLICT,
          assertThrows(AppException.class, this::print).getErrorCode());
    }

    PhieuTraHang returned(TrangThaiTraHang status) {
      return PhieuTraHang.builder()
          .id(20L)
          .maTraHang("TH-20")
          .donHang(order)
          .ngayTao(time.plusDays(1))
          .trangThaiTraHang(status)
          .tongTienHoan(bd("300000"))
          .lyDoTra("Trả một phần hàng")
          .build();
    }

    SoQuyThuChi refund(PhieuTraHang returned, TrangThaiPhieuThuChi status) {
      return SoQuyThuChi.builder()
          .id(30L)
          .maPhieu("CHI-TH-20")
          .loaiPhieu(LoaiPhieuThuChi.CHI)
          .maChungTuThamChieu(returned.getMaTraHang())
          .phieuTraHang(returned)
          .soTien(bd("300000"))
          .ngayGhiNhan(time.plusDays(2))
          .trangThai(status)
          .phuongThucThanhToan("CHUYEN_KHOAN")
          .build();
    }
  }

  private static BigDecimal bd(String value) {
    return new BigDecimal(value);
  }

  private static PrintDocument.Section section(PrintDocument document, String title) {
    return document.sections().stream()
        .filter(value -> value.title().equals(title))
        .findFirst()
        .orElseThrow();
  }

  private static String total(PrintDocument document) {
    return section(document, "TỔNG TIỀN ĐƠN GỐC").rows().get(4).get(1);
  }

  @Test
  void usesSavedMoneyWithoutCurrentCatalogPriceTaxPromotionOrActiveStatus() {
    var f = new Fixture();
    f.variant.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    f.variant.getSanPham().setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    PrintDocument document = f.print();
    var money = section(document, "TỔNG TIỀN ĐƠN GỐC");
    assertEquals("90.000 đ", money.rows().get(2).get(1));
    assertEquals("1.010.000 đ", total(document));
    assertEquals("PHIẾU BÁN HÀNG", document.title());
    assertEquals("500.000 đ", section(document, "CHI TIẾT HÀNG TRÊN ĐƠN GỐC").rows().get(0).get(3));
    assertFalse(document.toString().contains("9.000.000"));
    assertTrue(document.toString().contains("VAT đối chiếu từ tổng đã lưu"));
    assertEquals(
        "Tên hàng hiện tại",
        section(document, "CHI TIẾT HÀNG TRÊN ĐƠN GỐC").rows().getFirst().get(1));
    assertTrue(
        section(document, "KHÁCH HÀNG VÀ LIÊN HỆ")
            .rows()
            .contains(List.of("Nhân viên phụ trách", "Tên nhân viên hiện tại")));
    assertTrue(document.toString().contains("Tên liên hệ đã lưu"));
    assertTrue(document.notes().isEmpty());
    assertFalse(document.cancelled());
    verify(f.orders, never()).save(any());
    verify(f.lines, never()).save(any());
    verify(f.related, never()).save(any());
  }

  @Test
  void unknownLineAllocationsAreNotFilledWithZeroOrCurrentTax() {
    var f = new Fixture();
    PrintDocument document = f.print();
    assertEquals(
        List.of("130", "Chưa lưu phân bổ", "Chưa lưu phân bổ"),
        section(document, "PHÂN BỔ ĐÃ LƯU THEO DÒNG").rows().get(0));
    assertEquals("1.010.000 đ", total(document));
    assertNull(f.line.getTienChietKhau());
    assertNull(f.line.getThanhToanDong());
  }

  @Test
  void storedLineAllocationsArePrintedAndReconciledExactly() {
    var f = new Fixture();
    f.line.setTienChietKhau(bd("100000"));
    f.line.setThanhToanDong(bd("990000"));
    var document = f.print();
    assertEquals(
        List.of("130", "100.000 đ", "990.000 đ"),
        section(document, "PHÂN BỔ ĐÃ LƯU THEO DÒNG").rows().get(0));
    assertEquals("1.010.000 đ", total(document));
    assertEquals(bd("100000"), f.line.getTienChietKhau());
    assertEquals(bd("990000"), f.line.getThanhToanDong());
  }

  @Test
  void inconsistentUnitQuantityLineAmountOrOrderSubtotalReturnsConflict() {
    var f = new Fixture();
    f.line.setSoLuong(3);
    f.conflict();
    f.line.setSoLuong(2);
    f.order.setTongTienHang(bd("1000001"));
    f.conflict();
    f.order.setTongTienHang(bd("1000000"));
    f.line.setDonGia(null);
    f.conflict();
  }

  @Test
  void impossibleSavedTotalsDoNotGenerateAFakeCorrectedSlip() {
    var f = new Fixture();
    f.order.setTongThanhToan(bd("1"));
    f.conflict();
    f.order.setTongThanhToan(bd("1010000"));
    f.order.setTienChietKhau(bd("1000001"));
    f.conflict();
    f.order.setTienChietKhau(bd("100000"));
    f.order.setPhiGiaoHang(null);
    f.conflict();
  }

  @Test
  void inconsistentSavedLineAllocationsReturnConflict() {
    var f = new Fixture();
    f.line.setTienChietKhau(bd("99999"));
    f.conflict();
    f.line.setTienChietKhau(bd("100000"));
    f.line.setThanhToanDong(bd("899999"));
    f.conflict();
    f.line.setThanhToanDong(bd("990001"));
    f.conflict();
  }

  @ParameterizedTest
  @EnumSource(TrangThaiDonHang.class)
  void statusDeterminesProvisionalCompletedOrCancelledLabelWithoutChangingMoney(
      TrangThaiDonHang status) {
    var f = new Fixture();
    f.order.setTrangThaiDonHang(status);
    PrintDocument document = f.print();
    assertEquals("1.010.000 đ", total(document));
    assertTrue(document.notes().isEmpty());
    assertEquals(status == TrangThaiDonHang.HUY_HANG, document.cancelled());
    if (status == TrangThaiDonHang.HUY_HANG) assertTrue(document.toString().contains("ĐÃ HỦY"));
    else if (status == TrangThaiDonHang.HOAN_THANH)
      assertTrue(document.toString().contains("Đơn đã hoàn tất"));
    else assertTrue(document.title().contains("TẠM TÍNH"));
  }

  @Test
  void matchingOrderTotalDoesNotHideImpossiblePartialLinePayments() {
    var f = new Fixture();
    var second = splitIntoTwoHundred(f);
    f.line.setTienChietKhau(BigDecimal.ZERO);
    f.line.setThanhToanDong(bd("200"));
    second.setThanhToanDong(BigDecimal.ZERO);
    f.conflict();
  }

  @Test
  void partialDiscountCannotExceedCapacityOfUnspecifiedLines() {
    var f = new Fixture();
    splitIntoTwoHundred(f);
    f.line.setTienChietKhau(BigDecimal.ZERO);
    f.order.setTienChietKhau(bd("150"));
    f.order.setTongThanhToan(bd("50"));
    f.conflict();
  }

  @Test
  void feasiblePartialAllocationsRemainUnspecifiedAndDoNotChangeSavedData() {
    var f = new Fixture();
    var second = splitIntoTwoHundred(f);
    f.line.setTienChietKhau(BigDecimal.ZERO);
    f.line.setThanhToanDong(bd("100"));
    f.order.setTienChietKhau(bd("100"));
    f.order.setTongThanhToan(bd("100"));
    var document = f.print();
    assertEquals("100 đ", total(document));
    assertEquals(
        List.of("131", "Chưa lưu phân bổ", "Chưa lưu phân bổ"),
        section(document, "PHÂN BỔ ĐÃ LƯU THEO DÒNG").rows().get(1));
    assertNull(second.getTienChietKhau());
    assertNull(second.getThanhToanDong());
  }

  private ChiTietDonHang splitIntoTwoHundred(Fixture f) {
    f.order.setTongTienHang(bd("200"));
    f.order.setTienChietKhau(BigDecimal.ZERO);
    f.order.setPhiGiaoHang(BigDecimal.ZERO);
    f.order.setTongThanhToan(bd("200"));
    f.line.setSoLuong(1);
    f.line.setDonGia(bd("100"));
    f.line.setThanhTien(bd("100"));
    var second =
        ChiTietDonHang.builder()
            .id(131L)
            .donHang(f.order)
            .phienBan(f.variant)
            .soLuong(1)
            .donGia(bd("100"))
            .thanhTien(bd("100"))
            .laQuaTang(false)
            .build();
    when(f.lines.findByDonHang_IdOrderByIdAsc(130L)).thenReturn(List.of(f.line, second));
    return second;
  }

  @Test
  void zeroPriceDoesNotInventAGiftButStoredGiftFlagIsRespected() {
    var f = new Fixture();
    var zero =
        ChiTietDonHang.builder()
            .id(131L)
            .donHang(f.order)
            .phienBan(f.variant)
            .soLuong(1)
            .donGia(BigDecimal.ZERO)
            .thanhTien(BigDecimal.ZERO)
            .laQuaTang(false)
            .build();
    when(f.lines.findByDonHang_IdOrderByIdAsc(130L)).thenReturn(List.of(f.line, zero));
    assertEquals("Hàng bán", section(f.print(), "CHI TIẾT HÀNG TRÊN ĐƠN GỐC").rows().get(1).get(5));
    zero.setLaQuaTang(true);
    assertEquals("Quà tặng", section(f.print(), "CHI TIẾT HÀNG TRÊN ĐƠN GỐC").rows().get(1).get(5));
  }

  @Test
  void partialReturnsAndPostedRefundAreSeparateFromOriginalSalesTotals() {
    var f = new Fixture();
    var returned = f.returned(TrangThaiTraHang.DA_HOAN_TIEN);
    var refund = f.refund(returned, TrangThaiPhieuThuChi.DA_GHI_NHAN);
    when(f.related.findReturns(130L)).thenReturn(List.of(returned));
    when(f.related.findMoney(130L, "DH-130")).thenReturn(List.of(refund));
    PrintDocument document = f.print();
    assertEquals("1.010.000 đ", total(document));
    assertEquals("300.000 đ", section(document, "PHIẾU TRẢ HÀNG LIÊN QUAN").rows().get(0).get(3));
    assertEquals(
        "Đã ghi nhận",
        section(document, "THU / CHI LIÊN QUAN ĐƠN VÀ PHIẾU TRẢ").rows().get(0).get(6));
    assertEquals(bd("1010000"), f.order.getTongThanhToan());
  }

  @Test
  void pendingReturnDoesNotClaimAnActualRefundAndCancelledRefundRetainsItsOwnAmount() {
    var f = new Fixture();
    var returned = f.returned(TrangThaiTraHang.CHO_TIEP_NHAN);
    when(f.related.findReturns(130L)).thenReturn(List.of(returned));
    var pending = f.print();
    assertTrue(pending.toString().contains("Chờ tiếp nhận"));
    assertFalse(
        pending.sections().stream()
            .anyMatch(value -> value.title().equals("THU / CHI LIÊN QUAN ĐƠN VÀ PHIẾU TRẢ")));
    when(f.related.findMoney(130L, "DH-130"))
        .thenReturn(List.of(f.refund(returned, TrangThaiPhieuThuChi.HUY)));
    var cancelled = f.print();
    assertEquals(
        "300.000 đ",
        section(cancelled, "THU / CHI LIÊN QUAN ĐƠN VÀ PHIẾU TRẢ").rows().get(0).get(4));
    assertEquals(
        "ĐÃ HỦY", section(cancelled, "THU / CHI LIÊN QUAN ĐƠN VÀ PHIẾU TRẢ").rows().get(0).get(6));
    assertEquals("1.010.000 đ", total(cancelled));
  }

  @Test
  void oldRefundWithoutForeignKeyStillUsesItsSavedReturnReference() {
    var f = new Fixture();
    var returned = f.returned(TrangThaiTraHang.DA_HOAN_TIEN);
    var refund = f.refund(returned, TrangThaiPhieuThuChi.DA_GHI_NHAN);
    refund.setPhieuTraHang(null);
    when(f.related.findReturns(130L)).thenReturn(List.of(returned));
    when(f.related.findMoney(130L, "DH-130")).thenReturn(List.of(refund));
    assertEquals(
        "TH-20", section(f.print(), "THU / CHI LIÊN QUAN ĐƠN VÀ PHIẾU TRẢ").rows().get(0).get(1));
  }

  @Test
  void cancellationRefundReferencingOrderWithoutReturnDocumentRemainsSeparateFromOriginalReceipt() {
    var f = new Fixture();
    f.order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
    var receipt =
        SoQuyThuChi.builder()
            .id(30L)
            .maPhieu("THU-DH-130")
            .loaiPhieu(LoaiPhieuThuChi.THU)
            .maChungTuThamChieu("DH-130")
            .soTien(bd("1010000"))
            .ngayGhiNhan(f.time)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .phuongThucThanhToan("TIEN_MAT")
            .build();
    var refund =
        SoQuyThuChi.builder()
            .id(31L)
            .maPhieu("CHI-HUY-DH-130")
            .loaiPhieu(LoaiPhieuThuChi.CHI)
            .maChungTuThamChieu("DH-130")
            .soTien(bd("1010000"))
            .ngayGhiNhan(f.time.plusDays(1))
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .phuongThucThanhToan("CHUYEN_KHOAN")
            .build();
    when(f.related.findMoney(130L, "DH-130")).thenReturn(List.of(receipt, refund));

    var document = f.print();
    var cash = section(document, "THU / CHI LIÊN QUAN ĐƠN VÀ PHIẾU TRẢ");

    assertEquals("Thu", cash.rows().get(0).get(2));
    assertEquals("Chi", cash.rows().get(1).get(2));
    assertEquals("1.010.000 đ", cash.rows().get(0).get(4));
    assertEquals("1.010.000 đ", cash.rows().get(1).get(4));
    assertEquals("1.010.000 đ", total(document));
    assertTrue(document.cancelled());
    assertFalse(
        document.sections().stream()
            .anyMatch(value -> value.title().equals("PHIẾU TRẢ HÀNG LIÊN QUAN")));
  }

  @Test
  void contradictoryRefundReferenceOrReturnOrderReturnsConflict() {
    var f = new Fixture();
    var returned = f.returned(TrangThaiTraHang.DA_HOAN_TIEN);
    var refund = f.refund(returned, TrangThaiPhieuThuChi.DA_GHI_NHAN);
    refund.setMaChungTuThamChieu("TH-KHAC");
    when(f.related.findReturns(130L)).thenReturn(List.of(returned));
    when(f.related.findMoney(130L, "DH-130")).thenReturn(List.of(refund));
    f.conflict();
    when(f.related.findMoney(130L, "DH-130")).thenReturn(List.of());
    returned.setDonHang(DonHang.builder().id(999L).build());
    f.conflict();
  }

  @Test
  void absentIncompleteDuplicateOrForeignLinesDoNotPrintAMisleadingSlip() {
    var f = new Fixture();
    when(f.lines.findByDonHang_IdOrderByIdAsc(130L)).thenReturn(List.of());
    f.conflict();
    when(f.lines.findByDonHang_IdOrderByIdAsc(130L)).thenReturn(List.of(f.line, f.line));
    f.conflict();
    when(f.lines.findByDonHang_IdOrderByIdAsc(130L)).thenReturn(List.of(f.line));
    f.line.setDonHang(DonHang.builder().id(999L).build());
    f.conflict();
    f.line.setDonHang(f.order);
    f.line.setLaQuaTang(null);
    f.conflict();
  }

  @Test
  void invalidIdIsBadRequestAndUnknownOrderIsNotFound() {
    var f = new Fixture();
    assertEquals(
        ErrorCode.INVALID_PRINT_REQUEST,
        assertThrows(AppException.class, () -> f.source.load(0L)).getErrorCode());
    assertEquals(
        ErrorCode.PRINT_RECORD_NOT_FOUND,
        assertThrows(AppException.class, () -> f.source.load(999L)).getErrorCode());
  }
}
