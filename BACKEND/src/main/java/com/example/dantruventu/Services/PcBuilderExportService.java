package com.example.dantruventu.Services;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.DTO.Request.CartPcBuildRequest;
import com.example.dantruventu.DTO.Request.PcBuilderPreviewRequest;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.CatalogException;
import com.example.dantruventu.Error.ErrorCode;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PcBuilderExportService {

  private final PcBuilderService pcBuilder;

  public record Exported(String filename, byte[] content) {}

  public Exported export(CartPcBuildRequest request) {
    if (request == null || request.items() == null) {
      throw invalid("Thiếu items");
    }

    for (var item : request.items()) {
      if (item == null) throw invalid("items không được chứa null");
    }

    var previewRequest =
        new PcBuilderPreviewRequest(
            request.items().stream()
                .map(
                    item ->
                        new PcBuilderPreviewRequest.Item(
                            item.maHangMuc(), item.phienBanId(), item.soLuong()))
                .toList());

    var preview = pcBuilder.preview(previewRequest);

    if (!preview.coTheXuatExcel() || preview.items().isEmpty()) {
      throw invalid("Cấu hình đang trống hoặc không thể xuất");
    }

    for (int index = 0; index < request.items().size(); index++) {
      Object raw = request.items().get(index).donGiaXacNhan();

      if (!(raw instanceof Number number)) {
        throw invalid("don_gia_xac_nhan phải là số");
      }

      BigDecimal confirmed = inputMoney(new BigDecimal(number.toString()));

      if (confirmed.compareTo(preview.items().get(index).donGia()) != 0) {
        throw CatalogException.conflict(
            "items[" + index + "].don_gia_xac_nhan",
            "PRICE_CHANGED",
            "Giá linh kiện đã thay đổi, cần xác nhận lại");
      }
    }

    try (var workbook = new XSSFWorkbook();
        var output = new ByteArrayOutputStream()) {

      var sheet = workbook.createSheet("Cau hinh PC");

      var headerStyle = workbook.createCellStyle();
      var font = workbook.createFont();
      font.setBold(true);
      font.setColor(IndexedColors.WHITE.getIndex());
      headerStyle.setFont(font);
      headerStyle.setFillForegroundColor(IndexedColors.BLACK.getIndex());
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

      var moneyStyle = workbook.createCellStyle();
      moneyStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));

      var textStyle = workbook.createCellStyle();
      textStyle.setWrapText(true);
      textStyle.setVerticalAlignment(VerticalAlignment.TOP);

      String[] headers = {
        "Hạng mục",
        "Phiên bản ID",
        "Sản phẩm",
        "Tên phiên bản",
        "Thuộc tính",
        "Bảo hành (tháng)",
        "Số lượng",
        "Đơn giá đã gồm VAT",
        "Thành tiền",
        "Tồn khả bán"
      };

      var header = sheet.createRow(0);

      for (int col = 0; col < headers.length; col++) {
        var cell = header.createCell(col, CellType.STRING);
        cell.setCellValue(headers[col]);
        cell.setCellStyle(headerStyle);
      }

      int rowNumber = 1;

      for (var item : preview.items()) {
        var row = sheet.createRow(rowNumber++);

        text(row, 0, item.maHangMuc(), textStyle);
        text(row, 1, String.valueOf(item.phienBanId()), textStyle);
        text(row, 2, item.tenSanPham(), textStyle);
        text(row, 3, item.tenPhienBan(), textStyle);

        String attributes =
            item.thuocTinhPhienBan() == null
                ? ""
                : item.thuocTinhPhienBan().stream()
                    .map(a -> a.tenThuocTinh() + ": " + a.giaTri())
                    .collect(Collectors.joining("\n"));

        text(row, 4, attributes, textStyle);
        text(
            row,
            5,
            item.baoHanhThang() == null ? "Chưa xác định" : String.valueOf(item.baoHanhThang()),
            textStyle);

        row.createCell(6).setCellValue(item.soLuong());

        var price = row.createCell(7);
        price.setCellValue(item.donGia().doubleValue());
        price.setCellStyle(moneyStyle);

        var amount = row.createCell(8);
        amount.setCellValue(item.thanhTien().doubleValue());
        amount.setCellStyle(moneyStyle);

        row.createCell(9).setCellValue(item.tonCoTheBan());
      }

      var totalRow = sheet.createRow(rowNumber++);
      text(totalRow, 7, "TỔNG TẠM TÍNH", textStyle);
      var totalCell = totalRow.createCell(8);
      totalCell.setCellValue(money(preview.tongTamTinh()).doubleValue());
      totalCell.setCellStyle(moneyStyle);

      List<String> warnings = new ArrayList<>(preview.loi());

      if (!"KHOP_SOCKET".equals(preview.kiemTraCpuMain().trangThai())) {
        warnings.add(
            "Chưa xác nhận CPU và Mainboard khớp socket. "
                + "Phạm vi kiểm tra chỉ là socket CPU/Mainboard.");
      }

      warnings.add(
          "Đây là cấu hình tham khảo. Giá đã gồm VAT; "
              + "ưu đãi và phí giao hàng xác nhận tại bước đặt hàng.");
      warnings.add(
          "Số tháng bảo hành là chính sách hiện tại của từng linh kiện, "
              + "không phải hạn bảo hành của thiết bị đã bán.");

      for (String warning : new LinkedHashSet<>(warnings)) {
        text(sheet.createRow(rowNumber++), 0, warning, textStyle);
      }

      int[] widths = {4500, 4000, 9500, 8000, 9000, 4500, 3500, 5500, 5500, 4500};

      for (int col = 0; col < widths.length; col++) {
        sheet.setColumnWidth(col, widths[col]);
      }

      sheet.createFreezePane(0, 1);
      workbook.write(output);

      String time =
          OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))
              .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

      return new Exported("Ruventu_CauHinhPC_" + time + ".xlsx", output.toByteArray());

    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR, "Không tạo được file xuất từ dữ liệu nguồn");
    }
  }

  private void text(Row row, int index, String value, CellStyle style) {

    // Giá trị được ghi dưới dạng text, kể cả khi bắt đầu bằng "=".
    var cell = row.createCell(index, CellType.STRING);
    cell.setCellValue(value == null ? "" : value);
    cell.setCellStyle(style);
  }
}
