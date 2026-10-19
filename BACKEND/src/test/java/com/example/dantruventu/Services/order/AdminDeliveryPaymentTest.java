package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.order.AdminDeliveryStatusRequest;
import com.example.dantruventu.DTO.Response.order.AdminDeliveryResponse;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.PhieuGiaoHang;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Mapper.order.AdminDeliveryMapper;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.OrderSaleSnapshotService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminDeliveryPaymentTest {
  @Mock DonHangRepository orderRepository;
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock AdminDeliveryMapper mapper;
  @Mock AdminOrderService orderService;
  @Mock ChiTietDonHangRepository orderLineRepository;
  @Mock CatalogSupport catalogSupport;
  @Mock OrderSaleSnapshotService saleSnapshots;
  @Mock DeliveryInventoryService inventoryService;
  @InjectMocks AdminDeliveryService service;

  @Test
  void deliveryDetailReturnsTheSameCatalogImageAsOrderDetail() {
    ReflectionTestUtils.setField(service, "shippingTimeZone", "Asia/Ho_Chi_Minh");
    var order = DonHang.builder().id(1L).build();
    var delivery = PhieuGiaoHang.builder().id(3L).donHang(order).build();
    var product = SanPham.builder().id(12L).loaiSanPham(LoaiSanPham.DON).build();
    var line =
        ChiTietDonHang.builder()
            .phienBan(PhienBanSanPham.builder().sanPham(product).build())
            .build();
    when(deliveryRepository.findById(3L)).thenReturn(Optional.of(delivery));
    when(mapper.toDetail(eq(delivery), any())).thenReturn(new AdminDeliveryResponse.Detail());
    when(orderLineRepository.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of(line));
    when(saleSnapshots.product(line)).thenReturn(new AdminDeliveryResponse.ProductData());
    when(catalogSupport.primaryImages(List.of(12L))).thenReturn(Map.of(12L, "/image.jpg"));

    assertEquals("/image.jpg", service.getDetail(3L).getSanPham().get(0).getAnhDaiDien());
    verify(catalogSupport).primaryImages(List.of(12L));
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  void successfulCodRequiresAcknowledgmentAndRecordsCustomerPaymentOnly(boolean confirmed) {
    ReflectionTestUtils.setField(service, "shippingTimeZone", "Asia/Ho_Chi_Minh");
    var order =
        DonHang.builder()
            .id(1L)
            .loaiDonHang(LoaiDonHang.ONLINE)
            .trangThaiDonHang(TrangThaiDonHang.DANG_GIAO_HANG)
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN)
            .trangThaiDongGoi(TrangThaiDongGoi.DA_DONG_GOI)
            .trangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO)
            .tongThanhToan(new BigDecimal("1000"))
            .build();
    var delivery =
        PhieuGiaoHang.builder()
            .id(3L)
            .maPhieuGiaoHang("PGH-3")
            .donHang(order)
            .trangThaiGiaoHang(TrangThaiGiaoHangEnum.DANG_GIAO)
            .tienThuHoCod(new BigDecimal("1000"))
            .build();
    when(deliveryRepository.findOrderId(3L)).thenReturn(Optional.of(1L));
    when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
    when(deliveryRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(delivery));
    when(deliveryRepository.findByDonHang_IdOrderByIdAsc(1L)).thenReturn(List.of(delivery));
    var request = new AdminDeliveryStatusRequest();
    request.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.GIAO_THANH_CONG);
    request.setXacNhanDaThuCod(confirmed);

    if (!confirmed) {
      assertThrows(AppException.class, () -> service.changeStatus(3L, request));
      assertEquals(TrangThaiDonHang.DANG_GIAO_HANG, order.getTrangThaiDonHang());
      assertEquals(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN, order.getTrangThaiThanhToan());
      assertEquals(TrangThaiGiaoHangEnum.DANG_GIAO, delivery.getTrangThaiGiaoHang());
      verifyNoInteractions(orderService);
      verify(deliveryRepository, never()).flush();
      return;
    }

    service.changeStatus(3L, request);
    assertEquals(TrangThaiDonHang.HOAN_THANH, order.getTrangThaiDonHang());
    assertEquals(TrangThaiThanhToanDonHang.DA_THANH_TOAN, order.getTrangThaiThanhToan());
    assertEquals(TrangThaiGiaoHangEnum.GIAO_THANH_CONG, delivery.getTrangThaiGiaoHang());
    assertEquals(new BigDecimal("1000"), delivery.getTienThuHoCod());
    verify(orderService)
        .recordHistory(eq(order), eq("GIAO_VAN_GIAO_THANH_CONG"), contains("PGH-3"));
    verifyNoMoreInteractions(orderService);
    verify(deliveryRepository).flush();
  }
}
