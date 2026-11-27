package com.example.dantruventu.Services.printing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.LichSuXuLyDonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.warehouse.ThanhPhanComboRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DeliveryPrintSourceTest {
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock ChiTietDonHangRepository lineRepository;
  @Mock ThanhPhanComboRepository componentRepository;
  @Mock LichSuXuLyDonHangRepository historyRepository;
  @Mock OrderIssuePrintSource issueSource;
  @InjectMocks DeliveryPrintSource source;

  @Test
  void preparationShowsExpectedCodAndGiftWithoutConfirmingHandoverOrMoney() {
    PhieuGiaoHang delivery = delivery(TrangThaiGiaoHangEnum.CHO_GIAO);
    when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery));
    when(lineRepository.findByDonHang_IdOrderByIdAsc(10L)).thenReturn(List.of(line(true)));

    PrintDocument document = source.load(1L);

    String contents = document.toString();
    assertTrue(contents.contains("BẢN CHUẨN BỊ"));
    assertTrue(contents.contains("COD dự kiến"));
    assertTrue(contents.contains("không phải xác nhận cửa hàng đã thu tiền"));
    assertTrue(contents.contains("Quà tặng"));
    assertTrue(contents.contains("Địa chỉ thử nghiệm"));
    assertFalse(document.cancelled());
    verify(deliveryRepository).findById(1L);
    verify(lineRepository).findByDonHang_IdOrderByIdAsc(10L);
    verifyNoMoreInteractions(deliveryRepository, lineRepository);
    verifyNoInteractions(componentRepository);
  }

  @Test
  void cancelledPrintIsExplicitlyInvalidForHandoverAndCollection() {
    when(deliveryRepository.findById(1L))
        .thenReturn(Optional.of(delivery(TrangThaiGiaoHangEnum.HUY_GIAO_HANG)));
    when(lineRepository.findByDonHang_IdOrderByIdAsc(10L)).thenReturn(List.of(line(false)));

    PrintDocument document = source.load(1L);

    assertTrue(document.cancelled());
    assertTrue(document.toString().contains("ĐÃ HỦY"));
    assertTrue(document.toString().contains("không có giá trị bàn giao hoặc yêu cầu thu tiền"));
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiGiaoHangEnum.class,
      names = {"CHO_GIAO", "HUY_GIAO_HANG"},
      mode = EnumSource.Mode.EXCLUDE)
  void handedOverDocumentWithoutHistoryDoesNotInventFinalizedEvidence(
      TrangThaiGiaoHangEnum status) {
    when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery(status)));
    when(historyRepository.findByDonHang_IdOrderByNgayThucHienAscIdAsc(10L)).thenReturn(List.of());

    AppException exception = assertThrows(AppException.class, () -> source.load(1L));

    assertEquals(ErrorCode.PRINT_HISTORY_CONFLICT, exception.getErrorCode());
    assertTrue(exception.getMessage().contains("chứng cứ bàn giao"));
    verifyNoInteractions(lineRepository, componentRepository, issueSource);
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiGiaoHangEnum.class,
      names = {"DA_NHAN_HANG", "GIAO_THANH_CONG", "DA_HOAN_HANG"})
  void handedOverPrintUsesConfirmedOriginalIssueEvenAfterReturn(TrangThaiGiaoHangEnum status) {
    when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery(status)));
    when(historyRepository.findByDonHang_IdOrderByNgayThucHienAscIdAsc(10L))
        .thenReturn(List.of(handover()));
    PrintDocument.Section sold =
        new PrintDocument.Section(
            "HÀNG TRÊN ĐƠN GỐC", List.of("Hàng", "Loại"), List.of(List.of("RAM", "Quà tặng")));
    PrintDocument.Section issued =
        new PrintDocument.Section(
            "HÀNG / LINH KIỆN THỰC XUẤT",
            List.of("Hàng", "Số lượng"),
            List.of(List.of("RAM", "3")));
    when(issueSource.load(10L))
        .thenReturn(
            new PrintDocument(
                "PHIẾU XUẤT KHO",
                "PX-DH-10",
                List.of(new PrintDocument.Section("THÔNG TIN", List.of(), List.of()), sold, issued),
                List.of(),
                List.of(),
                false));

    PrintDocument document = source.load(1L);

    assertTrue(document.toString().contains("ĐÃ BÀN GIAO"));
    assertFalse(document.toString().contains("COD dự kiến"));
    assertTrue(document.toString().contains("COD yêu cầu thu hộ khi bàn giao"));
    assertTrue(document.toString().contains("tên tra cứu hiện tại"));
    assertSame(sold, document.sections().get(2));
    assertSame(issued, document.sections().get(3));
    assertFalse(document.cancelled());
    verifyNoInteractions(lineRepository, componentRepository);
  }

  @Test
  void contradictoryHandoverEvidenceReturnsConflictBeforeLoadingIssuedGoods() {
    when(deliveryRepository.findById(1L))
        .thenReturn(Optional.of(delivery(TrangThaiGiaoHangEnum.DA_NHAN_HANG)));
    LichSuXuLyDonHang event = handover();
    event.setTrangThaiXuatKho(TrangThaiXuatKho.CHUA_XUAT_KHO);
    when(historyRepository.findByDonHang_IdOrderByNgayThucHienAscIdAsc(10L))
        .thenReturn(List.of(event));

    AppException exception = assertThrows(AppException.class, () -> source.load(1L));

    assertEquals(ErrorCode.PRINT_HISTORY_CONFLICT, exception.getErrorCode());
    verifyNoInteractions(issueSource, lineRepository, componentRepository);
  }

  @Test
  void successfullyDeliveredOrderFullyReturnedByCustomerStillPrintsOriginalDelivery() {
    PhieuGiaoHang delivery = delivery(TrangThaiGiaoHangEnum.GIAO_THANH_CONG);
    delivery.getDonHang().setTrangThaiXuatKho(TrangThaiXuatKho.DA_HOAN_KHO);
    delivery.getDonHang().setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery));
    when(historyRepository.findByDonHang_IdOrderByNgayThucHienAscIdAsc(10L))
        .thenReturn(List.of(handover()));
    PrintDocument.Section sold =
        new PrintDocument.Section(
            "HÀNG TRÊN ĐƠN GỐC", List.of("Hàng"), List.of(List.of("RAM gốc")));
    PrintDocument.Section issued =
        new PrintDocument.Section(
            "HÀNG / LINH KIỆN THỰC XUẤT",
            List.of("Hàng", "Số lượng"),
            List.of(List.of("RAM gốc", "3")));
    when(issueSource.load(10L))
        .thenReturn(
            new PrintDocument(
                "PHIẾU XUẤT KHO", "PX-DH-10", List.of(sold, issued), List.of(), List.of(), false));

    PrintDocument document = source.load(1L);

    assertTrue(document.toString().contains("ĐÃ BÀN GIAO"));
    assertTrue(document.toString().contains("Giao thành công"));
    assertSame(issued, document.sections().get(3));
    assertFalse(document.cancelled());
    assertEquals(TrangThaiGiaoHangEnum.GIAO_THANH_CONG, delivery.getTrangThaiGiaoHang());
    assertEquals(TrangThaiXuatKho.DA_HOAN_KHO, delivery.getDonHang().getTrangThaiXuatKho());
    verifyNoInteractions(lineRepository, componentRepository);
  }

  @Test
  void inTransitDeliveryCannotClaimACompletedWarehouseReturn() {
    PhieuGiaoHang delivery = delivery(TrangThaiGiaoHangEnum.DANG_GIAO);
    delivery.getDonHang().setTrangThaiXuatKho(TrangThaiXuatKho.DA_HOAN_KHO);
    when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery));

    AppException exception = assertThrows(AppException.class, () -> source.load(1L));

    assertEquals(ErrorCode.PRINT_HISTORY_CONFLICT, exception.getErrorCode());
    verifyNoInteractions(historyRepository, issueSource, lineRepository, componentRepository);
  }

  @Test
  void comboPreparationExpandsComponentsAndMultipliesByOrderedQuantity() {
    when(deliveryRepository.findById(1L))
        .thenReturn(Optional.of(delivery(TrangThaiGiaoHangEnum.CHO_GIAO)));
    ChiTietDonHang line = line(false);
    line.setSoLuong(2);
    line.getPhienBan().getSanPham().setLoaiSanPham(LoaiSanPham.BO_PC);
    when(lineRepository.findByDonHang_IdOrderByIdAsc(10L)).thenReturn(List.of(line));
    PhienBanSanPham component = variant(30L, "RAM", LoaiSanPham.DON);
    when(componentRepository.findByComboIds(List.of(20L)))
        .thenReturn(
            List.of(ThanhPhanCombo.builder().phienBanThanhPhan(component).soLuong(2).build()));

    PrintDocument document = source.load(1L);

    List<String> item = document.sections().get(2).rows().get(0);
    assertEquals("RAM / Tiêu chuẩn", item.get(2));
    assertEquals("4", item.get(3));
    assertTrue(item.get(5).contains("Sản phẩm mẫu"));
  }

  @Test
  void missingRecipientIsAConflictInsteadOfAnApparentlyCompleteDocument() {
    PhieuGiaoHang delivery = delivery(TrangThaiGiaoHangEnum.CHO_GIAO);
    delivery.getDonHang().setDiaChiGiaoHang(null);
    when(deliveryRepository.findById(1L)).thenReturn(Optional.of(delivery));

    AppException exception = assertThrows(AppException.class, () -> source.load(1L));

    assertEquals(ErrorCode.PRINT_HISTORY_CONFLICT, exception.getErrorCode());
    verifyNoInteractions(lineRepository, componentRepository);
  }

  @Test
  void invalidGiftEvidenceDoesNotSilentlyTurnGiftIntoPurchasedItem() {
    when(deliveryRepository.findById(1L))
        .thenReturn(Optional.of(delivery(TrangThaiGiaoHangEnum.CHO_GIAO)));
    ChiTietDonHang line = line(false);
    line.setLaQuaTang(null);
    when(lineRepository.findByDonHang_IdOrderByIdAsc(10L)).thenReturn(List.of(line));

    AppException exception = assertThrows(AppException.class, () -> source.load(1L));

    assertEquals(ErrorCode.PRINT_HISTORY_CONFLICT, exception.getErrorCode());
  }

  @Test
  void absentDeliveryReturnsNotFound() {
    when(deliveryRepository.findById(999L)).thenReturn(Optional.empty());

    AppException exception = assertThrows(AppException.class, () -> source.load(999L));

    assertEquals(ErrorCode.PRINT_RECORD_NOT_FOUND, exception.getErrorCode());
    verifyNoInteractions(lineRepository, componentRepository);
  }

  private static PhieuGiaoHang delivery(TrangThaiGiaoHangEnum status) {
    DonHang order =
        DonHang.builder()
            .id(10L)
            .maDonHang("DH-10")
            .tenNguoiNhan("Nguyễn Văn An")
            .sdtNguoiNhan("0912345678")
            .diaChiGiaoHang("Địa chỉ thử nghiệm")
            .ghiChu("Giao giờ hành chính")
            .loaiDonHang(LoaiDonHang.ONLINE)
            .trangThaiDongGoi(TrangThaiDongGoi.DA_DONG_GOI)
            .tongThanhToan(new BigDecimal("150000"))
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN)
            .trangThaiXuatKho(
                status == TrangThaiGiaoHangEnum.DA_HOAN_HANG
                    ? TrangThaiXuatKho.DA_HOAN_KHO
                    : TrangThaiXuatKho.DA_XUAT_KHO)
            .trangThaiDonHang(
                status == TrangThaiGiaoHangEnum.DA_HOAN_HANG
                    ? TrangThaiDonHang.HUY_HANG
                    : status == TrangThaiGiaoHangEnum.GIAO_THANH_CONG
                        ? TrangThaiDonHang.HOAN_THANH
                        : TrangThaiDonHang.DANG_GIAO_HANG)
            .build();
    DoiTacVanChuyen partner =
        DoiTacVanChuyen.builder()
            .id(2L)
            .maDoiTac("DT-2")
            .tenDoiTac("Đối tác thử nghiệm")
            .soDienThoai("0900000000")
            .build();
    return PhieuGiaoHang.builder()
        .id(1L)
        .maPhieuGiaoHang("PGH-1")
        .donHang(order)
        .doiTacVanChuyen(partner)
        .maVanDon("VD-1")
        .trangThaiGiaoHang(status)
        .tienThuHoCod(new BigDecimal("150000"))
        .ngayTao(LocalDateTime.of(2026, 11, 25, 9, 0))
        .build();
  }

  private static LichSuXuLyDonHang handover() {
    return LichSuXuLyDonHang.builder()
        .id(3L)
        .hanhDong("GIAO_VAN_DA_NHAN_HANG")
        .moTa("Bàn giao hàng cho đối tác; phiếu PGH-1")
        .ngayThucHien(LocalDateTime.of(2026, 11, 25, 10, 0))
        .nguoiThucHien(NguoiDung.builder().id(4L).hoTen("Người bàn giao thử nghiệm").build())
        .trangThaiDonHang(TrangThaiDonHang.DANG_GIAO_HANG)
        .trangThaiDongGoi(TrangThaiDongGoi.DA_DONG_GOI)
        .trangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO)
        .build();
  }

  private static ChiTietDonHang line(boolean gift) {
    return ChiTietDonHang.builder()
        .id(11L)
        .soLuong(1)
        .laQuaTang(gift)
        .phienBan(variant(20L, "Sản phẩm mẫu", LoaiSanPham.DON))
        .build();
  }

  private static PhienBanSanPham variant(Long id, String name, LoaiSanPham type) {
    SanPham product =
        SanPham.builder().id(id).maSanPham("SP-" + id).tenSanPham(name).loaiSanPham(type).build();
    return PhienBanSanPham.builder().id(id).tenPhienBan("Tiêu chuẩn").sanPham(product).build();
  }
}
