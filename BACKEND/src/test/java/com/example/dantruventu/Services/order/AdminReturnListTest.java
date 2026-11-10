package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
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
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class AdminReturnListTest {

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
  void listsGuestWithContactSnapshotAndVietnamOffset() {
    when(salesProperties.zone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));

    DonHang order =
        DonHang.builder()
            .id(1001L)
            .maDonHang("ORD-001")
            .tenNguoiNhan("Tên cũ trên đơn")
            .sdtNguoiNhan("0900000000")
            .build();
    PhieuTraHang returnSlip =
        PhieuTraHang.builder()
            .id(300L)
            .maTraHang("TH000300")
            .donHang(order)
            .khachHang(null)
            .tenNguoiLienHe("Nguyễn Văn An")
            .sdtNguoiLienHe("0912345678")
            .tongTienHoan(new BigDecimal("1045000"))
            .lyDoTra("Không còn nhu cầu")
            .trangThaiTraHang(TrangThaiTraHang.CHO_TRA_KHACH)
            .ngayTao(LocalDateTime.of(2026, 10, 12, 11, 0))
            .build();

    when(returnRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(returnSlip), PageRequest.of(0, 20), 1));

    var response =
        service.getReturns(
            "An",
            TrangThaiTraHang.CHO_TRA_KHACH,
            "2026-10-01T00:00:00+07:00",
            "2026-10-13T00:00:00+07:00",
            0,
            20);

    assertEquals(1, response.getItems().size());
    var item = response.getItems().getFirst();
    assertNull(item.getKhachHangId());
    assertEquals("Nguyễn Văn An", item.getTenNguoiLienHe());
    assertEquals("0912345678", item.getSdtNguoiLienHe());
    assertEquals("2026-10-12T11:00+07:00", item.getNgayTao().toString());

    ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
    verify(returnRepository).findAll(any(Specification.class), pageable.capture());
    assertEquals(0, pageable.getValue().getPageNumber());
    assertEquals(20, pageable.getValue().getPageSize());
    assertEquals(
        "DESC", pageable.getValue().getSort().getOrderFor("ngayTao").getDirection().name());
    assertEquals("DESC", pageable.getValue().getSort().getOrderFor("id").getDirection().name());
  }

  @Test
  void rejectsAnEmptyOrReversedHalfOpenDateRange() {
    assertThrows(
        AppException.class,
        () ->
            service.getReturns(
                null, null, "2026-10-13T00:00:00+07:00", "2026-10-13T00:00:00+07:00", 0, 20));

    assertThrows(
        AppException.class,
        () ->
            service.getReturns(
                null, null, "2026-10-14T00:00:00+07:00", "2026-10-13T00:00:00+07:00", 0, 20));

    verifyNoInteractions(returnRepository);
  }

  @Test
  @SuppressWarnings("deprecation")
  void exposesLegacyRefundedRowsAsCompleted() {
    when(salesProperties.zone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));

    DonHang order = DonHang.builder().id(1001L).maDonHang("ORD-001").build();
    PhieuTraHang legacyReturnSlip =
        PhieuTraHang.builder()
            .id(300L)
            .maTraHang("TH000300")
            .donHang(order)
            .tongTienHoan(new BigDecimal("1045000"))
            .lyDoTra("Không còn nhu cầu")
            .trangThaiTraHang(TrangThaiTraHang.DA_HOAN_TIEN)
            .ngayTao(LocalDateTime.of(2026, 10, 12, 11, 0))
            .build();

    when(returnRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(legacyReturnSlip), PageRequest.of(0, 20), 1));

    var response = service.getReturns(null, TrangThaiTraHang.HOAN_TAT, null, null, 0, 20);

    assertEquals(TrangThaiTraHang.HOAN_TAT, response.getItems().getFirst().getTrangThaiTraHang());
  }

  @Test
  void rejectsDateWithoutOffset() {
    assertThrows(
        AppException.class,
        () -> service.getReturns(null, null, "2026-10-01T00:00:00", null, 0, 20));

    verifyNoInteractions(returnRepository);
  }
}
