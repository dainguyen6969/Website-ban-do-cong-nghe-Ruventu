package com.example.dantruventu.DTO.Response;

import java.util.List;

public record CatalogOptionsResponse(List<Category> danhMuc, List<Brand> thuongHieu) {
  public record Category(
      Long id, Long danhMucChaId, String tenDanhMuc, String duongDanUrl, String anhDaiDien) {}

  public record Brand(Long id, String tenThuongHieu, String duongDanUrl, String logo) {}
}
