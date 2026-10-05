package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminOrderRequest;
import com.example.dantruventu.DTO.Response.order.AdminOrderResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Mapper.order.AdminOrderMapper;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.*;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminOrderPaymentTest {
  @Mock DonHangRepository orderRepository;
  @Mock ChiTietDonHangRepository lineRepository;
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock SoQuyThuChiRepository cashRepository;
  @Mock LichSuXuLyDonHangRepository historyRepository;
  @Mock CashbookService cashbookService;
  @Mock AdminOrderMapper mapper;
  @Mock AdminSalesService salesService;
  @Mock SalesContext context;
  @Mock EntityManager entityManager;
  @Spy SalesProperties properties = new SalesProperties();
  @InjectMocks AdminOrderService service;
  DonHang order;
  AdminOrderRequest.Payment request;
  String key = "10000000-0000-4000-8000-000000000001";

  @BeforeEach
  void setup() {
    order =
        DonHang.builder()
            .id(1L)
            .maDonHang("ORD-001")
            .loaiDonHang(LoaiDonHang.ONLINE)
            .trangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI)
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN)
            .trangThaiDongGoi(TrangThaiDongGoi.DANG_DONG_GOI)
            .trangThaiXuatKho(TrangThaiXuatKho.CHUA_XUAT_KHO)
            .phuongThucThanhToan("TIEN_MAT")
            .tongTienHang(new BigDecimal("1000"))
            .tongThanhToan(new BigDecimal("1000"))
            .build();
    request = new AdminOrderRequest.Payment();
    request.setNguonThu("KHACH_HANG");
    request.setPhuongThucThanhToan("CHUYEN_KHOAN");
    request.setSoTienThanhToan(new BigDecimal("1000"));
    request.setNgayThanhToan(OffsetDateTime.now().minusMinutes(1));
    request.setMaGiaoDichThanhToan("BANK-001");
    request.setXacNhanDaNhanTien(true);
    when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
    lenient().when(context.actor()).thenReturn(NguoiDung.builder().id(2L).build());
    lenient()
        .when(
            cashbookService.executeOnce(
                anyString(),
                any(NguoiDung.class),
                any(),
                eq(AdminOrderResponse.Action.class),
                any()))
        .thenAnswer(call -> call.<Supplier<AdminOrderResponse.Action>>getArgument(4).get());
    lenient()
        .when(lineRepository.findByDonHang_IdOrderByIdAsc(1L))
        .thenReturn(
            List.of(
                ChiTietDonHang.builder()
                    .soLuong(1)
                    .donGia(new BigDecimal("1000"))
                    .thanhTien(new BigDecimal("1000"))
                    .build()));
    lenient().when(mapper.toAction(any())).thenReturn(new AdminOrderResponse.Action());
    lenient()
        .when(cashbookService.createAutomatic(any()))
        .thenAnswer(
            call ->
                SoQuyThuChi.builder()
                    .maPhieu(call.<CashbookService.AutomaticVoucher>getArgument(0).maPhieu())
                    .build());
  }

  void pay() {
    service.confirmPayment(1L, key, request);
  }

  PhieuGiaoHang delivery(TrangThaiGiaoHangEnum status) {
    var delivery =
        PhieuGiaoHang.builder()
            .id(3L)
            .donHang(order)
            .trangThaiGiaoHang(status)
            .tienThuHoCod(new BigDecimal("1000"))
            .doiTacVanChuyen(DoiTacVanChuyen.builder().id(4L).tenDoiTac("Shipper").build())
            .build();
    when(deliveryRepository.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of(delivery));
    when(deliveryRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(delivery));
    return delivery;
  }

  @Test
  void recordsActualReceiptAndClearsWaitingCodWithoutChangingOrderOrStock() {
    var delivery = delivery(TrangThaiGiaoHangEnum.CHO_GIAO);
    pay();
    var voucher = ArgumentCaptor.forClass(CashbookService.AutomaticVoucher.class);
    verify(cashbookService).createAutomatic(voucher.capture());
    assertEquals("THU-DH-1", voucher.getValue().maPhieu());
    assertEquals(NhomNguoiNopNhanEnum.KHACH_HANG, voucher.getValue().nhomNguoiNopNhan());
    assertEquals(new BigDecimal("1000"), voucher.getValue().soTien());
    assertEquals(request.getNgayThanhToan(), voucher.getValue().ngayGhiNhan());
    assertTrue(voucher.getValue().moTa().contains("BANK-001"));
    assertEquals(TrangThaiThanhToanDonHang.DA_THANH_TOAN, order.getTrangThaiThanhToan());
    assertEquals(TrangThaiDonHang.CHO_DONG_GOI, order.getTrangThaiDonHang());
    assertEquals(TrangThaiDongGoi.DANG_DONG_GOI, order.getTrangThaiDongGoi());
    assertEquals(TrangThaiXuatKho.CHUA_XUAT_KHO, order.getTrangThaiXuatKho());
    assertEquals(BigDecimal.ZERO, delivery.getTienThuHoCod());
    assertEquals("CHUYEN_KHOAN", order.getPhuongThucThanhToan());
    assertEquals("BANK-001", order.getMaGiaoDichThanhToan());
    var event = ArgumentCaptor.forClass(LichSuXuLyDonHang.class);
    verify(historyRepository).save(event.capture());
    assertEquals("XAC_NHAN_THU_TIEN", event.getValue().getHanhDong());
    assertTrue(event.getValue().getMoTa().contains("THU-DH-1"));
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiDonHang.class,
      names = {"CHO_DUYET", "HUY_HANG"})
  void rejectsUnapprovedOrCancelled(TrangThaiDonHang status) {
    order.setTrangThaiDonHang(status);
    assertThrows(AppException.class, this::pay);
    verify(cashbookService, never()).createAutomatic(any());
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 999, 1001})
  void requiresExactPositiveAmount(int amount) {
    request.setSoTienThanhToan(BigDecimal.valueOf(amount));
    assertThrows(AppException.class, this::pay);
    assertEquals(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN, order.getTrangThaiThanhToan());
    verify(cashbookService, never()).createAutomatic(any());
  }

  @Test
  void rejectsDuplicateConfirmationAndMissingReceiptAcknowledgment() {
    request.setXacNhanDaNhanTien(false);
    assertThrows(AppException.class, this::pay);
    request.setXacNhanDaNhanTien(true);
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    assertThrows(AppException.class, this::pay);
    verify(cashbookService, never()).createAutomatic(any());
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiGiaoHangEnum.class,
      names = {"DA_NHAN_HANG", "DANG_GIAO", "GIAO_THANH_CONG", "CHO_HOAN_HANG"})
  void blocksDirectCollectionAfterHandoff(TrangThaiGiaoHangEnum status) {
    delivery(status);
    assertThrows(AppException.class, this::pay);
    verify(cashbookService, never()).createAutomatic(any());
  }

  @Test
  void acceptsCodRemittanceOnlyAfterSuccessfulDeliveryAndKeepsCustomerPaymentMethod() {
    var delivery = delivery(TrangThaiGiaoHangEnum.DANG_GIAO);
    request.setNguonThu("DOI_TAC_GIAO_HANG");
    request.setPhieuGiaoHangId(3L);
    order.setTrangThaiDonHang(TrangThaiDonHang.HOAN_THANH);
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO);
    order.setMaGiaoDichThanhToan("CUSTOMER-TXN");
    assertThrows(AppException.class, this::pay);
    delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.GIAO_THANH_CONG);
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN);
    assertThrows(AppException.class, this::pay);
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    pay();
    var voucher = ArgumentCaptor.forClass(CashbookService.AutomaticVoucher.class);
    verify(cashbookService).createAutomatic(voucher.capture());
    assertEquals("THU-COD-3", voucher.getValue().maPhieu());
    assertEquals(NhomNguoiNopNhanEnum.DOI_TAC_GIAO_HANG, voucher.getValue().nhomNguoiNopNhan());
    assertSame(delivery.getDoiTacVanChuyen(), voucher.getValue().doiTacVanChuyen());
    assertEquals("TIEN_MAT", order.getPhuongThucThanhToan());
    assertEquals("CUSTOMER-TXN", order.getMaGiaoDichThanhToan());
    assertEquals(new BigDecimal("1000"), delivery.getTienThuHoCod());
    assertEquals(TrangThaiThanhToanDonHang.DA_THANH_TOAN, order.getTrangThaiThanhToan());
  }

  @Test
  void customerReceiptMovesWaitingPaymentOrderToPacking() {
    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_THANH_TOAN);
    pay();
    assertEquals(TrangThaiDonHang.CHO_DONG_GOI, order.getTrangThaiDonHang());
    assertEquals(TrangThaiThanhToanDonHang.DA_THANH_TOAN, order.getTrangThaiThanhToan());
    verify(historyRepository).save(any());
  }

  @Test
  void zeroTotalDoesNotCreateReceiptOrMarkPaidThroughPaymentApi() {
    order.setTongTienHang(BigDecimal.ZERO);
    order.setTongThanhToan(BigDecimal.ZERO);
    when(lineRepository.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of());
    assertThrows(AppException.class, this::pay);
    assertEquals(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN, order.getTrangThaiThanhToan());
    verify(cashbookService, never()).createAutomatic(any());
    verifyNoInteractions(historyRepository);
  }

  @Test
  void storedLineMismatchBlocksCollection() {
    when(lineRepository.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of());
    assertThrows(AppException.class, this::pay);
    verify(cashbookService, never()).createAutomatic(any());
    verifyNoInteractions(historyRepository);
  }

  @Test
  void receiptFailureDoesNotMarkPaid() {
    doThrow(new IllegalStateException("cashbook unavailable"))
        .when(cashbookService)
        .createAutomatic(any());
    assertThrows(IllegalStateException.class, this::pay);
    assertEquals(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN, order.getTrangThaiThanhToan());
    verify(entityManager, never()).flush();
    verifyNoInteractions(historyRepository);
  }
}
