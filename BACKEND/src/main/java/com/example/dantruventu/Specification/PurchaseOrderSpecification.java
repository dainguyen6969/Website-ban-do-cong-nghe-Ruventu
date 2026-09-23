package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.DonNhapHang;
import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanNhap;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class PurchaseOrderSpecification {

  private PurchaseOrderSpecification() {}

  public static Specification<DonNhapHang> build(
      String keyword,
      Long nhaCungCapId,
      TrangThaiNhapHang trangThaiNhap,
      TrangThaiThanhToanNhap trangThaiThanhToan) {

    List<Specification<DonNhapHang>> specs = new ArrayList<>();

    if (keyword != null && !keyword.isBlank()) {

      String value = "%" + keyword.trim().toLowerCase() + "%";

      specs.add(
          (root, query, cb) ->
              cb.or(
                  cb.like(cb.lower(root.get("maDonNhap")), value),
                  cb.like(cb.lower(root.get("nhaCungCap").get("tenNhaCungCap")), value),
                  cb.like(cb.lower(root.get("nhaCungCap").get("maNhaCungCap")), value)));
    }

    if (nhaCungCapId != null) {
      specs.add((root, query, cb) -> cb.equal(root.get("nhaCungCap").get("id"), nhaCungCapId));
    }

    if (trangThaiNhap != null) {
      specs.add((root, query, cb) -> cb.equal(root.get("trangThaiNhap"), trangThaiNhap));
    }

    if (trangThaiThanhToan != null) {
      specs.add((root, query, cb) -> cb.equal(root.get("trangThaiThanhToan"), trangThaiThanhToan));
    }

    Specification<DonNhapHang> result = (root, query, cb) -> cb.conjunction();

    for (Specification<DonNhapHang> spec : specs) {
      result = result.and(spec);
    }

    return result;
  }
}
