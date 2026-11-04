package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Response.order.AdminDeliveryResponse.ProductData;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.PhieuGiaoHang;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Mapper.order.AdminSalesMapper;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import com.example.dantruventu.Services.order.sales.OrderDeviceHistoryService;
import com.example.dantruventu.Services.order.sales.OrderSaleSnapshotService;
import com.example.dantruventu.Services.order.sales.SoldDeviceService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminSalesOrderDetailTest {
  @Mock SalesProperties properties;
  @Mock AdminSalesMapper mapper;
  @Mock DonHangRepository orderRepository;
  @Mock ChiTietDonHangRepository orderLineRepository;
  @Mock SoSerialSanPhamRepository serialRepository;
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock SoQuyThuChiRepository cashRepository;
  @Mock CatalogSupport catalogSupport;
  @Mock OrderSaleSnapshotService saleSnapshots;
  @Mock SoldDeviceService soldDevices;
  @Mock OrderDeviceHistoryService deviceHistory;
  @InjectMocks AdminSalesService service;

  @BeforeEach
  void prepareDeviceHistory() {
    when(deviceHistory.read(any()))
        .thenReturn(new OrderDeviceHistoryService.View(List.of(), List.of(), false, List.of()));
  }

  @ParameterizedTest
  @EnumSource(LoaiDonHang.class)
  void orderDetailUsesCatalogImagesForAllLinesInOneLookup(LoaiDonHang type) {
    var order =
        DonHang.builder()
            .id(9L)
            .loaiDonHang(type)
            .tongThanhToan(BigDecimal.TEN)
            .tongTienHang(BigDecimal.TEN)
            .build();
    var product = SanPham.builder().id(12L).loaiSanPham(LoaiSanPham.DON).build();
    var withoutImage = SanPham.builder().id(13L).loaiSanPham(LoaiSanPham.DON).build();
    var lines =
        List.of(
            ChiTietDonHang.builder()
                .phienBan(PhienBanSanPham.builder().id(1L).sanPham(product).build())
                .build(),
            ChiTietDonHang.builder()
                .phienBan(PhienBanSanPham.builder().id(2L).sanPham(product).build())
                .build(),
            ChiTietDonHang.builder()
                .phienBan(PhienBanSanPham.builder().id(3L).sanPham(withoutImage).build())
                .build());
    when(orderRepository.findById(9L)).thenReturn(Optional.of(order));
    if (type == LoaiDonHang.TAI_QUAY) {
      when(mapper.toCheckout(eq(order), any())).thenReturn(new AdminSalesResponse.Checkout());
    } else {
      when(mapper.toOrder(eq(order), any())).thenReturn(new AdminSalesResponse.Order());
    }
    when(orderLineRepository.findByDonHang_IdOrderByIdAsc(9L)).thenReturn(lines);
    when(saleSnapshots.product(any()))
        .thenAnswer(
            invocation -> {
              var item = new ProductData();
              item.setTenSanPham("Tên sản phẩm lúc bán");
              item.setDonGia(BigDecimal.TEN);
              return item;
            });
    when(catalogSupport.primaryImages(List.of(12L, 13L))).thenReturn(Map.of(12L, "/image.jpg"));

    var products = service.getOrder(9L).getSanPham();

    assertEquals("/image.jpg", products.get(0).getAnhDaiDien());
    assertEquals("/image.jpg", products.get(1).getAnhDaiDien());
    assertNull(products.get(2).getAnhDaiDien());
    assertEquals("Tên sản phẩm lúc bán", products.get(0).getTenSanPham());
    assertEquals(BigDecimal.TEN, products.get(0).getDonGia());
    verify(catalogSupport).primaryImages(List.of(12L, 13L));
  }

  @Test
  void posDetailReadsThePersistedReceiptWithoutInventingTenderedCashOrChange() {
    var order =
        DonHang.builder()
            .id(9L)
            .loaiDonHang(LoaiDonHang.TAI_QUAY)
            .tongThanhToan(BigDecimal.TEN)
            .tongTienHang(BigDecimal.TEN)
            .build();
    var response = new AdminSalesResponse.Checkout();
    var receipt = new SoQuyThuChi();
    var mapped = new AdminSalesResponse.CashReceipt("THU-POS-9", BigDecimal.TEN, null, null, null);
    when(orderRepository.findById(9L)).thenReturn(Optional.of(order));
    when(mapper.toCheckout(eq(order), any())).thenReturn(response);
    when(orderLineRepository.findByDonHang_IdOrderByIdAsc(9L)).thenReturn(List.of());
    when(deliveryRepository.findByDonHang_IdOrderByIdAsc(9L)).thenReturn(List.of());
    when(cashRepository.findByMaPhieu("THU-POS-9")).thenReturn(Optional.of(receipt));
    when(mapper.toCashReceipt(receipt)).thenReturn(mapped);

    assertSame(response, service.getOrder(9L));
    assertSame(mapped, response.getPhieuThu());
    assertNull(response.getTienKhachDua());
    assertNull(response.getTienThua());
    verify(cashRepository, never()).save(any());
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  void codReceiptStatusSurvivesReload(boolean received) {
    var order =
        DonHang.builder()
            .id(9L)
            .maDonHang("ORD-9")
            .loaiDonHang(LoaiDonHang.ONLINE)
            .tongThanhToan(BigDecimal.TEN)
            .tongTienHang(BigDecimal.TEN)
            .build();
    var response = new AdminSalesResponse.Order();
    var delivery = PhieuGiaoHang.builder().id(3L).build();
    var mappedDelivery =
        new AdminSalesResponse.Delivery(
            3L,
            "PGH-3",
            null,
            null,
            null,
            TrangThaiGiaoHangEnum.GIAO_THANH_CONG,
            BigDecimal.TEN,
            null);
    var receipt =
        SoQuyThuChi.builder()
            .loaiPhieu(LoaiPhieuThuChi.THU)
            .nguonTao(NguonTaoPhieuThuChi.TU_DONG)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .maChungTuThamChieu("ORD-9")
            .build();
    when(orderRepository.findById(9L)).thenReturn(Optional.of(order));
    when(mapper.toOrder(eq(order), any())).thenReturn(response);
    when(deliveryRepository.findByDonHang_IdOrderByIdAsc(9L)).thenReturn(List.of(delivery));
    when(mapper.toDelivery(delivery)).thenReturn(mappedDelivery);
    when(cashRepository.findByMaPhieu("THU-COD-3"))
        .thenReturn(received ? Optional.of(receipt) : Optional.empty());

    assertEquals(received, service.getOrder(9L).getDaGhiNhanThuCod());
    verify(cashRepository, never()).save(any());
  }
}
