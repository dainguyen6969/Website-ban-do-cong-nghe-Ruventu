package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhieuGiaoHang;
import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class DeliverySpecification {

  private DeliverySpecification() {}

  public static Specification<PhieuGiaoHang> build(
      String keyword, TrangThaiGiaoHangEnum status, Long partnerId) {

    return (root, query, cb) -> {
      List<Predicate> conditions = new ArrayList<>();

      if (status != null) {
        conditions.add(cb.equal(root.get("trangThaiGiaoHang"), status));
      }

      if (partnerId != null) {
        conditions.add(cb.equal(root.get("doiTacVanChuyen").get("id"), partnerId));
      }

      if (keyword != null && !keyword.isBlank()) {
        Join<PhieuGiaoHang, DonHang> order = root.join("donHang");

        String pattern =
            "%"
                + keyword
                    .strip()
                    .toLowerCase(Locale.ROOT)
                    .replace("!", "!!")
                    .replace("%", "!%")
                    .replace("_", "!_")
                + "%";

        conditions.add(
            cb.or(
                cb.like(cb.lower(root.get("maPhieuGiaoHang")), pattern, '!'),
                cb.like(cb.lower(root.get("maVanDon")), pattern, '!'),
                cb.like(cb.lower(order.get("maDonHang")), pattern, '!'),
                cb.like(cb.lower(order.get("tenNguoiNhan")), pattern, '!'),
                cb.like(order.get("sdtNguoiNhan"), pattern, '!')));
      }

      return cb.and(conditions.toArray(Predicate[]::new));
    };
  }
}
