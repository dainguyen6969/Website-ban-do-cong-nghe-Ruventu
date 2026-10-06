package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import java.time.LocalDateTime;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class DisbursementSpecification {

  private DisbursementSpecification() {}

  public static Specification<SoQuyThuChi> build(
      String keyword,
      Long receiptTypeId,
      NhomNguoiNopNhanEnum payerGroup,
      String paymentMethod,
      Long creatorId,
      NguonTaoPhieuThuChi source,
      TrangThaiPhieuThuChi status,
      LocalDateTime startInclusive,
      LocalDateTime endExclusive) {

    Specification<SoQuyThuChi> result =
        (root, query, cb) -> cb.equal(root.get("loaiPhieu"), LoaiPhieuThuChi.CHI);

    if (keyword != null && !keyword.isBlank()) {
      String escaped =
          keyword
              .strip()
              .toLowerCase(Locale.ROOT)
              .replace("!", "!!")
              .replace("%", "!%")
              .replace("_", "!_");
      String pattern = "%" + escaped + "%";

      result =
          result.and(
              (root, query, cb) ->
                  cb.or(
                      cb.like(cb.lower(root.<String>get("maPhieu")), pattern, '!'),
                      cb.like(cb.lower(root.<String>get("tenNguoiNopNhan")), pattern, '!'),
                      cb.like(cb.lower(root.<String>get("maChungTuThamChieu")), pattern, '!')));
    }

    if (receiptTypeId != null) {
      result =
          result.and(
              (root, query, cb) -> cb.equal(root.get("loaiThuChi").get("id"), receiptTypeId));
    }

    if (payerGroup != null) {
      result = result.and((root, query, cb) -> cb.equal(root.get("nhomNguoiNopNhan"), payerGroup));
    }

    if (paymentMethod != null) {
      result =
          result.and((root, query, cb) -> cb.equal(root.get("phuongThucThanhToan"), paymentMethod));
    }

    if (creatorId != null) {
      result = result.and((root, query, cb) -> cb.equal(root.get("nguoiTao").get("id"), creatorId));
    }

    if (source != null) {
      result = result.and((root, query, cb) -> cb.equal(root.get("nguonTao"), source));
    }

    if (status != null) {
      result = result.and((root, query, cb) -> cb.equal(root.get("trangThai"), status));
    }

    if (startInclusive != null) {
      result =
          result.and(
              (root, query, cb) ->
                  cb.greaterThanOrEqualTo(root.get("ngayGhiNhan"), startInclusive));
    }

    if (endExclusive != null) {
      result = result.and((root, query, cb) -> cb.lessThan(root.get("ngayGhiNhan"), endExclusive));
    }

    return result;
  }

  /*
   * Quy tắc tổng chi tương lai: tái sử dụng toàn bộ filter này không kèm Pageable, lọc thêm
   * DA_GHI_NHAN và SUM soTien theo ngayGhiNhan. Không cộng riêng trang hiện tại; COD chưa
   * chuyển về quỹ không phải một filter của danh sách này.
   */
  public static Specification<SoQuyThuChi> buildConfirmedForAggregation(
      String keyword,
      Long receiptTypeId,
      NhomNguoiNopNhanEnum payerGroup,
      String paymentMethod,
      Long creatorId,
      NguonTaoPhieuThuChi source,
      TrangThaiPhieuThuChi status,
      LocalDateTime startInclusive,
      LocalDateTime endExclusive) {
    return build(
            keyword,
            receiptTypeId,
            payerGroup,
            paymentMethod,
            creatorId,
            source,
            status,
            startInclusive,
            endExclusive)
        .and(
            (root, query, cb) -> cb.equal(root.get("trangThai"), TrangThaiPhieuThuChi.DA_GHI_NHAN));
  }
}
