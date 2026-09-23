package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class SanPhamSpecification {

  private SanPhamSpecification() {}

  public static Specification<SanPham> build(
      String keyword,
      Long danhMucId,
      Long thuongHieuId,
      TrangThaiCoBanEnum trangThai,
      LoaiSanPham loaiSanPham) {

    List<Specification<SanPham>> specifications = new ArrayList<>();

    if (keyword != null && !keyword.isBlank()) {

      String value = "%" + keyword.trim().toLowerCase() + "%";

      specifications.add(
          (root, query, cb) ->
              cb.or(
                  cb.like(cb.lower(root.get("tenSanPham")), value),
                  cb.like(cb.lower(root.get("maSanPham")), value)));
    }

    if (danhMucId != null) {
      specifications.add((root, query, cb) -> cb.equal(root.get("danhMuc").get("id"), danhMucId));
    }

    if (thuongHieuId != null) {
      specifications.add(
          (root, query, cb) -> cb.equal(root.get("thuongHieu").get("id"), thuongHieuId));
    }

    if (trangThai != null) {
      specifications.add((root, query, cb) -> cb.equal(root.get("trangThai"), trangThai));
    }

    if (loaiSanPham != null) {
      specifications.add((root, query, cb) -> cb.equal(root.get("loaiSanPham"), loaiSanPham));
    }

    return specifications.stream()
        .reduce(Specification::and)
        .orElse((root, query, cb) -> cb.conjunction());
  }
}
