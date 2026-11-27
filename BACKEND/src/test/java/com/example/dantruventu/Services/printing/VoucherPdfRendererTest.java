package com.example.dantruventu.Services.printing;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.IntStream;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class VoucherPdfRendererTest {
  private final VoucherPdfRenderer renderer = new VoucherPdfRenderer();

  @ParameterizedTest
  @ValueSource(
      strings = {"PHIẾU NHẬP KHO", "PHIẾU XUẤT KHO", "PHIẾU THU", "PHIẾU CHI", "PHIẾU GIAO HÀNG"})
  void rendersVietnameseLogoTablesAndSignatures(String title) throws Exception {
    PrintDocument source =
        new PrintDocument(
            title,
            "RUVENTU-000125",
            List.of(
                new PrintDocument.Section(
                    "THÔNG TIN CHỨNG TỪ",
                    List.of(),
                    List.of(
                        List.of("Khách hàng", "Nguyễn Văn An"),
                            List.of("Địa chỉ", "Phường Thủ Đức, Thành phố Hồ Chí Minh"),
                        List.of("Số tiền", "2.090.000 VNĐ"),
                            List.of("Người thực hiện", "Trần Minh Quân"))),
                new PrintDocument.Section(
                    "HÀNG HÓA",
                    List.of("STT", "Sản phẩm / phiên bản", "Số lượng", "Serial"),
                    List.of(
                        List.of(
                            "1",
                            "Bộ nhớ trong DDR5 - Phiên bản chính hãng",
                            "2",
                            "RAM-SN-001\nRAM-SN-002")))),
            List.of(
                "Phiếu được in từ dữ liệu đã ghi nhận; in lại không làm thay đổi kho hoặc tiền."),
            List.of("KHÁCH HÀNG", "ĐẠI DIỆN CỬA HÀNG"),
            false);
    byte[] bytes = renderer.render(source);
    try (PDDocument pdf = Loader.loadPDF(bytes)) {
      saveQa(title.replace(' ', '-'), bytes, pdf);
      String text = new PDFTextStripper().getText(pdf);
      assertTrue(text.contains(title));
      assertTrue(text.contains("Nguyễn Văn An"));
      assertTrue(text.contains("Thành phố Hồ Chí Minh"));
      assertTrue(text.contains("RAM-SN-002"));
      assertTrue(text.contains("ĐẠI DIỆN CỬA HÀNG"));
      assertEquals(1, pdf.getNumberOfPages());
      assertTrue(pdf.getPage(0).getResources().getXObjectNames().iterator().hasNext());
    }
  }

  @Test
  void longRowsAndSerialListsContinueAcrossPagesWithoutLosingData() throws Exception {
    List<List<String>> rows =
        IntStream.rangeClosed(1, 90)
            .mapToObj(
                i ->
                    List.of(
                        Integer.toString(i),
                        "Linh kiện mẫu tiếng Việt " + i,
                        "SERIAL-" + i + "-" + "LONG".repeat(i == 20 ? 250 : 1)))
            .toList();
    PrintDocument source =
        new PrintDocument(
            "PHIẾU XUẤT KHO",
            "PX-LONG",
            List.of(
                new PrintDocument.Section(
                    "CHI TIẾT HÀNG", List.of("STT", "Sản phẩm", "Serial thực xuất"), rows)),
            List.of("DÒNG CUỐI CHỨNG TỪ"),
            List.of("NGƯỜI NHẬN", "THỦ KHO"),
            false);
    byte[] bytes = renderer.render(source);
    try (PDDocument pdf = Loader.loadPDF(bytes)) {
      String text = new PDFTextStripper().getText(pdf);
      assertTrue(pdf.getNumberOfPages() >= 4);
      assertTrue(text.replaceAll("\\s+", " ").contains("Linh kiện mẫu tiếng Việt 90"));
      assertTrue(text.contains("DÒNG CUỐI CHỨNG TỪ"));
      assertTrue(text.contains("Trang " + pdf.getNumberOfPages() + "/" + pdf.getNumberOfPages()));
      for (int page = 1; page <= pdf.getNumberOfPages(); page++) {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setStartPage(page);
        stripper.setEndPage(page);
        String pageText = stripper.getText(pdf);
        if (pageText.contains("SERIAL-")) assertTrue(pageText.contains("Serial thực xuất"));
      }
      saveQa("long-table", bytes, pdf);
    }
  }

  @Test
  void cancelledDocumentShowsWatermarkAndOriginalAmount() throws Exception {
    PrintDocument source =
        new PrintDocument(
            "PHIẾU CHI",
            "PC-HUY",
            List.of(
                new PrintDocument.Section(
                    "THÔNG TIN PHIẾU", List.of(), List.of(List.of("Số tiền gốc", "150.000 VNĐ")))),
            List.of("Phiếu đã hủy, không có giá trị chi tiền."),
            List.of("NGƯỜI LẬP PHIẾU", "THỦ QUỸ"),
            true);
    byte[] bytes = renderer.render(source);
    try (PDDocument pdf = Loader.loadPDF(bytes)) {
      String text = new PDFTextStripper().getText(pdf);
      assertTrue(text.contains("ĐÃ HỦY"));
      assertTrue(text.contains("150.000 VNĐ"));
      saveQa("cancelled", bytes, pdf);
    }
  }

  @Test
  void tableHeadingStaysWithFirstProductWhenTheWholeRowNeedsANewPage() throws Exception {
    List<List<String>> filler =
        IntStream.rangeClosed(1, 18)
            .mapToObj(i -> List.of("Thông tin " + i, "Dữ liệu đã lưu"))
            .toList();
    PrintDocument source =
        new PrintDocument(
            "HÓA ĐƠN BÁN HÀNG",
            "DH-130",
            List.of(
                new PrintDocument.Section("THÔNG TIN ĐƠN", List.of(), filler),
                new PrintDocument.Section(
                    "BẢNG BẢO HÀNH",
                    List.of(
                        "Dòng gốc",
                        "Sản phẩm",
                        "SL",
                        "Đơn giá",
                        "Tiền hàng",
                        "Loại dòng",
                        "Thời hạn bảo hành\n(chính sách hiện tại)"),
                    List.of(
                        List.of(
                            "130",
                            "Thiết bị kiểm tra\nPhiên bản tiêu chuẩn\nMã sản phẩm mẫu\nThông tin nhận dạng\nDòng cuối sản phẩm",
                            "1",
                            "1.200.000 đ",
                            "1.200.000 đ",
                            "Hàng bán",
                            "24 tháng")))),
            List.of(),
            List.of(),
            false);
    try (PDDocument pdf = Loader.loadPDF(renderer.render(source))) {
      boolean found = false;
      for (int page = 1; page <= pdf.getNumberOfPages(); page++) {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setStartPage(page);
        stripper.setEndPage(page);
        String text = stripper.getText(pdf);
        if (text.contains("BẢNG BẢO HÀNH")) {
          found = true;
          assertTrue(text.contains("Thiết bị kiểm tra"));
          assertTrue(text.contains("24 tháng"));
        }
      }
      assertTrue(found);
    }
  }

  @Test
  void normalizesDecomposedVietnameseAndNeutralizesControlCharacters() throws Exception {
    PrintDocument source =
        new PrintDocument(
            "PHIẾU THU",
            "PT-SAFE",
            List.of(
                new PrintDocument.Section(
                    "THÔNG TIN", List.of(), List.of(List.of("Tên", "Nguyễn\u0000 Văn An")))),
            List.of(),
            List.of(),
            false);
    try (PDDocument pdf = Loader.loadPDF(renderer.render(source))) {
      assertTrue(new PDFTextStripper().getText(pdf).contains("Nguyễn Văn An"));
    }
  }

  private void saveQa(String name, byte[] bytes, PDDocument pdf) throws IOException {
    String directory = System.getProperty("print.qa.directory");
    if (directory == null || directory.isBlank()) return;
    Path path = Path.of(directory);
    Files.createDirectories(path);
    Files.write(path.resolve(name + ".pdf"), bytes);
    PDFRenderer preview = new PDFRenderer(pdf);
    for (int page = 0; page < pdf.getNumberOfPages(); page++)
      ImageIO.write(
          preview.renderImageWithDPI(page, 110),
          "png",
          path.resolve(name + "-" + (page + 1) + ".png").toFile());
  }
}
