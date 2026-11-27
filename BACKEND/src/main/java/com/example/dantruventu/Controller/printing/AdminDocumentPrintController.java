package com.example.dantruventu.Controller.printing;

import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.printing.AdminPrintService;
import com.example.dantruventu.Services.printing.AdminPrintService.Kind;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDocumentPrintController {
  private final AdminPrintService printing;

  @GetMapping("/purchase-orders/{id}/goods-receipt/pdf")
  public ResponseEntity<byte[]> goodsReceipt(
      @PathVariable("id") String id, @RequestParam MultiValueMap<String, String> query) {
    return print(Kind.GOODS_RECEIPT, id, query);
  }

  @GetMapping("/orders/{id}/warehouse-issue/pdf")
  public ResponseEntity<byte[]> warehouseIssue(
      @PathVariable("id") String id, @RequestParam MultiValueMap<String, String> query) {
    return print(Kind.WAREHOUSE_ISSUE, id, query);
  }

  @GetMapping("/orders/{id}/sales-slip/pdf")
  public ResponseEntity<byte[]> salesSlip(
      @PathVariable("id") String id, @RequestParam MultiValueMap<String, String> query) {
    return print(Kind.SALES_SLIP, id, query);
  }

  @GetMapping("/sales-invoices/{invoiceId}/pdf")
  public ResponseEntity<byte[]> salesInvoice(
      @PathVariable("invoiceId") String invoiceId,
      @RequestParam MultiValueMap<String, String> query) {
    return print(Kind.SALES_INVOICE, invoiceId, query);
  }

  @GetMapping("/receipts/{id}/pdf")
  public ResponseEntity<byte[]> receipt(
      @PathVariable("id") String id, @RequestParam MultiValueMap<String, String> query) {
    return print(Kind.RECEIPT, id, query);
  }

  @GetMapping("/disbursements/{id}/pdf")
  public ResponseEntity<byte[]> disbursement(
      @PathVariable("id") String id, @RequestParam MultiValueMap<String, String> query) {
    return print(Kind.DISBURSEMENT, id, query);
  }

  @GetMapping("/deliveries/{id}/pdf")
  public ResponseEntity<byte[]> delivery(
      @PathVariable("id") String id, @RequestParam MultiValueMap<String, String> query) {
    return print(Kind.DELIVERY, id, query);
  }

  private ResponseEntity<byte[]> print(
      Kind kind, String rawId, MultiValueMap<String, String> query) {
    Long id = parseId(rawId);
    boolean download = parseDownload(query);
    byte[] content = printing.render(kind, id);
    String filename = kind.name().toLowerCase(Locale.ROOT).replace('_', '-') + "-" + id + ".pdf";
    var disposition = download ? ContentDisposition.attachment() : ContentDisposition.inline();
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.filename(filename).build().toString())
        .cacheControl(CacheControl.noStore())
        .contentLength(content.length)
        .body(content);
  }

  private static Long parseId(String value) {
    if (value == null || !value.matches("[0-9]+")) throw invalid();
    try {
      long id = Long.parseLong(value);
      if (id <= 0) throw invalid();
      return id;
    } catch (NumberFormatException exception) {
      throw invalid();
    }
  }

  private static boolean parseDownload(MultiValueMap<String, String> query) {
    if (query.keySet().stream().anyMatch(key -> !"download".equals(key))) throw invalid();
    var values = query.get("download");
    if (values == null) return false;
    if (values.size() != 1) throw invalid();
    return switch (values.get(0)) {
      case "true" -> true;
      case "false" -> false;
      default -> throw invalid();
    };
  }

  private static AppException invalid() {
    return new AppException(ErrorCode.INVALID_PRINT_REQUEST);
  }
}
