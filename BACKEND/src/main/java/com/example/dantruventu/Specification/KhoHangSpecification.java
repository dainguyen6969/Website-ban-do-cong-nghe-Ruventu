package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.KhoHang;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class KhoHangSpecification {

    private KhoHangSpecification() {}

    public static Specification<KhoHang> build(
            String keyword,
            TrangThaiCoBanEnum trangThai) {

        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isBlank()) {
                String pattern =
                        "%"
                                + keyword.trim()
                                .toLowerCase(Locale.ROOT)
                                .replace("!", "!!")
                                .replace("%", "!%")
                                .replace("_", "!_")
                                + "%";

                predicates.add(
                        cb.or(
                                cb.like(cb.lower(root.get("maKho")), pattern, '!'),
                                cb.like(cb.lower(root.get("tenKho")), pattern, '!'),
                                cb.like(cb.lower(root.get("diaChi")), pattern, '!')));
            }

            if (trangThai != null) {
                predicates.add(cb.equal(root.get("trangThai"), trangThai));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}