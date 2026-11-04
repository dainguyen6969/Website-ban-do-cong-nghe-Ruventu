package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.CatalogOptionsResponse;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import java.util.HashSet;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogOptionsService {
  private final DanhMucRepository categories;
  private final ThuongHieuRepository brands;

  public CatalogOptionsResponse getOptions() {
    var visibleCategories =
        categories.findAll(Sort.by("tenDanhMuc")).stream()
            .filter(this::isVisible)
            .map(
                c ->
                    new CatalogOptionsResponse.Category(
                        c.getId(),
                        c.getDanhMucCha() == null ? null : c.getDanhMucCha().getId(),
                        c.getTenDanhMuc(),
                        c.getDuongDanUrl(),
                        c.getAnhDaiDien()))
            .toList();
    var visibleBrands =
        brands.findAll(Sort.by("tenThuongHieu")).stream()
            .filter(b -> b.getTrangThai() == TrangThaiCoBanEnum.HOAT_DONG)
            .map(
                b ->
                    new CatalogOptionsResponse.Brand(
                        b.getId(), b.getTenThuongHieu(), b.getDuongDanUrl(), b.getLogo()))
            .toList();
    return new CatalogOptionsResponse(visibleCategories, visibleBrands);
  }

  private boolean isVisible(DanhMuc category) {
    var visited = new HashSet<Long>();
    for (var current = category; current != null; current = current.getDanhMucCha()) {
      if (current.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG || !visited.add(current.getId()))
        return false;
    }
    return true;
  }
}
