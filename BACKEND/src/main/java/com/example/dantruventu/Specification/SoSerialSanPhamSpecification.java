package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Enum.TrangThaiSerial;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class SoSerialSanPhamSpecification {

  private SoSerialSanPhamSpecification() {}

  public static Specification<SoSerialSanPham> build(
      String keyword, String soSerial, TrangThaiSerial trangThai, Long phienBanId) {

    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();

      // Quét serial chính xác được ưu tiên hơn keyword.
      if (soSerial != null) {
        predicates.add(cb.equal(root.get("soSerial"), soSerial));
      } else if (keyword != null && !keyword.isBlank()) {
        String escaped =
            keyword
                .toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");

        String pattern = "%" + escaped + "%";

        var variant = root.join("phienBan");
        var product = variant.join("sanPham");

        predicates.add(
            cb.or(
                cb.like(cb.lower(root.<String>get("soSerial")), pattern, '!'),
                cb.like(cb.lower(variant.<String>get("tenPhienBan")), pattern, '!'),
                cb.like(cb.lower(variant.<String>get("maVach")), pattern, '!'),
                cb.like(cb.lower(product.<String>get("maSanPham")), pattern, '!'),
                cb.like(cb.lower(product.<String>get("tenSanPham")), pattern, '!')));
      }

      if (trangThai != null) {
        predicates.add(cb.equal(root.get("trangThai"), trangThai));

        // Danh sách chọn serial để bán phải chưa gắn đơn.
        if (trangThai == TrangThaiSerial.TRONG_KHO) {
          predicates.add(cb.isNull(root.get("donHang")));
        }
      }

      if (phienBanId != null) {
        predicates.add(cb.equal(root.get("phienBan").get("id"), phienBanId));
      }

      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }
}
