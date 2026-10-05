package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhieuGiaoHang;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Mapper.order.AdminSalesMapper;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
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
  @InjectMocks AdminSalesService service;

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
    when(serialRepository.findByDonHang_IdOrderByIdAsc(9L)).thenReturn(List.of());
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
