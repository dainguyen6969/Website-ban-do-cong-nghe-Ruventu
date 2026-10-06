package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class KhuyenMaiSpecification {

  private KhuyenMaiSpecification() {}

  public static Specification<KhuyenMai> build(
      String keyword, PhuongThucKhuyenMai promotionMethod, TrangThaiCoBanEnum status) {

    return (root, query, criteriaBuilder) -> {
      List<Predicate> predicates = new ArrayList<>();

      if (keyword != null) {
        String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";

        predicates.add(
            criteriaBuilder.or(
                criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("maChuongTrinh")), pattern, '\\'),
                criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("tenChuongTrinh")), pattern, '\\')));
      }

      if (promotionMethod != null) {
        predicates.add(criteriaBuilder.equal(root.get("phuongThucKhuyenMai"), promotionMethod));
      }

      if (status != null) {
        predicates.add(criteriaBuilder.equal(root.get("trangThai"), status));
      }

      return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
    };
  }

  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
