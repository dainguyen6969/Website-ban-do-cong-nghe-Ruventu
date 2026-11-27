package com.example.dantruventu.Services.printing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AdminPrintServiceTest {
  private CashVoucherPrintSource cash;
  private VoucherPdfRenderer renderer;
  private SalesInvoicePrintSource invoices;
  private AdminPrintService service;
  private final PrintDocument voucher =
      new PrintDocument("PHIẾU THU", "PT-1", List.of(), List.of(), List.of(), false);

  @BeforeEach
  void setup() {
    cash = mock(CashVoucherPrintSource.class);
    renderer = mock(VoucherPdfRenderer.class);
    invoices = mock(SalesInvoicePrintSource.class);
    service =
        new AdminPrintService(
            mock(PurchaseReceiptPrintSource.class),
            mock(OrderIssuePrintSource.class),
            cash,
            mock(DeliveryPrintSource.class),
            mock(SalesSlipPrintSource.class),
            invoices,
            renderer);
  }

  @Test
  void rendererFailureBecomesPdfErrorRatherThanReturningPartialBytes() throws Exception {
    when(cash.load(1L, LoaiPhieuThuChi.THU)).thenReturn(voucher);
    when(renderer.render(voucher)).thenThrow(new IOException("Giả lập lỗi tạo PDF"));
    AppException exception =
        assertThrows(AppException.class, () -> service.render(AdminPrintService.Kind.RECEIPT, 1L));
    assertEquals(ErrorCode.PRINT_PDF_FAILED, exception.getErrorCode());
  }

  @Test
  void dataReadFailureIsNotReplacedWithEmptyPdf() {
    when(cash.load(1L, LoaiPhieuThuChi.THU))
        .thenThrow(new IllegalStateException("Giả lập lỗi truy vấn"));
    assertEquals(
        ErrorCode.PRINT_PDF_FAILED,
        assertThrows(AppException.class, () -> service.render(AdminPrintService.Kind.RECEIPT, 1L))
            .getErrorCode());
    verifyNoInteractions(renderer);
  }

  @Test
  void businessErrorKeepsItsOriginalStatus() {
    when(cash.load(1L, LoaiPhieuThuChi.THU))
        .thenThrow(new AppException(ErrorCode.PRINT_RECORD_NOT_FOUND));
    assertEquals(
        ErrorCode.PRINT_RECORD_NOT_FOUND,
        assertThrows(AppException.class, () -> service.render(AdminPrintService.Kind.RECEIPT, 1L))
            .getErrorCode());
    verifyNoInteractions(renderer);
  }

  @Test
  void invoiceRendererFailureUsesTheInvoiceErrorContract() throws Exception {
    when(invoices.load(130L)).thenReturn(voucher);
    when(renderer.render(voucher)).thenThrow(new IOException("Giả lập lỗi tạo PDF hóa đơn"));
    assertEquals(
        ErrorCode.PRINT_SALES_INVOICE_PDF_FAILED,
        assertThrows(
                AppException.class,
                () -> service.render(AdminPrintService.Kind.SALES_INVOICE, 130L))
            .getErrorCode());
  }
}
