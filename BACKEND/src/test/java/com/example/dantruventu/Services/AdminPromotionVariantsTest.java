package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.promotion.AdminPromotionController;
import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Specification.PhienBanKhuyenMaiSpecification;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SuppressWarnings("unchecked")
class AdminPromotionVariantsTest {
  private final PhienBanSanPhamRepository variants = mock(PhienBanSanPhamRepository.class);
  private final DanhMucRepository categories = mock(DanhMucRepository.class);
  private final ThuongHieuRepository brands = mock(ThuongHieuRepository.class);
  private final CatalogSupport catalog = mock(CatalogSupport.class);
  private final AdminPromotionService service =
      new AdminPromotionService(
          null,
          null,
          variants,
          new SalesProperties(),
          categories,
          brands,
          catalog,
          null,
          null,
          null,
          null);

  @Test
  void keepsZeroAndMissingStockAndMapsAttributesToTheirOwnVariant() {
    var first = variant(1L, true);
    var second = variant(2L, false);
    var third = variant(3L, false);
    var size = new CatalogFields.AttributeData(101L, "Dung lượng", "16GB");
    var speed = new CatalogFields.AttributeData(102L, "Tốc độ", "3200MHz");
    var otherSize = new CatalogFields.AttributeData(201L, "Dung lượng", "8GB");
    when(variants.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(first, second, third)));
    when(catalog.stocks(List.of(1L, 2L, 3L)))
        .thenReturn(
            Map.of(1L, new CatalogSupport.Stock(8, 8, 0, 0), 2L, CatalogSupport.Stock.ZERO));
    when(catalog.attributes(List.of(1L, 2L, 3L)))
        .thenReturn(Map.of(1L, List.of(size, speed), 2L, List.of(otherSize)));

    var result = service.getVariants(null, null, null, 0, 20);

    assertEquals(3, result.getItems().size());
    assertEquals(3, result.getPagination().getTotalElements());
    var items = result.getItems();
    assertEquals(8, items.get(0).getTonCoTheBan());
    assertTrue(items.get(0).isCoQuanLySerial());
    assertEquals(List.of(size, speed), items.get(0).getThuocTinhPhienBan());
    assertEquals(0, items.get(1).getTonCoTheBan());
    assertFalse(items.get(1).isCoQuanLySerial());
    assertEquals(List.of(otherSize), items.get(1).getThuocTinhPhienBan());
    assertEquals(0, items.get(2).getTonCoTheBan());
    assertEquals(List.of(), items.get(2).getThuocTinhPhienBan());
    verify(variants, never()).save(any());
  }

  @Test
  void categoryScopeIncludesGrandchildrenWithoutLoopingOnCorruptCycles() {
    var parent = DanhMuc.builder().id(10L).build();
    var child = DanhMuc.builder().id(20L).danhMucCha(parent).build();
    var grandchild = DanhMuc.builder().id(30L).danhMucCha(child).build();
    parent.setDanhMucCha(grandchild);
    when(categories.findAll())
        .thenReturn(List.of(parent, child, grandchild, DanhMuc.builder().id(40L).build()));
    when(brands.existsById(5L)).thenReturn(true);
    when(variants.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());

    service.getVariants(null, 10L, 5L, 0, 20);

    var spec = ArgumentCaptor.forClass(Specification.class);
    verify(variants).findAll(spec.capture(), any(Pageable.class));
    var root = mock(Root.class);
    var product = mock(Join.class);
    var category = mock(Path.class);
    var categoryId = mock(Path.class);
    when(root.join("sanPham", JoinType.INNER)).thenReturn(product);
    when(product.get("danhMuc")).thenReturn(category);
    when(category.get("id")).thenReturn(categoryId);
    var brand = mock(Path.class);
    when(product.get("thuongHieu")).thenReturn(brand);
    when(brand.get("id")).thenReturn(mock(Path.class));
    spec.getValue().toPredicate(root, mock(CriteriaQuery.class), mock(CriteriaBuilder.class));
    verify(categoryId).in(Set.of(10L, 20L, 30L));
  }

  @Test
  void emptyResultHasEmptyItemsAndZeroTotals() {
    when(variants.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(Page.empty(PageRequest.of(0, 20)));

    var result = service.getVariants("UNKNOWN", null, null, 0, 20);

    assertTrue(result.getItems().isEmpty());
    assertEquals(0, result.getPagination().getTotalElements());
    assertEquals(0, result.getPagination().getTotalPages());
    verify(catalog).stocks(List.of());
    verify(catalog).attributes(List.of());
  }

  @Test
  void absentSelectedCategoryIs404BeforeVariantQuery() {
    when(categories.findAll()).thenReturn(List.of(DanhMuc.builder().id(1L).build()));
    var error =
        assertThrows(AppException.class, () -> service.getVariants(null, 999L, null, 0, 20));
    assertEquals(ErrorCode.NOT_FOUND, error.getErrorCode());
    verifyNoInteractions(variants, catalog);
  }

  @Test
  void absentSelectedBrandIs404BeforeVariantQuery() {
    var error =
        assertThrows(AppException.class, () -> service.getVariants(null, null, 999L, 0, 20));
    assertEquals(ErrorCode.NOT_FOUND, error.getErrorCode());
    verifyNoInteractions(variants, catalog);
  }

  @ParameterizedTest
  @CsvSource({"0,", "-1,", ",0", ",-1"})
  void nonpositiveFilterIdsAre400(Long categoryId, Long brandId) {
    var error =
        assertThrows(
            AppException.class, () -> service.getVariants(null, categoryId, brandId, 0, 20));
    assertEquals(ErrorCode.INVALID_DATA, error.getErrorCode());
    verifyNoInteractions(variants, catalog);
  }

  @ParameterizedTest
  @CsvSource({"-1,20", "0,0", "0,101"})
  void invalidPaginationIs400(int page, int limit) {
    var error =
        assertThrows(AppException.class, () -> service.getVariants(null, null, null, page, limit));
    assertEquals(ErrorCode.INVALID_DATA, error.getErrorCode());
    verifyNoInteractions(variants, catalog);
  }

  @Test
  void keywordLengthIsValidated() {
    var error =
        assertThrows(
            AppException.class, () -> service.getVariants("X".repeat(201), null, null, 0, 20));
    assertEquals(ErrorCode.INVALID_DATA, error.getErrorCode());
    verifyNoInteractions(variants, catalog);
  }

  @Test
  void getBindsCategoryAndBrandAndKeepsZeroStockInJson() throws Exception {
    var mocked = mock(AdminPromotionService.class);
    when(variants.findAll(any(Specification.class), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(variant(2L, false))));
    var response = service.getVariants(null, null, null, 0, 20);
    when(mocked.getVariants("RAM", 5L, 2L, 0, 20)).thenReturn(response);
    var mvc =
        MockMvcBuilders.standaloneSetup(new AdminPromotionController(mocked))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    mvc.perform(
            get("/api/v1/admin/promotions/variants")
                .param("keyword", "RAM")
                .param("danh_muc_id", "5")
                .param("thuong_hieu_id", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Lấy phiên bản cho khuyến mại thành công"))
        .andExpect(jsonPath("$.data.items[0].ton_co_the_ban").value(0))
        .andExpect(jsonPath("$.data.items[0].co_quan_ly_serial").value(false))
        .andExpect(jsonPath("$.data.items[0].thuoc_tinh_phien_ban").isArray())
        .andExpect(jsonPath("$.data.items[0].gia_nhap").doesNotExist());
    verify(mocked).getVariants("RAM", 5L, 2L, 0, 20);
  }

  @ParameterizedTest
  @ValueSource(strings = {"abc", "0", "1"})
  void arbitraryWarehouseQueryIs400(String value) throws Exception {
    var mocked = mock(AdminPromotionService.class);
    var mvc =
        MockMvcBuilders.standaloneSetup(new AdminPromotionController(mocked))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    mvc.perform(get("/api/v1/admin/promotions/variants").param("kho_hang_id", value))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(mocked);
  }

  @ParameterizedTest
  @ValueSource(strings = {"danh_muc_id", "thuong_hieu_id", "page", "limit"})
  void invalidQueryTypesAre400(String parameter) throws Exception {
    var mocked = mock(AdminPromotionService.class);
    var mvc =
        MockMvcBuilders.standaloneSetup(new AdminPromotionController(mocked))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    mvc.perform(get("/api/v1/admin/promotions/variants").param(parameter, "abc"))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(mocked);
  }

  @Test
  void brandPredicateUsesSelectedIdAndBarcodeIsSearchedLiterally() {
    Root<PhienBanSanPham> root = mock(Root.class);
    Join<PhienBanSanPham, SanPham> product = mock(Join.class);
    Path<Object> brand = mock(Path.class);
    Path<Object> brandId = mock(Path.class);
    Path<String> barcode = mock(Path.class);
    CriteriaBuilder cb = mock(CriteriaBuilder.class);
    when(root.<PhienBanSanPham, SanPham>join("sanPham", JoinType.INNER)).thenReturn(product);
    when(product.get("thuongHieu")).thenReturn(brand);
    when(brand.get("id")).thenReturn(brandId);
    when(root.<String>get("maVach")).thenReturn(barcode);
    when(cb.lower(barcode)).thenReturn(barcode);

    PhienBanKhuyenMaiSpecification.activeVariants("RAM_16%", Set.of(), 5L)
        .toPredicate(root, mock(CriteriaQuery.class), cb);

    verify(cb).equal(brandId, 5L);
    verify(cb).like(barcode, "%ram\\_16\\%%", '\\');
  }

  private PhienBanSanPham variant(Long id, boolean serial) {
    return PhienBanSanPham.builder()
        .id(id)
        .sanPham(SanPham.builder().id(id).maSanPham("RAM-" + id).tenSanPham("RAM").build())
        .coQuanLySerial(serial)
        .giaBanLe(new BigDecimal("500000"))
        .build();
  }
}
