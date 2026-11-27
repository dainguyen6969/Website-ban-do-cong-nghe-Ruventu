package com.example.dantruventu.Services.printing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Entity.DonNhapHang;
import com.example.dantruventu.Entity.KhoHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.TheKho;
import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.warehouse.DonNhapHangRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PurchaseReceiptPrintSourceTest {
  @Mock private DonNhapHangRepository orders;
  @Mock private TheKhoRepository movements;
  private PurchaseReceiptPrintSource source;

  @BeforeEach
  void setUp() {
    source = new PurchaseReceiptPrintSource(orders, movements);
  }

  @Test
  void absentOrderReturnsNotFoundWithoutConsultingOtherOrdersMovements() {
    when(orders.findById(125L)).thenReturn(Optional.empty());

    var error = assertThrows(AppException.class, () -> source.load(125L));

    assertEquals(ErrorCode.PRINT_RECORD_NOT_FOUND, error.getErrorCode());
    verifyNoInteractions(movements);
  }

  @Test
  void approvedOrderWithoutReceiptCannotBePrintedAsReceived() {
    when(orders.findById(125L))
        .thenReturn(
            Optional.of(
                DonNhapHang.builder().id(125L).trangThaiNhap(TrangThaiNhapHang.DA_DUYET).build()));
    when(movements.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(125L, LoaiGiaoDichKho.NHAP_HANG))
        .thenReturn(List.of());

    var error = assertThrows(AppException.class, () -> source.load(125L));

    assertEquals(ErrorCode.PRINT_HISTORY_CONFLICT, error.getErrorCode());
    assertEquals("Đơn nhập hàng chưa có xác nhận nhập kho thành công", error.getMessage());
    verifyReadOnlyQueries();
  }

  @Test
  void creatorAndCreationTimeCannotReplaceMissingActualReceiverHistory() {
    when(orders.findById(125L))
        .thenReturn(
            Optional.of(
                DonNhapHang.builder()
                    .id(125L)
                    .nguoiTao(NguoiDung.builder().id(1L).hoTen("Người lập đơn").build())
                    .ngayTao(LocalDateTime.of(2026, 9, 14, 9, 0))
                    .trangThaiNhap(TrangThaiNhapHang.DA_NHAP_KHO)
                    .build()));
    when(movements.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(125L, LoaiGiaoDichKho.NHAP_HANG))
        .thenReturn(List.of(receipt()));

    var error = assertThrows(AppException.class, () -> source.load(125L));

    assertEquals(ErrorCode.PRINT_HISTORY_CONFLICT, error.getErrorCode());
    assertEquals(
        "Thiếu lịch sử người nhận và danh sách hàng, serial thực nhận để in phiếu nhập kho",
        error.getMessage());
    verifyReadOnlyQueries();
  }

  @Test
  void returnedOrderDoesNotSubtractReturnsOrUseCurrentInventoryToInventOriginalReceipt() {
    when(orders.findById(125L))
        .thenReturn(
            Optional.of(
                DonNhapHang.builder()
                    .id(125L)
                    .trangThaiNhap(TrangThaiNhapHang.HOAN_TRA_TOAN_BO)
                    .build()));
    when(movements.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(125L, LoaiGiaoDichKho.NHAP_HANG))
        .thenReturn(List.of(receipt()));

    var error = assertThrows(AppException.class, () -> source.load(125L));

    assertEquals(ErrorCode.PRINT_HISTORY_CONFLICT, error.getErrorCode());
    verifyReadOnlyQueries();
  }

  private TheKho receipt() {
    return TheKho.builder()
        .id(9L)
        .maChungTuGoc(125L)
        .loaiGiaoDich(LoaiGiaoDichKho.NHAP_HANG)
        .khoHang(KhoHang.builder().id(1L).tenKho("Kho chính").build())
        .soLuongThayDoi(5)
        .ngayTao(LocalDateTime.of(2026, 9, 15, 10, 0))
        .build();
  }

  private void verifyReadOnlyQueries() {
    verify(orders).findById(125L);
    verify(movements)
        .findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(125L, LoaiGiaoDichKho.NHAP_HANG);
    verifyNoMoreInteractions(orders, movements);
  }
}
