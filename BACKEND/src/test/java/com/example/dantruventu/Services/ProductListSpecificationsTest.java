package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Repository.ProductDetailRepository;
import com.example.dantruventu.Repository.ProductListProjection;
import com.example.dantruventu.Repository.product.SanPhamRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class ProductListSpecificationsTest {
  @Test
  void listIncludesStoredSpecificationsAndPriceVariantWithoutFetchingEachProduct() {
    var products = mock(SanPhamRepository.class);
    var details = mock(ProductDetailRepository.class);
    var catalog = mock(CatalogSupport.class);
    var service =
        new ProductService(products, details, mock(SalesCalculationService.class), catalog);
    var row = mock(ProductListProjection.class);
    String specs = "{\"phien_ban\":{\"542\":{\"thong_so_ky_thuat\":{\"VRAM\":\"4 GB\"}}}}";
    when(row.getId()).thenReturn(459L);
    when(row.getThongSoKyThuat()).thenReturn(specs);
    when(row.getPhienBanMacDinhId()).thenReturn(542L);
    when(row.getGiaThapNhat()).thenReturn(new BigDecimal("4890000"));
    when(products.findProducts(
            any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(row)));
    when(catalog.comboParts(List.of())).thenReturn(Map.of());

    var item =
        service
            .getProducts(null, null, null, null, null, null, 0, 20, "moi_nhat")
            .getDanhSachSanPham()
            .getFirst();
    assertEquals(specs, item.getThongSoKyThuat());
    assertEquals(542L, item.getPhienBanMacDinhId());
    assertEquals(new BigDecimal("4890000"), item.getGiaThapNhat());
    verifyNoInteractions(details);
  }
}
