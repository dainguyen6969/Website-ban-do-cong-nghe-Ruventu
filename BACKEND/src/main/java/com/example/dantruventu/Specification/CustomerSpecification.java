package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class CustomerSpecification {

  private CustomerSpecification() {}

  public static Specification<NguoiDung> build(String keyword, TrangThaiCoBanEnum trangThai) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();

      Join<NguoiDung, VaiTro> vaiTroJoin = root.join("vaiTro", JoinType.INNER);

      Predicate isUser = cb.equal(cb.upper(vaiTroJoin.get("tenVaiTro")), "USER");
      Predicate isKhachHangCode = cb.equal(cb.upper(vaiTroJoin.get("tenVaiTro")), "KHACH_HANG");
      Predicate isKhachHang = cb.equal(cb.lower(vaiTroJoin.get("tenVaiTro")), "khách hàng");
      Predicate isKhachHangNoAccent = cb.equal(cb.lower(vaiTroJoin.get("tenVaiTro")), "khach hang");
      Predicate isKhachHangDesc =
          cb.and(
              cb.isNotNull(vaiTroJoin.get("moTa")),
              cb.or(
                  cb.like(cb.lower(vaiTroJoin.get("moTa")), "%khách hàng%"),
                  cb.like(cb.lower(vaiTroJoin.get("moTa")), "%khach hang%")));

      predicates.add(
          cb.or(isUser, isKhachHangCode, isKhachHang, isKhachHangNoAccent, isKhachHangDesc));

      if (keyword != null && !keyword.isBlank()) {
        String trimmed = keyword.trim();
        String escaped =
            trimmed
                .toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
        String pattern = "%" + escaped + "%";

        List<Predicate> keywordPredicates = new ArrayList<>();
        keywordPredicates.add(cb.like(cb.lower(root.get("hoTen")), pattern, '!'));
        keywordPredicates.add(cb.like(root.get("soDienThoai"), pattern, '!'));
        keywordPredicates.add(
            cb.and(
                cb.isNotNull(root.get("email")),
                cb.like(cb.lower(root.get("email")), pattern, '!')));

        predicates.add(cb.or(keywordPredicates.toArray(Predicate[]::new)));
      }

      if (trangThai != null) {
        predicates.add(cb.equal(root.get("trangThai"), trangThai));
      }

      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }
}
