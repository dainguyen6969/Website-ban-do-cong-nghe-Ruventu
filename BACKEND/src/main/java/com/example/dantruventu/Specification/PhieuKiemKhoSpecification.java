package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.PhieuKiemKho;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.TrangThaiPhieuKiemKho;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class PhieuKiemKhoSpecification {

  private PhieuKiemKhoSpecification() {}

  public static Specification<PhieuKiemKho> build(
      String keyword,
      TrangThaiPhieuKiemKho status,
      Long checkerId,
      LocalDateTime fromDateTime,
      LocalDateTime toExclusiveDateTime) {

    return (root, query, criteriaBuilder) -> {
      var predicates = new ArrayList<Predicate>();

      Join<PhieuKiemKho, PhienBanSanPham> variant =
          root.join("phienBan", JoinType.INNER);
      Join<PhienBanSanPham, SanPham> product =
          variant.join("sanPham", JoinType.INNER);

      if (keyword != null) {
        String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";

        predicates.add(
            criteriaBuilder.or(
                criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("maPhieu")), pattern),
                criteriaBuilder.like(
                    criteriaBuilder.lower(product.get("maSanPham")), pattern),
                criteriaBuilder.like(
                    criteriaBuilder.lower(product.get("tenSanPham")), pattern),
                criteriaBuilder.like(
                    criteriaBuilder.lower(variant.get("tenPhienBan")), pattern),
                criteriaBuilder.like(
                    criteriaBuilder.lower(variant.get("maVach")), pattern)));
      }

      if (status != null) {
        predicates.add(criteriaBuilder.equal(root.get("trangThai"), status));
      }

      if (checkerId != null) {
        predicates.add(criteriaBuilder.equal(root.get("nguoiKiem").get("id"), checkerId));
      }

      if (fromDateTime != null) {
        predicates.add(
            criteriaBuilder.greaterThanOrEqualTo(root.get("ngayTao"), fromDateTime));
      }

      if (toExclusiveDateTime != null) {
        predicates.add(criteriaBuilder.lessThan(root.get("ngayTao"), toExclusiveDateTime));
      }

      query.distinct(true);
      return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
    };
  }
}
