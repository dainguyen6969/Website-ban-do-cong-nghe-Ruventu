package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.VaiTro;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class RoleSpecification {

  private RoleSpecification() {}

  public static Specification<VaiTro> build(String keyword) {

    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();

        predicates.add(cb.notEqual(root.get("maVaiTro"), "USER"));

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
        keywordPredicates.add(cb.like(cb.lower(root.get("tenVaiTro")), pattern, '!'));

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

      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }
}
