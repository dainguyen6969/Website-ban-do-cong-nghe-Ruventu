package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Mapper.order.AdminOrderMapper;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminOrderPaymentTest {
  @Mock DonHangRepository orderRepository;
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock SoQuyThuChiRepository cashRepository;
  @Mock AdminOrderMapper mapper;
  @Mock AdminSalesService salesService;
  @Mock SalesContext context;
  @Mock EntityManager entityManager;
  @InjectMocks AdminOrderService service;
  private DonHang order;

  @BeforeEach
  void setUp() {
    order =
        DonHang.builder()
            .id(1L)
            .loaiDonHang(LoaiDonHang.ONLINE)
            .trangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI)
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN)
            .trangThaiDongGoi(TrangThaiDongGoi.DANG_DONG_GOI)
            .trangThaiXuatKho(TrangThaiXuatKho.CHUA_XUAT_KHO)
            .phuongThucThanhToan("CHUYEN_KHOAN")
            .maGiaoDichThanhToan("EXISTING")
            .tongThanhToan(BigDecimal.ZERO)
            .build();
    when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
  }

  @ParameterizedTest
  @EnumSource(value = TrangThaiDonHang.class, names = "HUY_HANG", mode = EnumSource.Mode.EXCLUDE)
  void confirmationChangesOnlyPaymentStatus(TrangThaiDonHang status) {
    order.setTrangThaiDonHang(status);
    service.confirmPayment(1L);
    assertEquals(TrangThaiThanhToanDonHang.DA_THANH_TOAN, order.getTrangThaiThanhToan());
    assertEquals(status, order.getTrangThaiDonHang());
    assertEquals(TrangThaiDongGoi.DANG_DONG_GOI, order.getTrangThaiDongGoi());
    assertEquals(TrangThaiXuatKho.CHUA_XUAT_KHO, order.getTrangThaiXuatKho());
    assertEquals("CHUYEN_KHOAN", order.getPhuongThucThanhToan());
    assertEquals("EXISTING", order.getMaGiaoDichThanhToan());
    assertEquals(BigDecimal.ZERO, order.getTongThanhToan());
    verifyNoInteractions(cashRepository, deliveryRepository);
    verify(entityManager).flush();
  }

  @Test
  void rejectsCancelledOrder() {
    order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
    assertThrows(AppException.class, () -> service.confirmPayment(1L));
    assertEquals(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN, order.getTrangThaiThanhToan());
    verifyNoInteractions(cashRepository, deliveryRepository, salesService);
    verify(entityManager, never()).flush();
  }

  @Test
  void rejectsDuplicateConfirmation() {
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    assertThrows(AppException.class, () -> service.confirmPayment(1L));
    verifyNoInteractions(cashRepository, deliveryRepository, salesService);
    verify(entityManager, never()).flush();
  }
}
