package com.example.dantruventu.Services.printing;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class VoucherPdfRenderer {
  public byte[] render(PrintDocument source) throws IOException {
    try (PDDocument pdf = new PDDocument();
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      pdf.getDocumentInformation().setTitle(source.title() + " " + source.number());
      pdf.getDocumentInformation().setAuthor("Ruventu");
      try (Layout layout = new Layout(pdf, source)) {
        layout.write();
      }
      pdf.save(output);
      return output.toByteArray();
    }
  }

  private static final class Layout implements AutoCloseable {
    private static final float MARGIN = 42;
    private static final float WIDTH = PDRectangle.A4.getWidth() - 2 * MARGIN;
    private static final float BOTTOM = 44;
    private static final float SIZE = 9;
    private static final float LINE = 13;
    private final PDDocument pdf;
    private final PrintDocument source;
    private final PDType0Font regular;
    private final PDType0Font bold;
    private PDPageContentStream stream;
    private float y;

    Layout(PDDocument pdf, PrintDocument source) throws IOException {
      this.pdf = pdf;
      this.source = source;
      try (InputStream normal = resource("fonts/NotoSans-Regular.ttf");
          InputStream heavy = resource("fonts/NotoSans-Bold.ttf")) {
        regular = PDType0Font.load(pdf, normal, true);
        bold = PDType0Font.load(pdf, heavy, true);
      }
    }

    private InputStream resource(String name) throws IOException {
      return new ClassPathResource("printing/" + name).getInputStream();
    }

    void write() throws IOException {
      newPage(true);
      for (PrintDocument.Section section : source.sections()) {
        float[] widths = columnWidths(section);
        float tableHeaderHeight = headerHeight(section.headers(), widths);
        float firstRowHeight =
            section.rows().isEmpty()
                ? 0
                : dataRowHeight(section.rows().getFirst(), widths, section.headers().isEmpty());
        float availableOnNewPage =
            PDRectangle.A4.getHeight()
                - MARGIN
                - 23
                - BOTTOM
                - (source.cancelled() ? 28 : 0)
                - 17
                - tableHeaderHeight;
        ensure(
            17 + tableHeaderHeight + (firstRowHeight <= availableOnNewPage ? firstRowHeight : 23));
        writeText(section.title(), MARGIN, y, bold, 10, Color.BLACK);
        y -= 8;
        line(MARGIN, y, MARGIN + WIDTH, y, Color.BLACK);
        y -= 9;
        if (!section.headers().isEmpty()) row(section.headers(), widths, true);
        for (List<String> cells : section.rows()) tableRow(cells, widths, section.headers());
        y -= 19;
      }
      for (String note : source.notes()) {
        for (String text : wrap(note, regular, 8, WIDTH)) {
          ensure(13);
          writeText(text, MARGIN, y, regular, 8, new Color(75, 75, 75));
          y -= 12;
        }
        y -= 5;
      }
      if (!source.signatories().isEmpty()) {
        ensure(105);
        y -= 18;
        float col = WIDTH / source.signatories().size();
        for (int i = 0; i < source.signatories().size(); i++) {
          float x = MARGIN + i * col;
          List<String> label = wrap(source.signatories().get(i), bold, SIZE, col - 8);
          for (int j = 0; j < label.size(); j++)
            centered(label.get(j), x, col, y - j * LINE, bold, SIZE);
          centered("Ký, ghi rõ họ tên", x, col, y - label.size() * LINE - 4, regular, 8);
        }
      }
      stream.close();
      stream = null;
      for (int i = 0; i < pdf.getNumberOfPages(); i++) {
        try (PDPageContentStream footer =
            new PDPageContentStream(
                pdf, pdf.getPage(i), PDPageContentStream.AppendMode.APPEND, true, true)) {
          footer.setNonStrokingColor(new Color(100, 100, 100));
          footer.beginText();
          footer.setFont(regular, 8);
          footer.newLineAtOffset(MARGIN, 24);
          footer.showText(
              clean(
                  "Ruventu | "
                      + source.number()
                      + " | Trang "
                      + (i + 1)
                      + "/"
                      + pdf.getNumberOfPages(),
                  regular));
          footer.endText();
        }
      }
    }

    private void newPage(boolean first) throws IOException {
      if (stream != null) stream.close();
      PDPage page = new PDPage(PDRectangle.A4);
      pdf.addPage(page);
      stream = new PDPageContentStream(pdf, page);
      y = PDRectangle.A4.getHeight() - MARGIN;
      if (first) {
        byte[] logo;
        try (InputStream input = resource("ruventu-logo.png")) {
          logo = input.readAllBytes();
        }
        PDImageXObject image = PDImageXObject.createFromByteArray(pdf, logo, "Ruventu");
        stream.saveGraphicsState();
        stream.addRect(MARGIN, y - 100, WIDTH, 100);
        stream.clip();
        stream.drawImage(image, (PDRectangle.A4.getWidth() - 200) / 2, y - 148, 200, 200);
        stream.restoreGraphicsState();
        y -= 119;
        for (String text : wrap(source.title(), bold, 17, WIDTH)) {
          centered(text, MARGIN, WIDTH, y, bold, 17);
          y -= 24;
        }
        String numberLabel =
            "HÓA ĐƠN BÁN HÀNG".equals(source.title()) ? "Mã đơn hàng: " : "Số phiếu: ";
        centered(numberLabel + source.number(), MARGIN, WIDTH, y, regular, SIZE);
        y -= 17;
        centered(
            "Thời điểm in: "
                + LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))
                    .format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy")),
            MARGIN,
            WIDTH,
            y,
            regular,
            8);
        y -= 28;
      } else {
        writeText(source.title() + " - " + source.number(), MARGIN, y, bold, 10, Color.BLACK);
        y -= 23;
      }
      if (source.cancelled()) {
        centered("ĐÃ HỦY", MARGIN, WIDTH, y, bold, 17, new Color(180, 0, 35));
        y -= 28;
      }
    }

    private float[] columnWidths(PrintDocument.Section section) {
      int count =
          !section.headers().isEmpty()
              ? section.headers().size()
              : section.rows().isEmpty() ? 2 : section.rows().getFirst().size();
      float[] widths = new float[count];
      for (int i = 0; i < count; i++) widths[i] = WIDTH / count;
      if (count == 7
          && !section.headers().isEmpty()
          && section.headers().getLast().startsWith("Thời hạn bảo hành")) {
        float[] proportions = {.08f, .29f, .06f, .14f, .14f, .10f, .19f};
        for (int i = 0; i < count; i++) widths[i] = WIDTH * proportions[i];
      }
      if (count == 2) {
        widths[0] = WIDTH * .32f;
        widths[1] = WIDTH * .68f;
      }
      return widths;
    }

    private void tableRow(List<String> cells, float[] widths, List<String> headers)
        throws IOException {
      List<List<String>> lines = new ArrayList<>();
      for (int i = 0; i < widths.length; i++)
        lines.add(
            wrap(
                i < cells.size() ? cells.get(i) : "",
                headers.isEmpty() && i == 0 ? bold : regular,
                SIZE,
                widths[i] - 12));
      int total = lines.stream().mapToInt(List::size).max().orElse(1);
      float heightOnNewPage =
          PDRectangle.A4.getHeight()
              - MARGIN
              - 23
              - BOTTOM
              - (source.cancelled() ? 28 : 0)
              - headerHeight(headers, widths);
      if (total * LINE + 10 > y - BOTTOM && total * LINE + 10 <= heightOnNewPage) {
        newPage(false);
        if (!headers.isEmpty()) row(headers, widths, true);
      }
      int offset = 0;
      while (offset < total) {
        if (y - BOTTOM < 10 + LINE) {
          newPage(false);
          if (!headers.isEmpty()) row(headers, widths, true);
        }
        int fit = Math.max(1, (int) ((y - BOTTOM - 10) / LINE));
        int length = Math.min(total - offset, fit);
        float height = length * LINE + 10;
        if (height > y - BOTTOM) {
          newPage(false);
          if (!headers.isEmpty()) row(headers, widths, true);
          continue;
        }
        drawCells(lines, widths, offset, length, height, false, headers.isEmpty());
        y -= height;
        offset += length;
      }
    }

    private float headerHeight(List<String> headers, float[] widths) throws IOException {
      if (headers.isEmpty()) return 0;
      int lines = 1;
      for (int i = 0; i < widths.length; i++)
        lines = Math.max(lines, wrap(headers.get(i), bold, SIZE, widths[i] - 12).size());
      return lines * LINE + 10;
    }

    private float dataRowHeight(List<String> cells, float[] widths, boolean keyValue)
        throws IOException {
      int lines = 1;
      for (int i = 0; i < widths.length; i++) {
        lines =
            Math.max(
                lines,
                wrap(
                        i < cells.size() ? cells.get(i) : "",
                        keyValue && i == 0 ? bold : regular,
                        SIZE,
                        widths[i] - 12)
                    .size());
      }
      return lines * LINE + 10;
    }

    private void row(List<String> cells, float[] widths, boolean heading) throws IOException {
      List<List<String>> lines = new ArrayList<>();
      for (int i = 0; i < widths.length; i++)
        lines.add(wrap(cells.get(i), bold, SIZE, widths[i] - 12));
      int length = lines.stream().mapToInt(List::size).max().orElse(1);
      float height = length * LINE + 10;
      ensure(height);
      drawCells(lines, widths, 0, length, height, heading, false);
      y -= height;
    }

    private void drawCells(
        List<List<String>> cells,
        float[] widths,
        int offset,
        int length,
        float height,
        boolean heading,
        boolean keyValue)
        throws IOException {
      float x = MARGIN;
      for (int i = 0; i < widths.length; i++) {
        if (heading || (keyValue && i == 0)) {
          stream.setNonStrokingColor(new Color(245, 245, 245));
          stream.addRect(x, y - height, widths[i], height);
          stream.fill();
        }
        stream.setStrokingColor(new Color(185, 185, 185));
        stream.setLineWidth(.45f);
        stream.addRect(x, y - height, widths[i], height);
        stream.stroke();
        for (int j = 0; j < length && offset + j < cells.get(i).size(); j++) {
          writeText(
              cells.get(i).get(offset + j),
              x + 6,
              y - 15 - j * LINE,
              heading || (keyValue && i == 0) ? bold : regular,
              SIZE,
              Color.BLACK);
        }
        x += widths[i];
      }
    }

    private void ensure(float height) throws IOException {
      if (y - height < BOTTOM) newPage(false);
    }

    private void centered(
        String text, float x, float width, float top, PDType0Font font, float size)
        throws IOException {
      centered(text, x, width, top, font, size, Color.BLACK);
    }

    private void centered(
        String text, float x, float width, float top, PDType0Font font, float size, Color color)
        throws IOException {
      String safe = clean(text, font);
      writeText(
          safe,
          x + Math.max(0, (width - font.getStringWidth(safe) / 1000 * size) / 2),
          top,
          font,
          size,
          color);
    }

    private void line(float x1, float y1, float x2, float y2, Color color) throws IOException {
      stream.setStrokingColor(color);
      stream.setLineWidth(.6f);
      stream.moveTo(x1, y1);
      stream.lineTo(x2, y2);
      stream.stroke();
    }

    private void writeText(
        String text, float x, float top, PDType0Font font, float size, Color color)
        throws IOException {
      stream.setNonStrokingColor(color);
      stream.beginText();
      stream.setFont(font, size);
      stream.newLineAtOffset(x, top);
      stream.showText(clean(text, font));
      stream.endText();
    }

    private List<String> wrap(String value, PDType0Font font, float size, float width)
        throws IOException {
      List<String> result = new ArrayList<>();
      for (String paragraph : (value == null ? "-" : value).split("\\R", -1)) {
        String text = clean(paragraph, font);
        StringBuilder line = new StringBuilder();
        for (String word : text.split("\\s+")) {
          String candidate = line.isEmpty() ? word : line + " " + word;
          if (font.getStringWidth(candidate) / 1000 * size <= width) {
            line.setLength(0);
            line.append(candidate);
            continue;
          }
          if (!line.isEmpty()) {
            result.add(line.toString());
            line.setLength(0);
          }
          for (int codepoint : word.codePoints().toArray()) {
            String letter = new String(Character.toChars(codepoint));
            if (!line.isEmpty() && font.getStringWidth(line + letter) / 1000 * size > width) {
              result.add(line.toString());
              line.setLength(0);
            }
            line.append(letter);
          }
        }
        result.add(line.toString());
      }
      return result.isEmpty() ? List.of("") : result;
    }

    private String clean(String value, PDType0Font font) throws IOException {
      String text = Normalizer.normalize(value == null ? "-" : value, Normalizer.Form.NFC);
      StringBuilder result = new StringBuilder();
      for (int codepoint : text.codePoints().toArray()) {
        if (Character.isISOControl(codepoint)) {
          result.append(' ');
          continue;
        }
        String letter = new String(Character.toChars(codepoint));
        try {
          font.encode(letter);
          result.append(letter);
        } catch (IllegalArgumentException unsupported) {
          result.append('?');
        }
      }
      return result.toString();
    }

    @Override
    public void close() throws IOException {
      if (stream != null) stream.close();
    }
  }
}
