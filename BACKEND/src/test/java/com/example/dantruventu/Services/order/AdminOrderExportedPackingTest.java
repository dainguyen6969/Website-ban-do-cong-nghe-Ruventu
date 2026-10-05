package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminOrderRequest;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Mapper.order.AdminOrderMapper;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.*;
import com.example.dantruventu.Repository.partner.DoiTacVanChuyenRepository;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminOrderExportedPackingTest {
  @Mock DonHangRepository orderRepository;
  @Mock ChiTietDonHangRepository lineRepository;
  @Mock SoQuyThuChiRepository cashRepository;
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock LichSuXuLyDonHangRepository historyRepository;
  @Mock DoiTacVanChuyenRepository partnerRepository;
  @Mock AdminOrderMapper mapper;
  @Mock AdminSalesService salesService;
  @Mock SalesContext context;
  @Mock OrderInventoryService inventory;
  @Mock DeliveryInventoryService deliveryInventory;
  @Mock EntityManager entityManager;
  @Spy SalesProperties properties = new SalesProperties();
  @InjectMocks AdminOrderService service;
  DonHang order;

  @BeforeEach
  void setup() {
    order =
        DonHang.builder()
            .id(1L)
            .loaiDonHang(LoaiDonHang.ONLINE)
            .trangThaiDonHang(TrangThaiDonHang.CHO_DUYET)
            .trangThaiDongGoi(TrangThaiDongGoi.CHUA_DONG_GOI)
            .trangThaiXuatKho(TrangThaiXuatKho.CHUA_XUAT_KHO)
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN)
            .tongTienHang(new BigDecimal("70000"))
            .tongThanhToan(new BigDecimal("100000"))
            .phiGiaoHang(new BigDecimal("30000"))
            .build();
    when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
  }

  void pack(TrangThaiDongGoi target) {
    var request = new AdminOrderRequest.Packing();
    request.setTrangThaiDongGoi(target);
    service.packing(1L, request);
  }

  void validStoredAmounts() {
    when(lineRepository.findByDonHang_IdOrderByIdAsc(1L))
        .thenReturn(
            List.of(
                ChiTietDonHang.builder()
                    .soLuong(1)
                    .donGia(new BigDecimal("70000"))
                    .thanhTien(new BigDecimal("70000"))
                    .build()));
    when(cashRepository.sumByPurchaseOrder(any(), any(), any())).thenReturn(BigDecimal.ZERO);
  }

  @Test
  void approvesPrepaidOrderWithoutChangingPaymentOrExportingStock() {
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    validStoredAmounts();
    service.approve(1L);
    assertEquals(TrangThaiDonHang.CHO_DONG_GOI, order.getTrangThaiDonHang());
    assertEquals(TrangThaiThanhToanDonHang.DA_THANH_TOAN, order.getTrangThaiThanhToan());
    assertEquals(TrangThaiDongGoi.CHUA_DONG_GOI, order.getTrangThaiDongGoi());
    assertEquals(TrangThaiXuatKho.CHUA_XUAT_KHO, order.getTrangThaiXuatKho());
    verify(inventory).checkAvailable(order);
    verify(inventory, never()).reserve(any());
    verify(inventory, never()).export(any(), any());
    verify(historyRepository).save(any());
  }

  @Test
  void prepaidOrderStillCannotBeApprovedWithoutAvailableStock() {
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    validStoredAmounts();
    var shortage =
        new AppException(
            com.example.dantruventu.Error.ErrorCode.CONFLICT,
            "Không đủ tồn có thể bán của phiên bản 362");
    doThrow(shortage).when(inventory).checkAvailable(order);
    assertSame(shortage, assertThrows(AppException.class, () -> service.approve(1L)));
    assertEquals(TrangThaiDonHang.CHO_DUYET, order.getTrangThaiDonHang());
    assertEquals(TrangThaiThanhToanDonHang.DA_THANH_TOAN, order.getTrangThaiThanhToan());
    verifyNoInteractions(historyRepository);
    verify(entityManager, never()).flush();
  }

  @ParameterizedTest
  @EnumSource(value = TrangThaiDonHang.class, names = "CHO_DUYET", mode = EnumSource.Mode.EXCLUDE)
  void prepaidOrderStillCannotBeApprovedFromAnotherStage(TrangThaiDonHang status) {
    order.setTrangThaiDonHang(status);
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    assertThrows(AppException.class, () -> service.approve(1L));
    assertEquals(status, order.getTrangThaiDonHang());
    verifyNoInteractions(inventory, historyRepository);
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void canonicalLifecycleCreatesDeliveryOnlyForShipping(boolean shipping) {
    order.setDiaChiGiaoHang(shipping ? "Dia chi giao hang" : null);
    validStoredAmounts();
    var deliveries = new ArrayList<PhieuGiaoHang>();
    when(deliveryRepository.findByDonHang_IdOrderByIdAsc(1L))
        .thenAnswer(call -> List.copyOf(deliveries));
    service.approve(1L);
    assertEquals(TrangThaiDonHang.CHO_DONG_GOI, order.getTrangThaiDonHang());
    assertEquals(TrangThaiDongGoi.CHUA_DONG_GOI, order.getTrangThaiDongGoi());
    var request = new AdminOrderRequest.Fulfillment();
    if (shipping) {
      var partner =
          DoiTacVanChuyen.builder().id(3L).trangThai(TrangThaiCoBanEnum.HOAT_DONG).build();
      when(partnerRepository.findByIdForShare(3L)).thenReturn(Optional.of(partner));
      when(deliveryRepository.save(any()))
          .thenAnswer(
              call -> {
                PhieuGiaoHang delivery = call.getArgument(0);
                delivery.setId(2L);
                deliveries.add(delivery);
                return delivery;
              });
      when(deliveryRepository.findByIdForUpdate(2L))
          .thenAnswer(call -> Optional.of(deliveries.getFirst()));
      request.setDoiTacVanChuyenId(3L);
      request.setPhiTraDoiTac(BigDecimal.ZERO);
    }
    service.fulfillment(1L, request);
    assertEquals(TrangThaiDonHang.CHO_DONG_GOI, order.getTrangThaiDonHang());
    assertEquals(TrangThaiDongGoi.DANG_DONG_GOI, order.getTrangThaiDongGoi());
    assertEquals(shipping ? 1 : 0, deliveries.size());
    if (shipping) {
      assertEquals(TrangThaiGiaoHangEnum.CHO_GIAO, deliveries.getFirst().getTrangThaiGiaoHang());
      assertSame(order, deliveries.getFirst().getDonHang());
      assertEquals(new BigDecimal("100000"), deliveries.getFirst().getTienThuHoCod());
    } else verify(deliveryRepository, never()).save(any());
    pack(TrangThaiDongGoi.DA_DONG_GOI);
    assertEquals(TrangThaiDonHang.CHO_DONG_GOI, order.getTrangThaiDonHang());
    assertEquals(TrangThaiXuatKho.CHUA_XUAT_KHO, order.getTrangThaiXuatKho());
    var exportRequest = new AdminOrderRequest.Export();
    service.export(1L, exportRequest);
    assertEquals(TrangThaiDonHang.CHO_LAY_HANG, order.getTrangThaiDonHang());
    assertEquals(TrangThaiDongGoi.DA_DONG_GOI, order.getTrangThaiDongGoi());
    assertEquals(TrangThaiXuatKho.DA_XUAT_KHO, order.getTrangThaiXuatKho());
    if (shipping)
      assertEquals(TrangThaiGiaoHangEnum.CHO_GIAO, deliveries.getFirst().getTrangThaiGiaoHang());
    verify(inventory).reserve(order);
    verify(inventory).export(order, exportRequest);
    verifyNoInteractions(deliveryInventory);
    var events = ArgumentCaptor.forClass(LichSuXuLyDonHang.class);
    verify(historyRepository, times(4)).save(events.capture());
    assertEquals(
        List.of("DUYET_DON", "BAT_DAU_DONG_GOI", "HOAN_TAT_DONG_GOI", "XUAT_KHO"),
        events.getAllValues().stream().map(LichSuXuLyDonHang::getHanhDong).toList());
    for (var target : TrangThaiDongGoi.values())
      assertThrows(AppException.class, () -> pack(target));
    assertEquals(TrangThaiDonHang.CHO_LAY_HANG, order.getTrangThaiDonHang());
    assertEquals(TrangThaiDongGoi.DA_DONG_GOI, order.getTrangThaiDongGoi());
    verify(historyRepository, times(4)).save(any());
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiXuatKho.class,
      names = {"DA_XUAT_KHO", "DA_HOAN_KHO"})
  void rejectsEveryPackingChangeAfterExportEvenForLegacyReversedOrders(TrangThaiXuatKho stock) {
    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);
    order.setTrangThaiDongGoi(TrangThaiDongGoi.DANG_DONG_GOI);
    order.setTrangThaiXuatKho(stock);
    for (var target : TrangThaiDongGoi.values())
      assertThrows(AppException.class, () -> pack(target));
    assertEquals(TrangThaiDongGoi.DANG_DONG_GOI, order.getTrangThaiDongGoi());
    verifyNoInteractions(inventory, deliveryInventory, historyRepository, deliveryRepository);
    verify(entityManager, never()).flush();
  }

  @Test
  void cancellationBeforeExportReleasesReservationAndCancelsWaitingDelivery() {
    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);
    order.setTrangThaiDongGoi(TrangThaiDongGoi.DANG_DONG_GOI);
    var delivery =
        PhieuGiaoHang.builder()
            .id(2L)
            .donHang(order)
            .trangThaiGiaoHang(TrangThaiGiaoHangEnum.CHO_GIAO)
            .build();
    when(deliveryRepository.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of(delivery));
    when(deliveryRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(delivery));
    pack(TrangThaiDongGoi.HUY_DONG_GOI);
    assertEquals(TrangThaiDongGoi.HUY_DONG_GOI, order.getTrangThaiDongGoi());
    assertEquals(TrangThaiXuatKho.CHUA_XUAT_KHO, order.getTrangThaiXuatKho());
    assertEquals(TrangThaiGiaoHangEnum.HUY_GIAO_HANG, delivery.getTrangThaiGiaoHang());
    verify(deliveryInventory).releaseReservation(order);
  }
}
