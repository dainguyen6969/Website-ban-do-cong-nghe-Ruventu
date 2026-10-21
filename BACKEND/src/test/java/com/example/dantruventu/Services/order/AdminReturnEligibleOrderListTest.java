package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.AdminReturnOrderRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.ChiTietTraHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class AdminReturnEligibleOrderListTest {

  @Mock PhieuTraHangRepository returnRepository;
  @Mock AdminReturnOrderRepository returnOrderRepository;
  @Mock DonHangRepository orderRepository;
  @Mock ChiTietDonHangRepository orderLineRepository;
  @Mock ChiTietTraHangRepository returnLineRepository;
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock SoQuyThuChiRepository cashRepository;
  @Mock LoaiThuChiRepository cashTypeRepository;
  @Mock CashbookService cashbookService;
  @Mock ReturnInventoryService returnInventoryService;
  @Mock SalesProperties salesProperties;

  @InjectMocks AdminReturnService service;

  @Test
  void returnsGuestContactCompletionTimeAndFullReturnRule() {
    when(salesProperties.zone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));

    DonHang order =
        DonHang.builder()
            .id(1001L)
            .maDonHang("ORD-001")
            .khachHang(null)
            .tenNguoiNhan("Nguyễn Văn An")
            .sdtNguoiNhan("0912345678")
            .trangThaiDonHang(TrangThaiDonHang.HOAN_THANH)
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN)
            .trangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO)
            .ngayTao(LocalDateTime.of(2026, 10, 1, 9, 0))
            .ngayHoanThanh(LocalDateTime.of(2026, 10, 8, 10, 0))
            .build();

    when(returnOrderRepository.findEligibleOrders(
            eq("ord-001"),
            eq(TrangThaiDonHang.HOAN_THANH),
            eq(TrangThaiThanhToanDonHang.DA_THANH_TOAN),
            eq(TrangThaiXuatKho.DA_XUAT_KHO),
            eq(Set.of(TrangThaiTraHang.HUY, TrangThaiTraHang.TU_CHOI)),
            eq(TrangThaiBaoHanh.HOAN_TAT),
            any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 20), 1));
    when(orderLineRepository.findOrderIdsRequiringFullReturn(List.of(1001L), LoaiSanPham.BO_PC))
        .thenReturn(List.of(1001L));

    var response = service.getEligibleOrders(" ORD-001 ", 0, 20);

    assertEquals(1, response.getItems().size());
    var item = response.getItems().getFirst();
    assertEquals(1001L, item.getId());
    assertNull(item.getKhachHangId());
    assertEquals("Nguyễn Văn An", item.getTenNguoiLienHe());
    assertEquals("0912345678", item.getSdtNguoiLienHe());
    assertEquals(TrangThaiXuatKho.DA_XUAT_KHO, item.getTrangThaiXuatKho());
    assertEquals("2026-10-08T10:00+07:00", item.getNgayHoanThanh().toString());
    assertTrue(item.isChiDuocTraToanBo());

    ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
    verify(returnOrderRepository)
        .findEligibleOrders(
            eq("ord-001"),
            eq(TrangThaiDonHang.HOAN_THANH),
            eq(TrangThaiThanhToanDonHang.DA_THANH_TOAN),
            eq(TrangThaiXuatKho.DA_XUAT_KHO),
            eq(Set.of(TrangThaiTraHang.HUY, TrangThaiTraHang.TU_CHOI)),
            eq(TrangThaiBaoHanh.HOAN_TAT),
            pageable.capture());
    assertEquals(
        "DESC", pageable.getValue().getSort().getOrderFor("ngayHoanThanh").getDirection().name());
    assertEquals("DESC", pageable.getValue().getSort().getOrderFor("id").getDirection().name());
  }

  @Test
  void neverUsesOrderCreatedTimeAsCompletionTime() {
    DonHang legacyOrder =
        DonHang.builder()
            .id(1002L)
            .maDonHang("ORD-LEGACY")
            .ngayTao(LocalDateTime.of(2026, 10, 1, 9, 0))
            .ngayHoanThanh(null)
            .build();

    when(returnOrderRepository.findEligibleOrders(
            any(), any(), any(), any(), any(), any(), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(legacyOrder), PageRequest.of(0, 20), 1));
    when(orderLineRepository.findOrderIdsRequiringFullReturn(List.of(1002L), LoaiSanPham.BO_PC))
        .thenReturn(List.of());

    var item = service.getEligibleOrders(null, 0, 20).getItems().getFirst();

    assertNull(item.getNgayHoanThanh());
    assertFalse(item.isChiDuocTraToanBo());
  }

  @Test
  void emptySearchReturnsAnEmptyPageWithoutLoadingOrderLines() {
    when(returnOrderRepository.findEligibleOrders(
            any(), any(), any(), any(), any(), any(), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

    var response = service.getEligibleOrders("missing", 0, 20);

    assertTrue(response.getItems().isEmpty());
    assertEquals(0, response.getPagination().getTotalElements());
    assertEquals(0, response.getPagination().getTotalPages());
    verifyNoInteractions(orderLineRepository);
  }

  @Test
  void rejectsInvalidPaginationBeforeQuerying() {
    assertThrows(AppException.class, () -> service.getEligibleOrders(null, -1, 20));
    assertThrows(AppException.class, () -> service.getEligibleOrders(null, 0, 101));

    verifyNoInteractions(returnOrderRepository, orderLineRepository);
  }
}
