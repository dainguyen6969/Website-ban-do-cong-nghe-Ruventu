package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class PhieuTraHangSpecification {

  private PhieuTraHangSpecification() {}

  public static Specification<PhieuTraHang> build(
      String keyword,
      TrangThaiTraHang returnStatus,
      LocalDateTime fromInclusive,
      LocalDateTime toExclusive) {

    return (root, query, criteriaBuilder) -> {
      query.distinct(true);
      List<Predicate> predicates = new ArrayList<>();

      if (returnStatus != null) {
        if (returnStatus == TrangThaiTraHang.HOAN_TAT) {
          predicates.add(
              root.get("trangThaiTraHang")
                  .in(TrangThaiTraHang.HOAN_TAT, TrangThaiTraHang.DA_HOAN_TIEN));
        } else {
          predicates.add(criteriaBuilder.equal(root.get("trangThaiTraHang"), returnStatus));
        }
      }

      if (keyword != null) {
        String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
        var order = root.join("donHang", JoinType.INNER);
        Join<PhieuTraHang, NguoiDung> customer = root.join("khachHang", JoinType.LEFT);

        predicates.add(
            criteriaBuilder.or(
                criteriaBuilder.like(criteriaBuilder.lower(root.get("maTraHang")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(order.get("maDonHang")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("tenNguoiLienHe")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("sdtNguoiLienHe")), pattern),
                // Tương thích phiếu cũ được tạo trước khi có snapshot liên hệ.
                criteriaBuilder.like(criteriaBuilder.lower(order.get("tenNguoiNhan")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(order.get("sdtNguoiNhan")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(customer.get("hoTen")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(customer.get("soDienThoai")), pattern)));
      }

      if (fromInclusive != null) {
        predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("ngayTao"), fromInclusive));
      }

      if (toExclusive != null) {
        predicates.add(criteriaBuilder.lessThan(root.get("ngayTao"), toExclusive));
      }

      return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
    };
  }
}
