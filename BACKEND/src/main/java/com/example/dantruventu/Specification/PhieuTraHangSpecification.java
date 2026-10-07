package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class PhieuTraHangSpecification {

  private PhieuTraHangSpecification() {}

  public static Specification<PhieuTraHang> build(
      String keyword, TrangThaiTraHang returnStatus) {

    return (root, query, criteriaBuilder) -> {
      List<Predicate> predicates = new ArrayList<>();

      if (returnStatus != null) {
        predicates.add(criteriaBuilder.equal(root.get("trangThaiTraHang"), returnStatus));
      }

      if (keyword != null) {
        String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
        var order = root.join("donHang", JoinType.INNER);
        Join<PhieuTraHang, NguoiDung> customer =
            root.join("khachHang", JoinType.LEFT);

        predicates.add(
            criteriaBuilder.or(
                criteriaBuilder.like(criteriaBuilder.lower(root.get("maTraHang")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(order.get("maDonHang")), pattern),
                criteriaBuilder.like(criteriaBuilder.lower(customer.get("hoTen")), pattern),
                criteriaBuilder.like(
                    criteriaBuilder.lower(customer.get("soDienThoai")), pattern)));
      }

      return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
    };
  }
}
