package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class ComboSpecification {

  private ComboSpecification() {}

  public static Specification<SanPham> build(String keywordPattern, TrangThaiCoBanEnum trangThai) {

    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();

      predicates.add(cb.equal(root.get("loaiSanPham"), LoaiSanPham.BO_PC));

      predicates.add(
          cb.or(
              cb.like(cb.lower(root.get("maSanPham")), keywordPattern, '!'),
              cb.like(cb.lower(root.get("tenSanPham")), keywordPattern, '!')));

      if (trangThai != null) {
        predicates.add(cb.equal(root.get("trangThai"), trangThai));
      }

      return cb.and(predicates.toArray(new Predicate[0]));
    };
  }
}
