package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface DonHangRepository
    extends JpaRepository<DonHang, Long>, JpaSpecificationExecutor<DonHang> {

  interface CustomerOrderSummary {
    Long getId();

    String getMaDonHang();

    LocalDateTime getNgayTao();

    BigDecimal getTongThanhToan();

    com.example.dantruventu.Enum.TrangThaiThanhToanDonHang getTrangThaiThanhToan();

    TrangThaiDonHang getTrangThaiDonHang();

    Long getSoLuongSanPham();
  }

  @Query(
      value =
          """
          SELECT d.id AS id,
                 d.maDonHang AS maDonHang,
                 d.ngayTao AS ngayTao,
                 d.tongThanhToan AS tongThanhToan,
                 d.trangThaiThanhToan AS trangThaiThanhToan,
                 d.trangThaiDonHang AS trangThaiDonHang,
                 COALESCE(SUM(ct.soLuong), 0) AS soLuongSanPham
          FROM DonHang d
          LEFT JOIN d.danhSachChiTietDonHang ct
          WHERE d.khachHang.id = :customerId
            AND (:status IS NULL OR d.trangThaiDonHang = :status)
          GROUP BY d.id, d.maDonHang, d.ngayTao, d.tongThanhToan,
                   d.trangThaiThanhToan, d.trangThaiDonHang
          """,
      countQuery =
          """
          SELECT COUNT(d)
          FROM DonHang d
          WHERE d.khachHang.id = :customerId
            AND (:status IS NULL OR d.trangThaiDonHang = :status)
          """)
  Page<CustomerOrderSummary> findCustomerOrders(
      @Param("customerId") Long customerId,
      @Param("status") TrangThaiDonHang status,
      Pageable pageable);

  @EntityGraph(attributePaths = "khachHang")
  Optional<DonHang> findByIdAndKhachHangId(Long id, Long customerId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      SELECT d FROM DonHang d
      JOIN FETCH d.khachHang
      WHERE d.id = :id
        AND d.khachHang.id = :customerId
      """)
  Optional<DonHang> findCustomerOrderForUpdate(
      @Param("id") Long id, @Param("customerId") Long customerId);

  Optional<DonHang> findByMaDonHangIgnoreCaseAndSdtNguoiNhan(String maDonHang, String sdtNguoiNhan);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT d FROM DonHang d WHERE d.id = :id")
  Optional<DonHang> findByIdForUpdate(@Param("id") Long id);

  @Override
  @EntityGraph(attributePaths = {"khachHang"})
  Page<DonHang> findAll(Specification<DonHang> specification, Pageable pageable);

  @Query(
      """
            SELECT d.id
            FROM DonHang d
            WHERE d.id > :afterId
              AND d.loaiDonHang =
                  com.example.dantruventu.Enum.LoaiDonHang.ONLINE
              AND d.trangThaiDongGoi =
                  com.example.dantruventu.Enum.TrangThaiDongGoi.CHUA_DONG_GOI
              AND d.trangThaiXuatKho =
                  com.example.dantruventu.Enum.TrangThaiXuatKho.CHUA_XUAT_KHO
              AND d.trangThaiDonHang IN (
                  com.example.dantruventu.Enum.TrangThaiDonHang.CHO_DUYET,
                  com.example.dantruventu.Enum.TrangThaiDonHang.CHO_HANG
              )
              AND (
                  (
                      d.trangThaiThanhToan IN (
                          com.example.dantruventu.Enum.TrangThaiThanhToanDonHang.THANH_TOAN_MOT_PHAN,
                          com.example.dantruventu.Enum.TrangThaiThanhToanDonHang.DA_THANH_TOAN
                      )
                      AND (
                          d.trangThaiDonHang =
                              com.example.dantruventu.Enum.TrangThaiDonHang.CHO_DUYET
                          OR d.daGiuHang = false
                          OR d.daGiuHang IS NULL
                      )
                  )
                  OR (
                      d.trangThaiThanhToan =
                          com.example.dantruventu.Enum.TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
                      AND (
                          d.hanGiuHang <= :cutoff
                          OR d.hanGiuUuDai <= :cutoff
                          OR (
                              d.hanGiuUuDai IS NULL
                              AND EXISTS (
                                  SELECT u.id
                                  FROM KhuyenMaiDonHang u
                                  WHERE u.donHang.id = d.id
                                    AND u.trangThaiApDung =
                                        com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai.GIU_CHO
                              )
                          )
                      )
                  )
              )
            ORDER BY d.id
            """)
  List<Long> findPendingOrderLifecycleIds(
      @Param("afterId") Long afterId, @Param("cutoff") LocalDateTime cutoff, Pageable pageable);

  @Query(
      """
            SELECT d.id
            FROM DonHang d
            WHERE LOWER(d.maDonHang) = LOWER(:code)
            """)
  Optional<Long> findIdByMaDonHangIgnoreCase(@Param("code") String code);

  @Query(
      """
            SELECT COUNT(d)
            FROM DonHang d
            WHERE d.khachHang.id = :customerId
              AND d.trangThaiDonHang =
                  com.example.dantruventu.Enum.TrangThaiDonHang.HOAN_THANH
              AND d.trangThaiThanhToan =
                  com.example.dantruventu.Enum.TrangThaiThanhToanDonHang.DA_THANH_TOAN
              AND d.trangThaiXuatKho =
                  com.example.dantruventu.Enum.TrangThaiXuatKho.DA_XUAT_KHO
              AND d.ngayHoanThanh IS NOT NULL
            """)
  long countCompletedForIntake(@Param("customerId") Long customerId);

  @Query(
      """
            SELECT COUNT(d)
            FROM DonHang d
            WHERE d.khachHang.id = :customerId
              AND d.loaiDonHang =
                  com.example.dantruventu.Enum.LoaiDonHang.ONLINE
              AND d.trangThaiDonHang =
                  com.example.dantruventu.Enum.TrangThaiDonHang.CHO_DUYET
              AND d.trangThaiThanhToan =
                  com.example.dantruventu.Enum.TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
              AND d.trangThaiXuatKho =
                  com.example.dantruventu.Enum.TrangThaiXuatKho.CHUA_XUAT_KHO
              AND d.daGiuHang = true
              AND d.hanGiuHang IS NOT NULL
            """)
  long countTemporaryReservations(@Param("customerId") Long customerId);
}
