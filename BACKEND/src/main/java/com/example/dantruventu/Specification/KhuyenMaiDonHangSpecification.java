package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.KhuyenMaiDonHang;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class KhuyenMaiDonHangSpecification {
  private KhuyenMaiDonHangSpecification() {}

  public static Specification<KhuyenMaiDonHang> build(
      Long promotionId,
      String keyword,
      TrangThaiApDungKhuyenMai status,
      LocalDateTime fromInclusive,
      LocalDateTime toExclusive) {
    return (root, query, cb) -> {
      var predicates = new ArrayList<Predicate>();
      predicates.add(cb.equal(root.get("khuyenMai").get("id"), promotionId));
      if (status != null) {
        predicates.add(cb.equal(root.get("trangThaiApDung"), status));
      }
      if (keyword != null) {
        String escaped =
            keyword
                .toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        predicates.add(
            cb.like(cb.lower(root.get("donHang").get("maDonHang")), "%" + escaped + "%", '\\'));
      }
      if (fromInclusive != null) {
        predicates.add(cb.greaterThanOrEqualTo(root.get("donHang").get("ngayTao"), fromInclusive));
      }
      if (toExclusive != null) {
        predicates.add(cb.lessThan(root.get("donHang").get("ngayTao"), toExclusive));
      }
      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }
}
