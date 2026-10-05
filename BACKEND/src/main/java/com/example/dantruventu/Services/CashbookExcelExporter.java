package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.cashbook.CashbookFilterResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookSummaryResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookTransactionResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

@Component
public class CashbookExcelExporter {

  private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final DateTimeFormatter DATE_TIME_FORMAT =
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
  private static final String[] TABLE_HEADERS = {
    "STT",
    "Loại phiếu",
    "Ngày ghi nhận",
    "Mã phiếu",
    "Người nộp/nhận",
    "Phương thức thanh toán",
    "Tiền thu",
    "Tiền chi",
    "Mô tả"
  };

  public byte[] export(
      CashbookFilterResponse filter,
      CashbookSummaryResponse summary,
      List<CashbookTransactionResponse> transactions)
      throws IOException {
    try (XSSFWorkbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      Sheet sheet = workbook.createSheet("Sổ quỹ");
      Styles styles = createStyles(workbook);

      int rowIndex = 0;
      Row titleRow = sheet.createRow(rowIndex++);
      Cell titleCell = titleRow.createCell(0);
      titleCell.setCellValue("SỔ QUỸ");
      titleCell.setCellStyle(styles.title());
      sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, TABLE_HEADERS.length - 1));

      rowIndex =
          addInfoRow(
              sheet,
              rowIndex,
              "Từ ngày",
              filter.getTuNgay() == null ? "Tất cả" : DATE_FORMAT.format(filter.getTuNgay()),
              styles);
      rowIndex =
          addInfoRow(
              sheet,
              rowIndex,
              "Đến ngày",
              filter.getDenNgay() == null ? "Tất cả" : DATE_FORMAT.format(filter.getDenNgay()),
              styles);
      rowIndex = addInfoRow(sheet, rowIndex, "Từ khóa", display(filter.getKeyword()), styles);
      rowIndex = addInfoRow(sheet, rowIndex, "Loại phiếu", display(filter.getLoaiPhieu()), styles);
      rowIndex =
          addInfoRow(
              sheet,
              rowIndex,
              "Phương thức thanh toán",
              display(filter.getPhuongThucThanhToan()),
              styles);
      rowIndex =
          addInfoRow(
              sheet,
              rowIndex,
              "Nhóm người nộp/nhận",
              display(filter.getNhomNguoiNopNhan()),
              styles);
      rowIndex =
          addInfoRow(
              sheet, rowIndex, "Tên người nộp/nhận", display(filter.getTenNguoiNopNhan()), styles);
      rowIndex =
          addInfoRow(sheet, rowIndex, "Người tạo ID", display(filter.getNguoiTaoId()), styles);

      rowIndex++;
      rowIndex = addMoneyInfoRow(sheet, rowIndex, "Số dư đầu kỳ", summary.getSoDuDauKy(), styles);
      rowIndex = addMoneyInfoRow(sheet, rowIndex, "Tổng thu", summary.getTongThu(), styles);
      rowIndex = addMoneyInfoRow(sheet, rowIndex, "Tổng chi", summary.getTongChi(), styles);
      rowIndex = addMoneyInfoRow(sheet, rowIndex, "Tồn cuối kỳ", summary.getTonCuoiKy(), styles);

      rowIndex++;
      int tableHeaderRowIndex = rowIndex;
      Row headerRow = sheet.createRow(rowIndex++);
      for (int column = 0; column < TABLE_HEADERS.length; column++) {
        Cell cell = headerRow.createCell(column);
        cell.setCellValue(TABLE_HEADERS[column]);
        cell.setCellStyle(styles.tableHeader());
      }

      long sequence = 1;
      for (CashbookTransactionResponse transaction : transactions) {
        Row row = sheet.createRow(rowIndex++);
        createNumericCell(row, 0, sequence++, styles.integer());
        createTextCell(row, 1, display(transaction.getLoaiPhieu()), styles.body());
        createTextCell(
            row,
            2,
            transaction.getNgayGhiNhan() == null
                ? ""
                : DATE_TIME_FORMAT.format(transaction.getNgayGhiNhan()),
            styles.body());
        createTextCell(row, 3, transaction.getMaPhieu(), styles.body());
        createTextCell(row, 4, transaction.getTenNguoiNopNhan(), styles.body());
        createTextCell(row, 5, transaction.getPhuongThucThanhToan(), styles.body());
        createMoneyCell(row, 6, transaction.getTienThu(), styles.money());
        createMoneyCell(row, 7, transaction.getTienChi(), styles.money());
        createTextCell(row, 8, transaction.getMoTa(), styles.wrappedBody());
      }

      sheet.createFreezePane(0, tableHeaderRowIndex + 1);
      for (int column = 0; column < TABLE_HEADERS.length; column++) {
        sheet.autoSizeColumn(column);
        int maxWidth = column == 8 ? 16_000 : 10_000;
        sheet.setColumnWidth(column, Math.min(sheet.getColumnWidth(column) + 512, maxWidth));
      }

      workbook.write(output);
      byte[] bytes = output.toByteArray();
      if (bytes.length == 0) {
        throw new IOException("Workbook rỗng");
      }
      return bytes;
    }
  }

  private Styles createStyles(Workbook workbook) {
    Font titleFont = workbook.createFont();
    titleFont.setBold(true);
    titleFont.setFontHeightInPoints((short) 16);
    CellStyle title = workbook.createCellStyle();
    title.setFont(titleFont);
    title.setAlignment(HorizontalAlignment.CENTER);

    Font boldFont = workbook.createFont();
    boldFont.setBold(true);
    CellStyle label = workbook.createCellStyle();
    label.setFont(boldFont);

    Font headerFont = workbook.createFont();
    headerFont.setBold(true);
    headerFont.setColor(IndexedColors.WHITE.getIndex());
    CellStyle tableHeader = workbook.createCellStyle();
    tableHeader.setFont(headerFont);
    tableHeader.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
    tableHeader.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    tableHeader.setAlignment(HorizontalAlignment.CENTER);
    applyBorders(tableHeader);

    CellStyle body = workbook.createCellStyle();
    applyBorders(body);

    CellStyle wrappedBody = workbook.createCellStyle();
    wrappedBody.cloneStyleFrom(body);
    wrappedBody.setWrapText(true);

    CellStyle integer = workbook.createCellStyle();
    integer.cloneStyleFrom(body);
    integer.setDataFormat(workbook.createDataFormat().getFormat("0"));

    CellStyle money = workbook.createCellStyle();
    money.cloneStyleFrom(body);
    money.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));

    return new Styles(title, label, tableHeader, body, wrappedBody, integer, money);
  }

  private int addInfoRow(Sheet sheet, int rowIndex, String label, String value, Styles styles) {
    Row row = sheet.createRow(rowIndex);
    createTextCell(row, 0, label, styles.label());
    createTextCell(row, 1, value, styles.body());
    return rowIndex + 1;
  }

  private int addMoneyInfoRow(
      Sheet sheet, int rowIndex, String label, BigDecimal value, Styles styles) {
    Row row = sheet.createRow(rowIndex);
    createTextCell(row, 0, label, styles.label());
    createMoneyCell(row, 1, value, styles.money());
    return rowIndex + 1;
  }

  private void createTextCell(Row row, int column, String value, CellStyle style) {
    Cell cell = row.createCell(column);
    cell.setCellValue(value == null ? "" : value);
    cell.setCellStyle(style);
  }

  private void createNumericCell(Row row, int column, long value, CellStyle style) {
    Cell cell = row.createCell(column);
    cell.setCellValue(value);
    cell.setCellStyle(style);
  }

  private void createMoneyCell(Row row, int column, BigDecimal value, CellStyle style) {
    Cell cell = row.createCell(column);
    cell.setCellValue(value == null ? 0D : value.doubleValue());
    cell.setCellStyle(style);
  }

  private void applyBorders(CellStyle style) {
    style.setBorderTop(BorderStyle.THIN);
    style.setBorderRight(BorderStyle.THIN);
    style.setBorderBottom(BorderStyle.THIN);
    style.setBorderLeft(BorderStyle.THIN);
  }

  private String display(Object value) {
    return value == null ? "Tất cả" : value.toString();
  }

  private record Styles(
      CellStyle title,
      CellStyle label,
      CellStyle tableHeader,
      CellStyle body,
      CellStyle wrappedBody,
      CellStyle integer,
      CellStyle money) {}
}
