package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.NhaCungCap;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class NhaCungCapSpecification {

    private NhaCungCapSpecification() {}

    public static Specification<NhaCungCap> build(
            String keyword,
            TrangThaiCoBanEnum trangThai) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isBlank()) {
                String escaped =
                        keyword.strip()
                                .toLowerCase(Locale.ROOT)
                                .replace("!", "!!")
                                .replace("%", "!%")
                                .replace("_", "!_");

                String pattern = "%" + escaped + "%";

                predicates.add(
                        cb.or(
                                cb.like(
                                        cb.lower(root.<String>get("maNhaCungCap")),
                                        pattern,
                                        '!'),
                                cb.like(
                                        cb.lower(root.<String>get("tenNhaCungCap")),
                                        pattern,
                                        '!'),
                                cb.like(
                                        root.<String>get("soDienThoai"),
                                        pattern,
                                        '!')));
            }

            if (trangThai != null) {
                predicates.add(
                        cb.equal(root.get("trangThai"), trangThai));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}