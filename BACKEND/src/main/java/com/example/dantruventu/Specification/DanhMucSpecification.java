package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class DanhMucSpecification {

  private DanhMucSpecification() {}

  public static Specification<DanhMuc> build(
      String keyword, TrangThaiCoBanEnum trangThai, Long danhMucChaId) {

    List<Specification<DanhMuc>> specifications = new ArrayList<>();

    if (keyword != null && !keyword.isBlank()) {

      String value = "%" + keyword.trim().toLowerCase() + "%";

      specifications.add((root, query, cb) -> cb.like(cb.lower(root.get("tenDanhMuc")), value));
    }

    if (trangThai != null) {
      specifications.add((root, query, cb) -> cb.equal(root.get("trangThai"), trangThai));
    }

    if (danhMucChaId != null) {
      specifications.add(
          (root, query, cb) -> cb.equal(root.get("danhMucCha").get("id"), danhMucChaId));
    }

    Specification<DanhMuc> result = (root, query, cb) -> cb.conjunction();

    for (Specification<DanhMuc> specification : specifications) {

      result = result.and(specification);
    }

    return result;
  }
}
