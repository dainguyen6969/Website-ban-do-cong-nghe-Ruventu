package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
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

  Optional<DonHang> findByMaDonHangIgnoreCaseAndSdtNguoiNhan(
      String maDonHang, String sdtNguoiNhan);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT d FROM DonHang d WHERE d.id = :id")
  Optional<DonHang> findByIdForUpdate(@Param("id") Long id);

  @Override
  @EntityGraph(attributePaths = {"khachHang"})
  Page<DonHang> findAll(Specification<DonHang> specification, Pageable pageable);
}
