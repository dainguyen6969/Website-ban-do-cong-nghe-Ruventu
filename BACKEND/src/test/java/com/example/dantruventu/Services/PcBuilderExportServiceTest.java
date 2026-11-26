package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.PcBuilderProperties;
import com.example.dantruventu.DTO.Request.PcBuilderExportRequest;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

class PcBuilderExportServiceTest {
  static final String BODY =
      """
      {"items":[
        {"ma_hang_muc":"CPU","phien_ban_id":101,"so_luong":1,"don_gia_xac_nhan":12490000},
        {"ma_hang_muc":"MAIN","phien_ban_id":201,"so_luong":1,"don_gia_xac_nhan":5990000},
        {"ma_hang_muc":"SSD_1","phien_ban_id":301,"so_luong":1,"don_gia_xac_nhan":1490000},
        {"ma_hang_muc":"SSD_2","phien_ban_id":301,"so_luong":1,"don_gia_xac_nhan":1490000}
      ]}
      """;

  static class Fixture {
    final ObjectMapper json = new ObjectMapper();
    final DanhMucRepository categories = mock(DanhMucRepository.class);
    final PhienBanSanPhamRepository variants = mock(PhienBanSanPhamRepository.class);
    final TonKhoRepository stocks = mock(TonKhoRepository.class);
    final SalesContext sales = mock(SalesContext.class);
    final Map<Long, PhienBanSanPham> data = new LinkedHashMap<>();
    final Map<Long, Long> available = new HashMap<>();
    final PcBuilderService builder;
    final PcBuilderExcelExporter renderer = spy(new PcBuilderExcelExporter());
    final PcBuilderExportService service;

    Fixture() {
      var properties = new PcBuilderProperties();
      var cpu = category(1L, properties.getCategorySlugs().get("CPU"));
      var main = category(2L, properties.getCategorySlugs().get("MAIN"));
      var ssd = category(3L, properties.getCategorySlugs().get("SSD_1"));
      data.put(101L, variant(101L, cpu, "CPU Intel mẫu", "LGA1700", 12490000, 7));
      data.put(201L, variant(201L, main, "MAIN mẫu", "LGA1700", 5990000, 18));
      data.put(301L, variant(301L, ssd, "SSD mẫu", null, 1490000, 60));
      data.get(201L)
          .getSanPham()
          .setThongSoKyThuat("{\"CPU hỗ trợ\":\"Intel Core\",\"socket\":\"LGA1700\"}");
      available.putAll(Map.of(101L, 4L, 201L, 5L, 301L, 8L));
      when(categories.findByDuongDanUrlIn(anyCollection())).thenReturn(List.of(cpu, main, ssd));
      when(variants.findPcBuilderPreviewVariants(anyCollection()))
          .thenAnswer(
              a -> {
                Collection<Long> ids = a.getArgument(0);
                return ids.stream().filter(data::containsKey).map(data::get).toList();
              });
      when(sales.defaultWarehouseId()).thenReturn(1L);
      when(stocks.tongTonCoTheBanTheoKhoVaPhienBan(eq(1L), anyCollection()))
          .thenAnswer(
              a -> {
                Collection<Long> ids = a.getArgument(1);
                return ids.stream()
                    .filter(available::containsKey)
                    .map(
                        id -> {
                          var row = mock(TonKhoRepository.TonPhienBanProjection.class);
                          when(row.getPhienBanId()).thenReturn(id);
                          when(row.getTonCoTheBan()).thenReturn(available.get(id));
                          return row;
                        })
                    .toList();
              });
      builder =
          new PcBuilderService(
              categories,
              properties,
              variants,
              sales,
              new PcBuilderCompatibilitySupport(json),
              new PcBuilderStockSupport(stocks),
              mock(CatalogSupport.class));
      service = new PcBuilderExportService(builder, renderer);
    }

    PcBuilderExportRequest request(String body) {
      return json.readValue(body, PcBuilderExportRequest.class);
    }

    PcBuilderExportService.File export() {
      return service.export(request(BODY));
    }

    PcBuilderExportException error(String body) {
      return assertThrows(PcBuilderExportException.class, () -> service.export(request(body)));
    }

    String workbookText(byte[] content) throws IOException {
      var values = new ArrayList<String>();
      try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
        for (var sheet : workbook)
          for (var row : sheet)
            for (var cell : row)
              if (cell.getCellType() == CellType.STRING) values.add(cell.getStringCellValue());
      }
      return String.join("\n", values);
    }

    private DanhMuc category(Long id, String slug) {
      return DanhMuc.builder().id(id).duongDanUrl(slug).build();
    }

    private PhienBanSanPham variant(
        Long id, DanhMuc category, String name, String socket, int price, int months) {
      return PhienBanSanPham.builder()
          .id(id)
          .tenPhienBan("Tiêu chuẩn")
          .giaBanLe(BigDecimal.valueOf(price))
          .coQuanLySerial(false)
          .sanPham(
              SanPham.builder()
                  .id(id)
                  .tenSanPham(name)
                  .danhMuc(category)
                  .loaiSanPham(LoaiSanPham.DON)
                  .thoiHanBaoHanhThang(months)
                  .thongSoKyThuat(socket == null ? "{}" : "{\"socket\":\"" + socket + "\"}")
                  .build())
          .build();
    }
  }

  @Test
  void exportsCurrentPricesSeparateSsdSlotsAndPerProductWarrantyWithoutWrites() throws Exception {
    var f = new Fixture();
    var file = f.export();
    assertTrue(file.filename().matches("Ruventu_CauHinhPC_\\d{8}_\\d{6}\\.xlsx"));
    try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(file.content()))) {
      var sheet = workbook.getSheetAt(0);
      assertEquals("Ổ cứng SSD 1", sheet.getRow(10).getCell(1).getStringCellValue());
      assertEquals("Ổ cứng SSD 2", sheet.getRow(11).getCell(1).getStringCellValue());
      assertEquals(7, sheet.getRow(8).getCell(7).getNumericCellValue());
      assertEquals(18, sheet.getRow(9).getCell(7).getNumericCellValue());
      assertEquals(60, sheet.getRow(10).getCell(7).getNumericCellValue());
      assertEquals(60, sheet.getRow(11).getCell(7).getNumericCellValue());
      assertEquals(21460000, sheet.getRow(12).getCell(6).getNumericCellValue());
      assertEquals(1490000, sheet.getRow(10).getCell(5).getNumericCellValue());
      assertEquals(1, sheet.getRow(10).getCell(4).getNumericCellValue());
      for (var row : sheet)
        for (var cell : row) assertNotEquals(CellType.FORMULA, cell.getCellType());
    }
    verify(f.variants, never()).save(any());
    verify(f.stocks, never()).save(any());
    assertEquals(8L, f.available.get(301L));
    var transaction =
        PcBuilderExportService.class
            .getMethod("export", PcBuilderExportRequest.class)
            .getAnnotation(Transactional.class);
    assertTrue(transaction.readOnly());
    assertEquals(Isolation.REPEATABLE_READ, transaction.isolation());
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 1, 6, 12, 36, 60})
  void preservesActualWarrantyMonths(int months) throws Exception {
    var f = new Fixture();
    f.data.get(101L).getSanPham().setThoiHanBaoHanhThang(months);
    try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(f.export().content()))) {
      assertEquals(months, workbook.getSheetAt(0).getRow(8).getCell(7).getNumericCellValue());
    }
  }

  @Test
  void exportsWarningsForAggregatedShortageMismatchAndMissingSupportedCpu() throws Exception {
    var f = new Fixture();
    f.available.put(301L, 1L);
    f.data.get(201L).getSanPham().setThongSoKyThuat("{\"CPU hỗ trợ\":\"AMD Ryzen\"}");
    String text = f.workbookText(f.export().content());
    assertTrue(text.contains("Hãng CPU không khớp"));
    assertTrue(text.contains("tổng nhu cầu 2, tồn có thể bán 1"));
    f.data.get(201L).getSanPham().setThongSoKyThuat("{}");
    assertTrue(f.workbookText(f.export().content()).contains("MAIN thiếu thông số CPU hỗ trợ"));
    f.available.remove(301L);
    assertTrue(f.workbookText(f.export().content()).contains("tồn có thể bán 0"));
  }

  @Test
  void writesFormulaLikeNamesAsText() throws Exception {
    var f = new Fixture();
    String name = "=HYPERLINK(\"https://example.test\",\"CPU\")";
    f.data.get(101L).getSanPham().setTenSanPham(name);
    try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(f.export().content()))) {
      var cell = workbook.getSheetAt(0).getRow(8).getCell(2);
      assertEquals(CellType.STRING, cell.getCellType());
      assertEquals(name, cell.getStringCellValue());
    }
  }

  @Test
  void changedPriceIdentifiesExactLineBeforeRendering() throws Exception {
    var f = new Fixture();
    var error = f.error(BODY.replace("5990000", "1"));
    assertEquals(ErrorCode.PC_BUILDER_EXPORT_PRICE_CHANGED, error.getErrorCode());
    assertEquals("items[1].don_gia_xac_nhan", error.getErrors().getFirst().field());
    assertEquals("PRICE_CHANGED", error.getErrors().getFirst().code());
    verifyNoInteractions(f.renderer, f.stocks);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"items\":[]}",
        "{\"items\":[null]}",
        "{\"items\":[{\"ma_hang_muc\":\"CPU\",\"phien_ban_id\":101,\"so_luong\":1}]}",
        "{\"items\":[{\"ma_hang_muc\":\"CPU\",\"phien_ban_id\":101,\"so_luong\":1.5,\"don_gia_xac_nhan\":1}]}",
        "{\"items\":[{\"ma_hang_muc\":\"CPU\",\"phien_ban_id\":101,\"so_luong\":0,\"don_gia_xac_nhan\":1}]}"
      })
  void rejectsInvalidRequests(String body) {
    var f = new Fixture();
    assertEquals(ErrorCode.INVALID_PC_BUILDER_EXPORT, f.error(body).getErrorCode());
    verifyNoInteractions(f.renderer);
  }

  @Test
  void rejectsDuplicateSlotsAndOversizedConfiguration() {
    var f = new Fixture();
    assertEquals(
        ErrorCode.INVALID_PC_BUILDER_EXPORT,
        f.error(BODY.replace("SSD_2", "SSD_1")).getErrorCode());
    var item = f.request(BODY).items().getFirst();
    var oversized = new PcBuilderExportRequest(Collections.nCopies(27, item));
    assertEquals(
        ErrorCode.INVALID_PC_BUILDER_EXPORT,
        assertThrows(PcBuilderExportException.class, () -> f.service.export(oversized))
            .getErrorCode());
  }

  @Test
  void missingAndNonPublicVariantsReturnPublicNotFound() {
    var f = new Fixture();
    assertEquals(
        ErrorCode.PC_BUILDER_EXPORT_PUBLIC_VARIANT_NOT_FOUND,
        f.error(BODY.replace("101", "999999")).getErrorCode());
    f.data.get(101L).getSanPham().setLoaiSanPham(LoaiSanPham.BO_PC);
    var error = f.error(BODY);
    assertEquals("PUBLIC_VARIANT_NOT_FOUND", error.getErrors().getFirst().code());
    assertEquals("items.phien_ban_id", error.getErrors().getFirst().field());
    f.data.get(101L).getSanPham().setLoaiSanPham(LoaiSanPham.DON);
    f.data
        .get(101L)
        .getSanPham()
        .setDanhMuc(DanhMuc.builder().id(99L).duongDanUrl("ngoai-pham-vi-build-pc").build());
    assertEquals(
        ErrorCode.PC_BUILDER_EXPORT_PUBLIC_VARIANT_NOT_FOUND, f.error(BODY).getErrorCode());
  }

  @Test
  void discontinuedOrWrongCategoryIsConflict() {
    var f = new Fixture();
    f.data.get(101L).setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    assertEquals(ErrorCode.PC_BUILDER_EXPORT_UNAVAILABLE, f.error(BODY).getErrorCode());
    f.data.get(101L).setTrangThai(TrangThaiCoBanEnum.HOAT_DONG);
    f.data.get(101L).getSanPham().setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    assertEquals(ErrorCode.PC_BUILDER_EXPORT_UNAVAILABLE, f.error(BODY).getErrorCode());
    f.data.get(101L).getSanPham().setTrangThai(TrangThaiCoBanEnum.HOAT_DONG);
    f.data.get(101L).getSanPham().setDanhMuc(f.data.get(201L).getSanPham().getDanhMuc());
    assertEquals(ErrorCode.PC_BUILDER_EXPORT_UNAVAILABLE, f.error(BODY).getErrorCode());
  }

  @Test
  void sourceRenderAndMissingWarrantyFailuresDoNotReturnPartialFiles() throws Exception {
    var f = new Fixture();
    doThrow(new IOException("Lỗi tạo file giả lập")).when(f.renderer).export(any(), anyMap());
    assertEquals("EXPORT_SOURCE_OR_RENDER_FAILED", f.error(BODY).getErrors().getFirst().code());
    f = new Fixture();
    when(f.variants.findPcBuilderPreviewVariants(anyCollection()))
        .thenThrow(new IllegalStateException("Lỗi nguồn giả lập"));
    assertEquals(ErrorCode.PC_BUILDER_EXPORT_SOURCE_FAILED, f.error(BODY).getErrorCode());
    f = new Fixture();
    f.data.get(101L).getSanPham().setThoiHanBaoHanhThang(null);
    assertEquals(ErrorCode.PC_BUILDER_EXPORT_SOURCE_FAILED, f.error(BODY).getErrorCode());
    assertEquals(
        ErrorCode.PC_BUILDER_EXPORT_SOURCE_FAILED,
        new Fixture().error(BODY.replace("CPU", "HDD")).getErrorCode());
  }
}
