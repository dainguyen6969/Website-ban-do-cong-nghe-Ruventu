package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ComboRepository
    extends JpaRepository<SanPham, Long>, JpaSpecificationExecutor<SanPham> {

  interface ComboStockProjection {

    Long getComboId();

    Long getTonCoTheBan();
  }

  @Query(
      value =
          TonKhoSql.BASE
              + """
               SELECT combo_id AS comboId,
                      SUM(quantity) AS tonCoTheBan
               FROM combo_stock
               WHERE combo_id IN :ids
               GROUP BY combo_id
              """,
      nativeQuery = true)
  List<ComboStockProjection> sumComboStocks(
      @Param("ids") Collection<Long> ids, @Param("khoHangId") Long khoHangId);

  @Query(
      value =
          """
                    SELECT COUNT(*)
                    FROM chi_tiet_don_hang ct
                    JOIN phien_ban_san_pham v ON v.id = ct.phien_ban_id
                    JOIN don_hang d ON d.id = ct.don_hang_id
                    WHERE v.san_pham_id = :comboId
                      AND (
                          d.trang_thai_don_hang <> 'HUY_HANG'
                          OR d.trang_thai_xuat_kho IN (
                              'DA_XUAT_KHO', 'DA_HOAN_KHO'
                          )
                          OR EXISTS (
                              SELECT 1
                              FROM the_kho t
                              WHERE t.ma_chung_tu_goc = d.id
                                AND t.loai_giao_dich = 'XUAT_BAN'
                          )
                      )
                    """,
      nativeQuery = true)
  long countConfigurationReferences(@Param("comboId") Long comboId);

  interface ComponentOptionProjection {

    Long getPhienBanId();

    Long getSanPhamId();

    String getMaSanPham();

    String getTenSanPham();

    String getTenPhienBan();

    String getMaVach();

    BigDecimal getGiaBanLe();

    BigDecimal getGiaNhap();

    Long getTonCoTheBan();
  }

  @Query(
      value =
          """
                    SELECT
                        v.id AS phienBanId,
                        p.id AS sanPhamId,
                        p.maSanPham AS maSanPham,
                        p.tenSanPham AS tenSanPham,
                        v.tenPhienBan AS tenPhienBan,
                        v.maVach AS maVach,
                        v.giaBanLe AS giaBanLe,
                        v.giaNhap AS giaNhap,
                        COALESCE(SUM(t.tonCoTheBan), 0) AS tonCoTheBan
                    FROM PhienBanSanPham v
                    JOIN v.sanPham p
                    LEFT JOIN v.danhSachTonKho t
                    WHERE p.loaiSanPham = :loai
                      AND p.trangThai = :status
                      AND v.trangThai = :status
                      AND (
                          LOWER(p.maSanPham) LIKE :keyword ESCAPE '!'
                          OR LOWER(p.tenSanPham) LIKE :keyword ESCAPE '!'
                          OR LOWER(v.tenPhienBan) LIKE :keyword ESCAPE '!'
                          OR LOWER(v.maVach) LIKE :keyword ESCAPE '!'
                      )
                    GROUP BY
                        v.id, p.id, p.maSanPham, p.tenSanPham,
                        v.tenPhienBan, v.maVach, v.giaBanLe, v.giaNhap
                    ORDER BY v.id DESC
                    """,
      countQuery =
          """
                    SELECT COUNT(v)
                    FROM PhienBanSanPham v
                    JOIN v.sanPham p
                    WHERE p.loaiSanPham = :loai
                      AND p.trangThai = :status
                      AND v.trangThai = :status
                      AND (
                          LOWER(p.maSanPham) LIKE :keyword ESCAPE '!'
                          OR LOWER(p.tenSanPham) LIKE :keyword ESCAPE '!'
                          OR LOWER(v.tenPhienBan) LIKE :keyword ESCAPE '!'
                          OR LOWER(v.maVach) LIKE :keyword ESCAPE '!'
                      )
                    """)
  Page<ComponentOptionProjection> findComponentOptions(
      @Param("keyword") String keyword,
      @Param("loai") LoaiSanPham loai,
      @Param("status") TrangThaiCoBanEnum status,
      Pageable pageable);
}
