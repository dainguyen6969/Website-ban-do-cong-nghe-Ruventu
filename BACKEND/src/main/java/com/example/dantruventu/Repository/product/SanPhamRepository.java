package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.SanPham;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SanPhamRepository
    extends JpaRepository<SanPham, Long>, JpaSpecificationExecutor<SanPham> {
  boolean existsByMaSanPham(String maSanPham);

  boolean existsByMaSanPhamAndIdNot(String maSanPham, Long id);

  boolean existsByDanhMucId(Long danhMucId);

  long countByDanhMucId(Long danhMucId);

  interface CategoryProductProjection {

    Long getId();

    String getMaSanPham();

    String getTenSanPham();

    java.math.BigDecimal getGiaBan();

    Long getTonCoTheBan();

    com.example.dantruventu.Enum.TrangThaiCoBanEnum getTrangThai();
  }

  @Query(
      """
            SELECT s.id AS id,
                   s.maSanPham AS maSanPham,
                   s.tenSanPham AS tenSanPham,
                   MIN(pb.giaBanLe) AS giaBan,
                   COALESCE(SUM(tk.tonCoTheBan), 0) AS tonCoTheBan,
                   s.trangThai AS trangThai
            FROM SanPham s
            LEFT JOIN s.danhSachPhienBan pb
            LEFT JOIN pb.danhSachTonKho tk
            WHERE s.danhMuc.id = :danhMucId
            GROUP BY
                s.id,
                s.maSanPham,
                s.tenSanPham,
                s.trangThai
            ORDER BY s.id DESC
            """)
  List<CategoryProductProjection> findCategoryProductSummary(@Param("danhMucId") Long danhMucId);
}
