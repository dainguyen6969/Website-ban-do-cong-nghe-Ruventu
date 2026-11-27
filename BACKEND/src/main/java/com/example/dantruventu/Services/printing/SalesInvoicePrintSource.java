package com.example.dantruventu.Services.printing;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class SalesInvoicePrintSource {
  private final DonHangRepository orders;
  private final SalesSlipPrintSource salesSlip;
  private final ChiTietDonHangRepository lines;

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public PrintDocument load(Long orderId) {
    if (orderId == null || orderId <= 0) throw new AppException(ErrorCode.INVALID_PRINT_REQUEST);
    DonHang order =
        orders
            .findById(orderId)
            .orElseThrow(() -> new AppException(ErrorCode.PRINT_SALES_INVOICE_NOT_FOUND));
    if (order.getTrangThaiDonHang() == null) throw conflict();
    if (order.getTrangThaiDonHang() != TrangThaiDonHang.HOAN_THANH)
      throw new AppException(ErrorCode.PRINT_SALES_INVOICE_NOT_READY);

    PrintDocument original = salesSlip.load(orderId);
    if (original.cancelled()
        || original.sections().isEmpty()
        || order.getMaDonHang() == null
        || !order.getMaDonHang().equals(original.number())) throw conflict();
    PrintDocument.Section first = original.sections().get(0);
    List<List<String>> headerRows = new ArrayList<>();
    boolean replacedSource = false;
    for (List<String> row : first.rows()) {
      if (!row.isEmpty() && "Loại bản in".equals(row.get(0))) {
        headerRows.add(
            List.of("Nguồn bản in", "Bản in từ đơn hàng đã hoàn tất (ID " + orderId + ")"));
        replacedSource = true;
      } else headerRows.add(row);
    }
    if (!replacedSource) throw conflict();
    List<PrintDocument.Section> sections = new ArrayList<>(original.sections());
    sections.set(
        0,
        new PrintDocument.Section(
            "THÔNG TIN HÓA ĐƠN BÁN HÀNG", first.headers(), List.copyOf(headerRows)));
    sections = addWarrantyColumn(orderId, sections);
    // Chưa có hồ sơ phát hành riêng: giữ mã đơn, không tự tạo số hoặc trạng thái hóa đơn.
    return new PrintDocument(
        "HÓA ĐƠN BÁN HÀNG",
        order.getMaDonHang(),
        List.copyOf(sections),
        List.of(),
        original.signatories(),
        false);
  }

  private List<PrintDocument.Section> addWarrantyColumn(
      Long orderId, List<PrintDocument.Section> sections) {
    Map<String, String> warrantyByLine = new LinkedHashMap<>();
    for (var line : lines.findByDonHang_IdOrderByIdAsc(orderId)) {
      if (line.getId() == null
          || line.getDonHang() == null
          || !orderId.equals(line.getDonHang().getId())
          || line.getPhienBan() == null
          || line.getPhienBan().getSanPham() == null) throw conflict();
      Integer months = line.getPhienBan().getSanPham().getThoiHanBaoHanhThang();
      if (months != null && months < 0) throw conflict();
      String term =
          months == null ? "Chưa cung cấp" : months == 0 ? "Không bảo hành" : months + " tháng";
      if (warrantyByLine.putIfAbsent(String.valueOf(line.getId()), term) != null) throw conflict();
    }
    if (warrantyByLine.isEmpty()) throw conflict();
    List<PrintDocument.Section> result = new ArrayList<>();
    boolean found = false;
    for (PrintDocument.Section section : sections) {
      if (!"CHI TIẾT HÀNG TRÊN ĐƠN GỐC".equals(section.title())) {
        result.add(section);
        continue;
      }
      if (found || section.rows().size() != warrantyByLine.size()) throw conflict();
      found = true;
      List<String> headers = new ArrayList<>(section.headers());
      headers.add("Thời hạn bảo hành\n(chính sách hiện tại)");
      List<List<String>> rows = new ArrayList<>();
      for (List<String> row : section.rows()) {
        if (row.isEmpty()
            || row.size() != section.headers().size()
            || !warrantyByLine.containsKey(row.getFirst())) throw conflict();
        List<String> cells = new ArrayList<>(row);
        cells.add(warrantyByLine.remove(row.getFirst()));
        rows.add(List.copyOf(cells));
      }
      if (!warrantyByLine.isEmpty()) throw conflict();
      result.add(
          new PrintDocument.Section(section.title(), List.copyOf(headers), List.copyOf(rows)));
    }
    if (!found) throw conflict();
    return List.copyOf(result);
  }

  private AppException conflict() {
    return new AppException(ErrorCode.PRINT_SALES_SLIP_CONFLICT);
  }
}
