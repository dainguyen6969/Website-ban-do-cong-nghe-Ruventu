package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhieuGiaoHang;
import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class PhieuGiaoHangSpecification {

  private PhieuGiaoHangSpecification() {}

  public static Specification<PhieuGiaoHang> byPartner(
      Long partnerId, String keyword, TrangThaiGiaoHangEnum trangThai) {

    return (root, query, cb) -> {
      List<Predicate> conditions = new ArrayList<>();

      conditions.add(cb.equal(root.get("doiTacVanChuyen").get("id"), partnerId));

      if (trangThai != null) {
        conditions.add(cb.equal(root.get("trangThaiGiaoHang"), trangThai));
      }

      if (keyword != null && !keyword.isBlank()) {
        Join<PhieuGiaoHang, DonHang> order = root.join("donHang", JoinType.INNER);

        String pattern = pattern(keyword);

        conditions.add(
            cb.or(
                cb.like(cb.lower(root.<String>get("maPhieuGiaoHang")), pattern, '!'),
                cb.like(cb.lower(root.<String>get("maVanDon")), pattern, '!'),
                cb.like(cb.lower(order.<String>get("maDonHang")), pattern, '!')));
      }

      return cb.and(conditions.toArray(Predicate[]::new));
    };
  }

  private static String pattern(String keyword) {
    String escaped =
        keyword
            .strip()
            .toLowerCase(Locale.ROOT)
            .replace("!", "!!")
            .replace("%", "!%")
            .replace("_", "!_");

    return "%" + escaped + "%";
  }
}
