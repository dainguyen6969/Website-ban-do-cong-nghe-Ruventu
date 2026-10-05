package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import java.time.LocalDateTime;
import org.springframework.data.jpa.domain.Specification;

public final class CashbookSpecification {

  private CashbookSpecification() {}

  public static Specification<SoQuyThuChi> build(
      LocalDateTime startInclusive,
      LocalDateTime endExclusive,
      String keywordPattern,
      LoaiPhieuThuChi voucherType,
      String paymentMethod,
      NhomNguoiNopNhanEnum payerGroup,
      String payerNamePattern,
      Long creatorId) {

    Specification<SoQuyThuChi> result =
        (root, query, cb) ->
            cb.and(
                cb.equal(root.get("trangThai"), TrangThaiPhieuThuChi.DA_GHI_NHAN),
                cb.isNotNull(root.get("ngayGhiNhan")));

    if (startInclusive != null) {
      result =
          result.and(
              (root, query, cb) ->
                  cb.greaterThanOrEqualTo(root.get("ngayGhiNhan"), startInclusive));
    }

    if (endExclusive != null) {
      result = result.and((root, query, cb) -> cb.lessThan(root.get("ngayGhiNhan"), endExclusive));
    }

    if (keywordPattern != null) {
      result =
          result.and(
              (root, query, cb) ->
                  cb.or(
                      cb.like(cb.lower(root.<String>get("maPhieu")), keywordPattern, '!'),
                      cb.like(cb.lower(root.<String>get("tenNguoiNopNhan")), keywordPattern, '!'),
                      cb.like(
                          cb.lower(root.<String>get("maChungTuThamChieu")), keywordPattern, '!')));
    }

    if (voucherType != null) {
      result = result.and((root, query, cb) -> cb.equal(root.get("loaiPhieu"), voucherType));
    }

    if (paymentMethod != null) {
      result =
          result.and((root, query, cb) -> cb.equal(root.get("phuongThucThanhToan"), paymentMethod));
    }

    if (payerGroup != null) {
      result = result.and((root, query, cb) -> cb.equal(root.get("nhomNguoiNopNhan"), payerGroup));
    }

    if (payerNamePattern != null) {
      result =
          result.and(
              (root, query, cb) ->
                  cb.like(cb.lower(root.<String>get("tenNguoiNopNhan")), payerNamePattern, '!'));
    }

    if (creatorId != null) {
      result = result.and((root, query, cb) -> cb.equal(root.get("nguoiTao").get("id"), creatorId));
    }

    return result;
  }
}
