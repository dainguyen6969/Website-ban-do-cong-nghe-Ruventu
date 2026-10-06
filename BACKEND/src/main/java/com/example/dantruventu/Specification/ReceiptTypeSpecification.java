package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.LoaiThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class ReceiptTypeSpecification {

  private ReceiptTypeSpecification() {}

  public static Specification<LoaiThuChi> build(
      String keyword, LoaiPhieuThuChi voucherType, TrangThaiCoBanEnum status) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();

      predicates.add(cb.equal(root.get("loaiPhieu"), voucherType));

      if (keyword != null && !keyword.isBlank()) {
        String escaped =
            keyword
                .strip()
                .toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
        String pattern = "%" + escaped + "%";

        predicates.add(
            cb.or(
                cb.like(cb.lower(root.<String>get("maLoai")), pattern, '!'),
                cb.like(cb.lower(root.<String>get("tenLoai")), pattern, '!')));
      }

      if (status != null) {
        predicates.add(cb.equal(root.get("trangThai"), status));
      }

      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }
}
