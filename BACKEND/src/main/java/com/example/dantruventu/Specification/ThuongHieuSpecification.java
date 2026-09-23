package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.ThuongHieu;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class ThuongHieuSpecification {

  private ThuongHieuSpecification() {}

  public static Specification<ThuongHieu> build(String keyword, TrangThaiCoBanEnum trangThai) {

    return (root, query, cb) -> {
      List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

      if (keyword != null && !keyword.isBlank()) {
        String escaped =
            keyword
                .trim()
                .toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");

        String pattern = "%" + escaped + "%";

        predicates.add(
            cb.or(
                cb.like(cb.lower(root.get("tenThuongHieu")), pattern, '!'),
                cb.like(cb.lower(root.get("duongDanUrl")), pattern, '!')));
      }

      if (trangThai != null) {
        predicates.add(cb.equal(root.get("trangThai"), trangThai));
      }

      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }
}
