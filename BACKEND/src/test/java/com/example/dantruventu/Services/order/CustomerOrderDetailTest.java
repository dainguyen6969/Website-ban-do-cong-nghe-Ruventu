package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CustomerOrderDetailTest {
  @Mock DonHangRepository orderRepository;
  @Mock ChiTietDonHangRepository orderLineRepository;
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock SoSerialSanPhamRepository serialRepository;
  @Mock AnhSanPhamRepository imageRepository;
  @Mock SalesCalculationService calculationService;
  @InjectMocks CustomerOrderService service;

  @Test
  void detailLoadsImagesInOneBatchPreferringPrimaryAndKeepingMissingImagesNull() {
    var user = NguoiDung.builder().id(1L).build();
    var order =
        DonHang.builder().id(9L).tongThanhToan(BigDecimal.TEN).tongTienHang(BigDecimal.TEN).build();
    var first = SanPham.builder().id(10L).tenSanPham("CPU").build();
    var second = SanPham.builder().id(11L).tenSanPham("RAM").build();
    var third = SanPham.builder().id(12L).tenSanPham("MAIN").build();
    var products = List.of(first, second, third, first);
    var lines =
        products.stream()
            .map(
                product ->
                    ChiTietDonHang.builder()
                        .phienBan(
                            PhienBanSanPham.builder().id(product.getId()).sanPham(product).build())
                        .soLuong(1)
                        .build())
            .toList();
    when(orderRepository.findByIdAndKhachHangId(9L, 1L)).thenReturn(Optional.of(order));
    when(orderLineRepository.findByDonHang_IdOrderByIdAsc(9L)).thenReturn(lines);
    when(serialRepository.findByDonHang_IdOrderByIdAsc(9L)).thenReturn(List.of());
    when(deliveryRepository.findByDonHang_IdOrderByIdAsc(9L)).thenReturn(List.of());
    when(imageRepository.findBySanPhamIdInOrderByThuTuHienThiAscIdAsc(List.of(10L, 11L, 12L)))
        .thenReturn(
            List.of(
                AnhSanPham.builder().sanPham(first).duongDanAnh("cpu-first.jpg").build(),
                AnhSanPham.builder()
                    .sanPham(first)
                    .duongDanAnh("cpu-main.jpg")
                    .laAnhChinh(true)
                    .build(),
                AnhSanPham.builder().sanPham(first).duongDanAnh("cpu-other.jpg").build(),
                AnhSanPham.builder().sanPham(second).duongDanAnh("ram-first.jpg").build()));

    var detail = service.getOrderDetail(user, 9L);
    assertEquals("cpu-main.jpg", detail.getSanPham().get(0).getAnhDaiDien());
    assertEquals("ram-first.jpg", detail.getSanPham().get(1).getAnhDaiDien());
    assertNull(detail.getSanPham().get(2).getAnhDaiDien());
    assertEquals("cpu-main.jpg", detail.getSanPham().get(3).getAnhDaiDien());
    assertEquals(BigDecimal.TEN, detail.getTongThanhToan());
    verify(imageRepository, times(1)).findBySanPhamIdInOrderByThuTuHienThiAscIdAsc(any());
    verify(orderRepository, never()).save(any());
  }
}
