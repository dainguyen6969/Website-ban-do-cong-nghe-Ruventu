package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.warehouse.*;
import com.example.dantruventu.Services.order.sales.*;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class WarrantyReservationInventoryTest {
  TonKho stock =
      TonKho.builder()
          .id(1L)
          .phienBan(
              PhienBanSanPham.builder()
                  .id(101L)
                  .sanPham(SanPham.builder().loaiSanPham(LoaiSanPham.DON).build())
                  .build())
          .tonThucTe(10)
          .tonCoTheBan(5)
          .hangLoi(0)
          .soLuongGiuChoBaoHanh(2)
          .build();

  @Test
  void salesReservationExcludesWarrantyHeldUnits() {
    var lines = mock(ChiTietDonHangRepository.class);
    var calculation = mock(SalesCalculationService.class);
    var context = mock(SalesContext.class);
    var service =
        spy(
            new OrderInventoryService(
                lines,
                mock(SoSerialSanPhamRepository.class),
                mock(TheKhoRepository.class),
                calculation,
                context,
                new SalesProperties(),
                mock(EntityManager.class)));
    var order = DonHang.builder().id(8L).build();
    doReturn(new OrderInventoryService.Plan(List.of(), Map.of(101L, 1), Map.of(), List.of()))
        .when(service)
        .plan(order, true);
    when(context.defaultWarehouseId()).thenReturn(1L);
    when(calculation.stock(1L, 101L, true)).thenReturn(stock);
    when(lines.sumReservedQuantity(101L)).thenReturn(3L);
    assertDoesNotThrow(() -> service.checkAvailable(order));
    service.reserve(order);
    assertEquals(4, stock.getTonCoTheBan());
    assertEquals(2, stock.getSoLuongGiuChoBaoHanh());
    assertEquals(10, stock.getTonThucTe());
  }

  @Test
  void releasingSaleReservationDoesNotReleaseWarrantyUnit() {
    var lines = mock(ChiTietDonHangRepository.class);
    var warehouses = mock(KhoHangRepository.class);
    var stocks = mock(TonKhoRepository.class);
    var cards = mock(TheKhoRepository.class);
    var service =
        new DeliveryInventoryService(
            lines,
            mock(ThanhPhanComboRepository.class),
            warehouses,
            stocks,
            cards,
            mock(SoSerialSanPhamRepository.class));
    ReflectionTestUtils.setField(service, "defaultWarehouseId", 1L);
    var order = DonHang.builder().id(8L).trangThaiDongGoi(TrangThaiDongGoi.DANG_DONG_GOI).build();
    when(warehouses.count()).thenReturn(1L);
    when(warehouses.findById(1L))
        .thenReturn(
            Optional.of(KhoHang.builder().id(1L).trangThai(TrangThaiCoBanEnum.HOAT_DONG).build()));
    when(lines.findByDonHang_IdOrderByIdAsc(8L))
        .thenReturn(
            List.of(
                ChiTietDonHang.builder().id(9L).phienBan(stock.getPhienBan()).soLuong(1).build()));
    when(stocks.findForSerialUpdate(1L, 101L)).thenReturn(List.of(stock));
    when(lines.sumReservedQuantity(101L)).thenReturn(3L);
    service.releaseReservation(order);
    assertEquals(6, stock.getTonCoTheBan());
    assertEquals(2, stock.getSoLuongGiuChoBaoHanh());
    assertEquals(10, stock.getTonThucTe());
    verify(cards, never()).save(any());
  }
}
