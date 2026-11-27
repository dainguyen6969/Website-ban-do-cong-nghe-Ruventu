package com.example.dantruventu.Services.printing;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminPrintService {
  public enum Kind {
    GOODS_RECEIPT,
    WAREHOUSE_ISSUE,
    RECEIPT,
    DISBURSEMENT,
    DELIVERY,
    SALES_SLIP,
    SALES_INVOICE
  }

  private final PurchaseReceiptPrintSource purchaseReceiptSource;
  private final OrderIssuePrintSource orderIssueSource;
  private final CashVoucherPrintSource cashVoucherSource;
  private final DeliveryPrintSource deliverySource;
  private final SalesSlipPrintSource salesSlipSource;
  private final SalesInvoicePrintSource salesInvoiceSource;
  private final VoucherPdfRenderer renderer;

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public byte[] render(Kind kind, Long id) {
    try {
      PrintDocument document =
          switch (kind) {
            case GOODS_RECEIPT -> purchaseReceiptSource.load(id);
            case WAREHOUSE_ISSUE -> orderIssueSource.load(id);
            case RECEIPT -> cashVoucherSource.load(id, LoaiPhieuThuChi.THU);
            case DISBURSEMENT -> cashVoucherSource.load(id, LoaiPhieuThuChi.CHI);
            case DELIVERY -> deliverySource.load(id);
            case SALES_SLIP -> salesSlipSource.load(id);
            case SALES_INVOICE -> salesInvoiceSource.load(id);
          };
      return renderer.render(document);
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không tạo được PDF loại {} cho chứng từ {}", kind, id, exception);
      throw new AppException(
          kind == Kind.SALES_INVOICE
              ? ErrorCode.PRINT_SALES_INVOICE_PDF_FAILED
              : ErrorCode.PRINT_PDF_FAILED);
    }
  }
}
