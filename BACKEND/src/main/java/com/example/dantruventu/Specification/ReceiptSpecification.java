package com.example.dantruventu.Specification;

import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class ReceiptSpecification {

  private ReceiptSpecification() {}

  public static Specification<SoQuyThuChi> build(
      String keyword, TrangThaiPhieuThuChi trangThai, LocalDate tuNgay, LocalDate denNgay) {

    Specification<SoQuyThuChi> result =
        (root, query, cb) -> cb.equal(root.get("loaiPhieu"), LoaiPhieuThuChi.THU);

    if (keyword != null && !keyword.isBlank()) {
      String value = "%" + keyword.strip().toLowerCase(Locale.ROOT) + "%";
      result =
          result.and(
              (root, query, cb) ->
                  cb.or(
                      cb.like(cb.lower(root.get("maPhieu")), value),
                      cb.like(cb.lower(root.get("tenNguoiNopNhan")), value),
                      cb.like(cb.lower(root.get("maChungTuThamChieu")), value)));
    }

    if (trangThai != null) {
      result = result.and((root, query, cb) -> cb.equal(root.get("trangThai"), trangThai));
    }

    if (tuNgay != null) {
      LocalDateTime start = tuNgay.atStartOfDay();
      result =
          result.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("ngayGhiNhan"), start));
    }

    if (denNgay != null) {
      LocalDateTime exclusiveEnd = denNgay.plusDays(1).atStartOfDay();
      result = result.and((root, query, cb) -> cb.lessThan(root.get("ngayGhiNhan"), exclusiveEnd));
    }

    return result;
  }

  /*
   * Quy tắc tái sử dụng cho tổng quỹ tương lai: dùng toàn bộ tập kết quả đã lọc (không
   * Pageable), theo ngayGhiNhan, rồi chỉ SUM các dòng DA_GHI_NHAN. COD chưa được đơn vị
   * vận chuyển chuyển về không thuộc phép tổng này.
   */
  public static Specification<SoQuyThuChi> buildConfirmedForAggregation(
      String keyword, TrangThaiPhieuThuChi trangThai, LocalDate tuNgay, LocalDate denNgay) {
    return build(keyword, trangThai, tuNgay, denNgay)
        .and(
            (root, query, cb) -> cb.equal(root.get("trangThai"), TrangThaiPhieuThuChi.DA_GHI_NHAN));
  }
}
