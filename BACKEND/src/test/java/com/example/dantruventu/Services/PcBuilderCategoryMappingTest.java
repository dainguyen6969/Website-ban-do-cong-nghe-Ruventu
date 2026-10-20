package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.PcBuilderProperties;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.PcBuilderCategory;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class PcBuilderCategoryMappingTest {
  @Mock private DanhMucRepository categories;
  @Mock private PhienBanSanPhamRepository variants;
  @Mock private SalesContext sales;
  @Mock private PcBuilderSocketSupport socket;
  @Mock private PcBuilderStockSupport stock;
  @Mock private CatalogSupport catalog;
  private PcBuilderProperties properties;
  private PcBuilderService service;

  @BeforeEach
  void setUp() {
    properties = new PcBuilderProperties();
    service = new PcBuilderService(categories, properties, variants, sales, socket, stock, catalog);
  }

  @Test
  void optionsRetainAllSlotsWithPartialDatabaseAndSharedMappings() {
    var ssd = category(6L, "ssd");
    when(categories.findByDuongDanUrlIn(anyCollection())).thenReturn(List.of(ssd));
    var options = service.getOptions();
    assertEquals(26, options.tongHangMuc());
    assertEquals(
        List.of(12, 7, 7),
        options.nhomHangMuc().stream().map(group -> group.hangMuc().size()).toList());
    var mappings = service.resolveCategoryMappings();
    assertSame(ssd, mappings.get(PcBuilderCategory.SSD_1));
    assertSame(ssd, mappings.get(PcBuilderCategory.SSD_2));
    assertEquals("cpu", properties.getCategorySlugs().get("CPU"));
    assertEquals("mainboard", properties.getCategorySlugs().get("MAIN"));
    assertEquals(
        properties.getCategorySlugs().get("MONITOR_1"),
        properties.getCategorySlugs().get("MONITOR_2"));
  }

  @Test
  void unmappedOrMissingCategoryReturnsEmptyWithoutQueryingOtherProducts() {
    when(categories.findByDuongDanUrlIn(anyCollection())).thenReturn(List.of());
    for (String code : List.of("HDD", "CPU", "BAN_PHIM")) {
      var result = products(code);
      assertTrue(result.items().isEmpty());
      assertTrue(result.thuongHieuOptions().isEmpty());
      assertEquals(0, result.pagination().getTotalElements());
      assertEquals(20, result.pagination().getLimit());
    }
    verifyNoInteractions(variants, sales, stock);
  }

  @Test
  void inactiveMappedCategoryDoesNotPreventOptionsOrExposeProducts() {
    var cpu = category(2L, "cpu");
    cpu.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    when(categories.findByDuongDanUrlIn(anyCollection())).thenReturn(List.of(cpu));
    assertEquals(26, service.getOptions().tongHangMuc());
    assertTrue(products("CPU").items().isEmpty());
    verifyNoInteractions(variants, sales, stock);
  }

  @Test
  void unconfiguredSlotCannotAcceptAVariantFromAnotherCategory() {
    var cpu = category(2L, "cpu");
    when(categories.findByDuongDanUrlIn(anyCollection())).thenReturn(List.of(cpu));
    when(variants.findPcBuilderPreviewVariants(anyCollection())).thenReturn(List.of(variant(cpu)));
    var error =
        assertThrows(
            AppException.class,
            () ->
                service.validateVariants(
                    List.of(new PcBuilderService.Selection(PcBuilderCategory.HDD, 8L, 1))));
    assertEquals(ErrorCode.PC_BUILDER_PREVIEW_UNAVAILABLE, error.getErrorCode());
  }

  @Test
  void mappedSlotsStillRejectWrongCategoryAndAllowSharedSsdVariant() {
    var cpu = category(2L, "cpu");
    var ssd = category(6L, "ssd");
    var variant = variant(ssd);
    when(categories.findByDuongDanUrlIn(anyCollection())).thenReturn(List.of(cpu, ssd));
    when(variants.findPcBuilderPreviewVariants(anyCollection())).thenReturn(List.of(variant));
    var error =
        assertThrows(
            AppException.class,
            () ->
                service.validateVariants(
                    List.of(new PcBuilderService.Selection(PcBuilderCategory.CPU, 8L, 1))));
    assertEquals(ErrorCode.INVALID_PC_BUILDER_PREVIEW, error.getErrorCode());
    var result =
        service.validateVariants(
            List.of(
                new PcBuilderService.Selection(PcBuilderCategory.SSD_1, 8L, 1),
                new PcBuilderService.Selection(PcBuilderCategory.SSD_2, 8L, 2)));
    assertSame(variant, result.get(8L));
  }

  @Test
  void inactiveReferenceCategoryCannotBeUsedForSocketFiltering() {
    var cpu = category(2L, "cpu");
    var main = category(4L, "mainboard");
    main.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    when(categories.findByDuongDanUrlIn(anyCollection())).thenReturn(List.of(cpu, main));
    when(variants.findById(8L)).thenReturn(Optional.of(variant(main)));
    var error =
        assertThrows(
            AppException.class,
            () ->
                service.getProducts(
                    "CPU", null, null, null, null, null, null, "0", "20", "8", "true"));
    assertEquals(ErrorCode.PC_BUILDER_REFERENCE_DISCONTINUED, error.getErrorCode());
    verifyNoInteractions(stock, sales);
  }

  @Test
  void missingReferenceSocketOnlyBlocksStrictFiltering() {
    var cpu = category(2L, "cpu");
    var main = category(4L, "mainboard");
    when(categories.findByDuongDanUrlIn(anyCollection())).thenReturn(List.of(cpu, main));
    when(variants.findById(8L)).thenReturn(Optional.of(variant(main)));
    var error =
        assertThrows(
            AppException.class,
            () ->
                service.getProducts(
                    "CPU", null, null, null, null, null, null, "0", "20", "8", "true"));
    assertEquals(ErrorCode.PC_BUILDER_REFERENCE_SOCKET_MISSING, error.getErrorCode());
    verifyNoInteractions(sales);

    var row = mock(PhienBanSanPhamRepository.PcBuilderProduct.class);
    when(row.getPhienBanId()).thenReturn(9L);
    when(row.getGiaBanLe()).thenReturn(new BigDecimal("3200000"));
    when(row.getTonCoTheBan()).thenReturn(5L);
    when(row.getThongSoKyThuat()).thenReturn("{\"socket\":\"AM5\"}");
    when(socket.compare(null, row.getThongSoKyThuat())).thenReturn("CHUA_DU_DU_LIEU");
    when(sales.defaultWarehouseId()).thenReturn(1L);
    when(variants.findPcBuilderProducts(
            2L, 1L, null, null, null, null, "TAT_CA", null, "MAC_DINH", PageRequest.of(0, 20)))
        .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(0, 20), 1));
    var result =
        service.getProducts("CPU", null, null, null, null, null, null, "0", "20", "8", "false");
    assertFalse(result.boLocTuongThich().dangApDung());
    assertEquals(8L, result.boLocTuongThich().phienBanDoiChieuId());
    assertNull(result.boLocTuongThich().socketDoiChieu());
    assertEquals("CHUA_DU_DU_LIEU", result.items().getFirst().ketQuaSocket());
    assertTrue(result.items().getFirst().coTheChon());
  }

  @Test
  void databaseFailureRemainsAnErrorInsteadOfPretendingCatalogIsEmpty() {
    when(categories.findByDuongDanUrlIn(anyCollection()))
        .thenThrow(new IllegalStateException("DB unavailable"));
    var error = assertThrows(AppException.class, () -> service.getOptions());
    assertEquals(ErrorCode.PC_BUILDER_CONFIGURATION_INVALID, error.getErrorCode());
  }

  private com.example.dantruventu.DTO.Response.PcBuilderProductsResponse products(String code) {
    return service.getProducts(code, null, null, null, null, null, null, "0", "20", null, null);
  }

  private DanhMuc category(Long id, String slug) {
    return DanhMuc.builder().id(id).duongDanUrl(slug).build();
  }

  private PhienBanSanPham variant(DanhMuc category) {
    return PhienBanSanPham.builder()
        .id(8L)
        .giaBanLe(new BigDecimal("3200000"))
        .sanPham(SanPham.builder().danhMuc(category).loaiSanPham(LoaiSanPham.DON).build())
        .build();
  }
}
