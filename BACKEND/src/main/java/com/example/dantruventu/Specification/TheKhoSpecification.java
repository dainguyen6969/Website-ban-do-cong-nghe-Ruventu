package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.TheKho;
import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class TheKhoSpecification {

    private TheKhoSpecification() {}

    public static Specification<TheKho> build(
            Long khoHangId,
            Long phienBanId,
            LoaiGiaoDichKho loaiGiaoDich,
            LocalDateTime tuNgay,
            LocalDateTime denNgayExclusive) {

        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            if (khoHangId != null) {
                predicates.add(
                        cb.equal(root.get("khoHang").get("id"), khoHangId));
            }

            if (phienBanId != null) {
                predicates.add(
                        cb.equal(root.get("phienBan").get("id"), phienBanId));
            }

            if (loaiGiaoDich != null) {
                predicates.add(
                        cb.equal(root.get("loaiGiaoDich"), loaiGiaoDich));
            }

            if (tuNgay != null) {
                predicates.add(
                        cb.greaterThanOrEqualTo(
                                root.<LocalDateTime>get("ngayTao"), tuNgay));
            }

            if (denNgayExclusive != null) {
                predicates.add(
                        cb.lessThan(
                                root.<LocalDateTime>get("ngayTao"), denNgayExclusive));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}