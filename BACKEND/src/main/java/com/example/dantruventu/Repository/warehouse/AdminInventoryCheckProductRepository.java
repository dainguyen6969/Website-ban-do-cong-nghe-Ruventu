package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminInventoryCheckProductRepository extends JpaRepository<PhienBanSanPham, Long> {

  interface ProductSearchProjection {

    Long getPhienBanId();

    String getMaSanPham();

    String getTenSanPham();

    String getTenPhienBan();

    String getMaVach();

    Long getTonHeThong();
  }

  @Query(
      value =
          """
          SELECT v.id AS phienBanId,
                 p.maSanPham AS maSanPham,
                 p.tenSanPham AS tenSanPham,
                 v.tenPhienBan AS tenPhienBan,
                 v.maVach AS maVach,
                 COALESCE(SUM(t.tonThucTe), 0) AS tonHeThong
          FROM PhienBanSanPham v
          JOIN v.sanPham p
          LEFT JOIN v.danhSachTonKho t
          WHERE v.trangThai = :activeStatus
            AND p.trangThai = :activeStatus
            AND (
              :keyword IS NULL
              OR LOWER(p.maSanPham) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(p.tenSanPham) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(v.tenPhienBan) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(v.maVach) LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
          GROUP BY v.id,
                   p.maSanPham,
                   p.tenSanPham,
                   v.tenPhienBan,
                   v.maVach
          ORDER BY v.id ASC
          """,
      countQuery =
          """
          SELECT COUNT(v.id)
          FROM PhienBanSanPham v
          JOIN v.sanPham p
          WHERE v.trangThai = :activeStatus
            AND p.trangThai = :activeStatus
            AND (
              :keyword IS NULL
              OR LOWER(p.maSanPham) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(p.tenSanPham) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(v.tenPhienBan) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(v.maVach) LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
          """)
  Page<ProductSearchProjection> searchActiveProducts(
      @Param("keyword") String keyword,
      @Param("activeStatus") TrangThaiCoBanEnum activeStatus,
      Pageable pageable);
}
