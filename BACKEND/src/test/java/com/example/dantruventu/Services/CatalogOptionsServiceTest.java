package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Entity.ThuongHieu;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

class CatalogOptionsServiceTest {
  @Test
  void exposesActiveMetadataAndHidesInactiveParentsAndCycles() {
    var categories = mock(DanhMucRepository.class);
    var brands = mock(ThuongHieuRepository.class);
    var active = DanhMuc.builder().id(1L).tenDanhMuc("Tên mới").duongDanUrl("ten-moi").build();
    var inactive = DanhMuc.builder().id(2L).trangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG).build();
    var child = DanhMuc.builder().id(3L).danhMucCha(inactive).build();
    var cycle = DanhMuc.builder().id(4L).build();
    cycle.setDanhMucCha(cycle);
    when(categories.findAll(Sort.by("tenDanhMuc")))
        .thenReturn(List.of(active, inactive, child, cycle));
    when(brands.findAll(Sort.by("tenThuongHieu")))
        .thenReturn(
            List.of(
                ThuongHieu.builder().id(5L).tenThuongHieu("Brand mới").logo("/logo.png").build(),
                ThuongHieu.builder().id(6L).trangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG).build()));
    var result = new CatalogOptionsService(categories, brands).getOptions();
    assertEquals(List.of(1L), result.danhMuc().stream().map(c -> c.id()).toList());
    assertEquals("Tên mới", result.danhMuc().getFirst().tenDanhMuc());
    assertEquals(List.of(5L), result.thuongHieu().stream().map(b -> b.id()).toList());
    assertEquals("/logo.png", result.thuongHieu().getFirst().logo());
  }
}
