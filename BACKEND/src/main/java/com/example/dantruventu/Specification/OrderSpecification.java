package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Enum.*;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class OrderSpecification {

  private OrderSpecification() {}

  public static Specification<DonHang> build(
      String keyword,
      LoaiDonHang type,
      TrangThaiDonHang orderStatus,
      TrangThaiThanhToanDonHang paymentStatus,
      TrangThaiDongGoi packingStatus,
      TrangThaiXuatKho stockStatus,
      LocalDate from,
      LocalDate to) {

    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();

      if (keyword != null && !keyword.isBlank()) {
        String value = "%" + escape(keyword.strip()) + "%";
        var customer = root.join("khachHang", JoinType.LEFT);

        predicates.add(
            cb.or(
                cb.like(cb.lower(root.get("maDonHang")), value, '!'),
                cb.like(cb.lower(customer.get("hoTen")), value, '!'),
                cb.like(customer.get("soDienThoai"), value, '!'),
                cb.like(cb.lower(root.get("tenNguoiNhan")), value, '!'),
                cb.like(root.get("sdtNguoiNhan"), value, '!')));
      }

      if (type != null) {
        predicates.add(cb.equal(root.get("loaiDonHang"), type));
      }
      if (orderStatus != null) {
        predicates.add(cb.equal(root.get("trangThaiDonHang"), orderStatus));
      }
      if (paymentStatus != null) {
        predicates.add(cb.equal(root.get("trangThaiThanhToan"), paymentStatus));
      }
      if (packingStatus != null) {
        predicates.add(cb.equal(root.get("trangThaiDongGoi"), packingStatus));
      }
      if (stockStatus != null) {
        predicates.add(cb.equal(root.get("trangThaiXuatKho"), stockStatus));
      }
      if (from != null) {
        predicates.add(cb.greaterThanOrEqualTo(root.get("ngayTao"), from.atStartOfDay()));
      }
      if (to != null) {
        predicates.add(cb.lessThan(root.get("ngayTao"), to.plusDays(1).atStartOfDay()));
      }

      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }

  private static String escape(String value) {
    return value.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_");
  }
}
