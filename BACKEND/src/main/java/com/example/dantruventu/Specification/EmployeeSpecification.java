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

public final class EmployeeSpecification {

  private EmployeeSpecification() {}

  public static Specification<NguoiDung> build(
      String keyword, TrangThaiCoBanEnum trangThai, Long vaiTroId) {

    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();

      Join<NguoiDung, VaiTro> vaiTroJoin = root.join("vaiTro", JoinType.INNER);

      Predicate notUser = cb.notEqual(cb.upper(vaiTroJoin.get("tenVaiTro")), "USER");
      Predicate notKhachHang = cb.notEqual(cb.lower(vaiTroJoin.get("tenVaiTro")), "khách hàng");
      Predicate notKhachHangNoAccent =
          cb.notEqual(cb.lower(vaiTroJoin.get("tenVaiTro")), "khach hang");
      Predicate notKhachHangCode = cb.notEqual(cb.upper(vaiTroJoin.get("tenVaiTro")), "KHACH_HANG");
      Predicate notKhachHangDesc =
          cb.or(
              cb.isNull(vaiTroJoin.get("moTa")),
              cb.notLike(cb.lower(vaiTroJoin.get("moTa")), "%khách hàng%"));

      predicates.add(
          cb.and(notUser, notKhachHang, notKhachHangNoAccent, notKhachHangCode, notKhachHangDesc));

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
        keywordPredicates.add(cb.like(cb.lower(root.get("email")), pattern, '!'));
        keywordPredicates.add(cb.like(root.get("soDienThoai"), pattern, '!'));

        if (trimmed.matches("^\\d+$")) {
          try {
            Long numericId = Long.parseLong(trimmed);
            keywordPredicates.add(cb.equal(root.get("id"), numericId));
          } catch (NumberFormatException ignored) {
            keywordPredicates.add(cb.like(root.get("id").as(String.class), pattern, '!'));
          }
        } else {
          keywordPredicates.add(cb.like(root.get("id").as(String.class), pattern, '!'));
        }

        predicates.add(cb.or(keywordPredicates.toArray(Predicate[]::new)));
      }

      if (trangThai != null) {
        predicates.add(cb.equal(root.get("trangThai"), trangThai));
      }

      if (vaiTroId != null) {
        predicates.add(cb.equal(vaiTroJoin.get("id"), vaiTroId));
      }

      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }
}
