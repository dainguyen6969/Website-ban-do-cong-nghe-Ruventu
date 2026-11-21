package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.PcBuilderPreviewResponse;
import com.example.dantruventu.Enum.PcBuilderCategory;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

@Component
public class PcBuilderExcelExporter {
  private static final String[] HEADERS = {
    "STT",
    "Hạng mục",
    "Tên sản phẩm",
    "Phiên bản",
    "Số lượng",
    "Đơn giá (đ)",
    "Thành tiền (đ)",
    "Bảo hành (tháng)",
    "Tồn có thể bán"
  };

  public byte[] export(PcBuilderPreviewResponse preview, Map<Long, Integer> warranties)
      throws IOException {
    try (var workbook = new XSSFWorkbook();
        var output = new ByteArrayOutputStream()) {
      Sheet sheet = workbook.createSheet("Cấu hình PC");
      Font bold = workbook.createFont();
      bold.setBold(true);
      CellStyle heading = workbook.createCellStyle();
      heading.setFont(bold);
      heading.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
      heading.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      CellStyle money = workbook.createCellStyle();
      money.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));
      CellStyle wrapped = workbook.createCellStyle();
      wrapped.setWrapText(true);

      Row title = sheet.createRow(0);
      text(title, 0, "RUVENTU - CẤU HÌNH PC THAM KHẢO").setCellStyle(heading);
      sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, HEADERS.length - 1));
      text(
          sheet.createRow(1),
          0,
          "Thời điểm tính: "
              + preview
                  .thoiDiemTinh()
                  .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss XXX")));
      text(
          sheet.createRow(2),
          0,
          "Đã chọn "
              + preview.soHangMucDaChon()
              + "/"
              + preview.tongHangMuc()
              + " hạng mục; tổng số lượng: "
              + preview.tongSoLuong());
      text(
          sheet.createRow(3),
          0,
          "Đối chiếu AMD/Intel trong tên CPU với thông số CPU hỗ trợ của MAIN; không kết luận toàn bộ máy tương thích.");
      text(
          sheet.createRow(4),
          0,
          "Giá tham khảo; thuế, khuyến mại cuối cùng và phí giao hàng xác định khi chốt đơn.");
      text(
          sheet.createRow(5),
          0,
          "Bảo hành là số tháng mặc định hiện tại của từng linh kiện; chưa kích hoạt hạn thiết bị.");
      Row header = sheet.createRow(7);
      for (int i = 0; i < HEADERS.length; i++) text(header, i, HEADERS[i]).setCellStyle(heading);
      int index = 8;
      int sequence = 1;
      for (var item : preview.items()) {
        Row row = sheet.createRow(index++);
        number(row, 0, sequence++);
        // Giữ từng ô SSD/màn hình độc lập; gộp nhu cầu chỉ phục vụ kiểm tra tồn.
        text(row, 1, PcBuilderCategory.valueOf(item.maHangMuc()).getDisplayName());
        text(row, 2, item.tenSanPham());
        text(row, 3, item.tenPhienBan());
        number(row, 4, item.soLuong());
        number(row, 5, item.donGia().doubleValue()).setCellStyle(money);
        number(row, 6, item.thanhTien().doubleValue()).setCellStyle(money);
        number(row, 7, warranties.get(item.phienBanId()));
        number(row, 8, item.tonCoTheBan());
      }
      Row total = sheet.createRow(index++);
      text(total, 5, "Tổng tạm tính").setCellStyle(heading);
      number(total, 6, preview.tongTamTinh().doubleValue()).setCellStyle(money);
      text(sheet.createRow(++index), 0, "Kiểm tra CPU–MAIN: " + compatibility(preview));
      text(sheet.createRow(++index), 0, "CẢNH BÁO / LƯU Ý").setCellStyle(heading);
      if (preview.loi().isEmpty()) {
        text(
            sheet.createRow(++index),
            0,
            "Chưa phát hiện cảnh báo về tồn và CPU hỗ trợ trong cấu hình đã chọn.");
      } else {
        for (String warning : preview.loi()) {
          text(sheet.createRow(++index), 0, warning).setCellStyle(wrapped);
          sheet.addMergedRegion(new CellRangeAddress(index, index, 0, HEADERS.length - 1));
          sheet.getRow(index).setHeightInPoints(32);
        }
      }
      for (var need : preview.kiemTraTonKho().nhuCau()) {
        if (need.soLuongYeuCau() > need.tonCoTheBan())
          text(
              sheet.createRow(++index),
              0,
              "Phiên bản "
                  + need.phienBanId()
                  + ": tổng nhu cầu "
                  + need.soLuongYeuCau()
                  + ", tồn có thể bán "
                  + need.tonCoTheBan()
                  + ".");
      }
      int[] widths = {6, 25, 48, 25, 12, 20, 22, 21, 21};
      for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i] * 256);
      sheet.createFreezePane(0, 8);
      sheet.setAutoFilter(
          new CellRangeAddress(7, 7 + preview.items().size(), 0, HEADERS.length - 1));
      sheet.getPrintSetup().setLandscape(true);
      sheet.setFitToPage(true);
      sheet.getPrintSetup().setFitWidth((short) 1);
      sheet.getPrintSetup().setFitHeight((short) 0);
      workbook.write(output);
      return output.toByteArray();
    }
  }

  private String compatibility(PcBuilderPreviewResponse preview) {
    return switch (preview.kiemTraCpuMain().trangThai()) {
      case "KHOP_CPU_HO_TRO" -> "Hãng CPU khớp thông số CPU hỗ trợ của MAIN";
      case "KHONG_KHOP_CPU_HO_TRO" -> "Hãng CPU không khớp thông số CPU hỗ trợ của MAIN";
      case "CHUA_DU_DU_LIEU" -> "Thiếu tên CPU có AMD/Intel hoặc thông số CPU hỗ trợ của MAIN";
      default -> "Chưa chọn đủ CPU và MAIN để đối chiếu";
    };
  }

  private Cell text(Row row, int column, String value) {
    Cell cell = row.createCell(column, CellType.STRING);
    // Luôn ghi chuỗi; tên bắt đầu bằng =, +, -, @ không trở thành công thức Excel.
    cell.setCellValue(value == null ? "" : value);
    return cell;
  }

  private Cell number(Row row, int column, double value) {
    Cell cell = row.createCell(column, CellType.NUMERIC);
    cell.setCellValue(value);
    return cell;
  }
}
