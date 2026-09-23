package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.DoiTacVanChuyen;
import com.example.dantruventu.Enum.LoaiDoiTacVanChuyenEnum;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class DoiTacVanChuyenSpecification {

  private DoiTacVanChuyenSpecification() {}

  public static Specification<DoiTacVanChuyen> build(
      String keyword, LoaiDoiTacVanChuyenEnum loaiDoiTac, TrangThaiCoBanEnum trangThai) {

    return (root, query, cb) -> {
      List<Predicate> conditions = new ArrayList<>();

      if (keyword != null && !keyword.isBlank()) {
        String pattern = pattern(keyword);

        conditions.add(
            cb.or(
                cb.like(cb.lower(root.<String>get("tenDoiTac")), pattern, '!'),
                cb.like(root.<String>get("soDienThoai"), pattern, '!')));
      }

      if (loaiDoiTac != null) {
        conditions.add(cb.equal(root.get("loaiDoiTac"), loaiDoiTac));
      }

      if (trangThai != null) {
        conditions.add(cb.equal(root.get("trangThai"), trangThai));
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
