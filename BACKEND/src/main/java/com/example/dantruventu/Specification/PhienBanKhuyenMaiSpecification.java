package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class PhienBanKhuyenMaiSpecification {

  private PhienBanKhuyenMaiSpecification() {}

  public static Specification<PhienBanSanPham> activeVariants(String keyword) {
    return (root, query, criteriaBuilder) -> {
      List<Predicate> predicates = new ArrayList<>();

      Join<PhienBanSanPham, SanPham> product = root.join("sanPham", JoinType.INNER);

      predicates.add(criteriaBuilder.equal(root.get("trangThai"), TrangThaiCoBanEnum.HOAT_DONG));
      predicates.add(criteriaBuilder.equal(product.get("trangThai"), TrangThaiCoBanEnum.HOAT_DONG));

      if (keyword != null) {
        String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";

        predicates.add(
            criteriaBuilder.or(
                criteriaBuilder.like(
                    criteriaBuilder.lower(product.get("maSanPham")), pattern, '\\'),
                criteriaBuilder.like(
                    criteriaBuilder.lower(product.get("tenSanPham")), pattern, '\\'),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("tenPhienBan")), pattern, '\\'),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("maVach")), pattern, '\\')));
      }

      return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
    };
  }

  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
