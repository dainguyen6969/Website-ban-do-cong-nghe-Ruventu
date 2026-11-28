package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Entity.KhuyenMaiDonHang;
import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiHienThiKhuyenMai;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class KhuyenMaiSpecification {

  private KhuyenMaiSpecification() {}

  public static Specification<KhuyenMai> build(
      String keyword,
      PhuongThucKhuyenMai promotionMethod,
      DoiTuongKhuyenMai target,
      TrangThaiCoBanEnum status,
      TrangThaiHienThiKhuyenMai displayStatus,
      LocalDateTime fromInclusive,
      LocalDateTime toExclusive,
      LocalDateTime now) {

    return (root, query, criteriaBuilder) -> {
      List<Predicate> predicates = new ArrayList<>();

      if (keyword != null) {
        String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";

        predicates.add(
            criteriaBuilder.or(
                criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("maChuongTrinh")), pattern, '\\'),
                criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("tenChuongTrinh")), pattern, '\\')));
      }

      if (promotionMethod != null) {
        predicates.add(criteriaBuilder.equal(root.get("phuongThucKhuyenMai"), promotionMethod));
      }

      if (target != null) {
        predicates.add(criteriaBuilder.equal(root.get("doiTuongKhuyenMai"), target));
      }

      if (status != null) {
        predicates.add(criteriaBuilder.equal(root.get("trangThai"), status));
      }

      if (fromInclusive != null) {
        predicates.add(
            criteriaBuilder.greaterThanOrEqualTo(root.get("ngayKetThuc"), fromInclusive));
      }
      if (toExclusive != null) {
        predicates.add(criteriaBuilder.lessThan(root.get("ngayBatDau"), toExclusive));
      }
      if (displayStatus != null) {
        predicates.add(matchesDisplayStatus(root, query, criteriaBuilder, displayStatus, now));
      }

      return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
    };
  }

  private static Predicate matchesDisplayStatus(
      Root<KhuyenMai> promotion,
      CriteriaQuery<?> query,
      CriteriaBuilder cb,
      TrangThaiHienThiKhuyenMai status,
      LocalDateTime now) {
    Predicate enabled = cb.equal(promotion.get("trangThai"), TrangThaiCoBanEnum.HOAT_DONG);
    Expression<LocalDateTime> start = promotion.get("ngayBatDau");
    Expression<LocalDateTime> end = promotion.get("ngayKetThuc");

    return switch (status) {
      case TAM_DUNG -> cb.equal(promotion.get("trangThai"), TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
      case CHUA_BAT_DAU -> cb.and(enabled, cb.greaterThan(start, now));
      case HET_HAN -> cb.and(enabled, cb.lessThanOrEqualTo(start, now), cb.lessThan(end, now));
      case HET_LUOT, DANG_AP_DUNG -> {
        Subquery<Long> held = query.subquery(Long.class);
        Root<KhuyenMaiDonHang> usage = held.from(KhuyenMaiDonHang.class);
        held.select(cb.count(usage))
            .where(
                cb.equal(usage.get("khuyenMai").get("id"), promotion.get("id")),
                cb.equal(usage.get("trangThaiApDung"), TrangThaiApDungKhuyenMai.GIU_CHO));
        Expression<Long> occupied =
            cb.sum(cb.coalesce(promotion.<Integer>get("soLuongDaDung"), 0).as(Long.class), held);
        Expression<Integer> limit = promotion.get("soLuongApDung");
        Predicate availability =
            status == TrangThaiHienThiKhuyenMai.HET_LUOT
                ? cb.and(cb.isNotNull(limit), cb.ge(occupied, limit))
                : cb.or(cb.isNull(limit), cb.lt(occupied, limit));
        yield cb.and(
            enabled,
            cb.lessThanOrEqualTo(start, now),
            cb.greaterThanOrEqualTo(end, now),
            availability);
      }
    };
  }

  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
