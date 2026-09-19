package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.ThuongHieu;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ThuongHieuRepository
    extends JpaRepository<ThuongHieu, Long>, JpaSpecificationExecutor<ThuongHieu> {

  Optional<ThuongHieu> findByDuongDanUrl(String duongDanUrl);

  boolean existsByTenThuongHieuIgnoreCase(String tenThuongHieu);

  boolean existsByTenThuongHieuIgnoreCaseAndIdNot(String tenThuongHieu, Long id);

  boolean existsByDuongDanUrl(String duongDanUrl);

  boolean existsByDuongDanUrlAndIdNot(String duongDanUrl, Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT b FROM ThuongHieu b WHERE b.id = :id")
  Optional<ThuongHieu> findByIdForUpdate(@Param("id") Long id);

  interface ProductCountProjection {

    Long getThuongHieuId();

    Long getSoLuongSanPham();
  }

  @Query(
      """
            SELECT s.thuongHieu.id AS thuongHieuId,
                   COUNT(s.id) AS soLuongSanPham
            FROM SanPham s
            WHERE s.thuongHieu.id IN :ids
            GROUP BY s.thuongHieu.id
            """)
  List<ProductCountProjection> countProductsByBrandIds(@Param("ids") Collection<Long> ids);

  @Query(
      """
            SELECT COUNT(s.id)
            FROM SanPham s
            WHERE s.thuongHieu.id = :id
            """)
  long countLinkedProducts(@Param("id") Long id);

  interface BrandProductProjection {

    Long getId();

    String getMaSanPham();

    String getTenSanPham();

    BigDecimal getGiaBan();

    Long getTonCoTheBan();

    TrangThaiCoBanEnum getTrangThai();
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
            WHERE s.thuongHieu.id = :thuongHieuId
            GROUP BY
                s.id,
                s.maSanPham,
                s.tenSanPham,
                s.trangThai
            ORDER BY s.id DESC
            """)
  List<BrandProductProjection> findBrandProductSummary(@Param("thuongHieuId") Long thuongHieuId);
}
