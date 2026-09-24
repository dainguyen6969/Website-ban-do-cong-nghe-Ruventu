package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class SalesSpecification {

  private SalesSpecification() {}

  private static String like(String value) {

    String text = value == null ? "" : value.strip().toLowerCase(Locale.ROOT);

    return "%" + text.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
  }

  public static Specification<PhienBanSanPham> products(String keyword) {

    return (root, query, cb) -> {
      var product = root.join("sanPham");
      String pattern = like(keyword);

      return cb.and(
          cb.equal(root.get("trangThai"), TrangThaiCoBanEnum.HOAT_DONG),
          cb.equal(product.get("trangThai"), TrangThaiCoBanEnum.HOAT_DONG),
          cb.or(
              cb.like(cb.lower(product.get("maSanPham")), pattern, '!'),
              cb.like(cb.lower(product.get("tenSanPham")), pattern, '!'),
              cb.like(cb.lower(root.get("tenPhienBan")), pattern, '!'),
              cb.like(cb.lower(root.get("maVach")), pattern, '!')));
    };
  }

  public static Specification<NguoiDung> customers(String keyword) {

    return (root, query, cb) -> {
      String pattern = like(keyword);

      return cb.and(
          cb.equal(root.get("trangThai"), TrangThaiCoBanEnum.HOAT_DONG),
          cb.equal(root.join("vaiTro").get("tenVaiTro"), "USER"),
          cb.or(
              cb.like(cb.lower(root.get("hoTen")), pattern, '!'),
              cb.like(cb.lower(root.get("email")), pattern, '!'),
              cb.like(cb.lower(root.get("soDienThoai")), pattern, '!')));
    };
  }
}
