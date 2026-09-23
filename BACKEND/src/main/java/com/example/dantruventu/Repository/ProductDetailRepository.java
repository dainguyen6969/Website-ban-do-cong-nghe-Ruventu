package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.SanPham;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface ProductDetailRepository extends Repository<SanPham, Long> {

  @Query(
      value =
          """
                    SELECT
                        sp.id AS id,
                        sp.ma_san_pham AS maSanPham,
                        sp.ten_san_pham AS tenSanPham,
                        dm.id AS danhMucId,
                        dm.ten_danh_muc AS tenDanhMuc,
                        th.id AS thuongHieuId,
                        th.ten_thuong_hieu AS tenThuongHieu,
                        sp.loai_san_pham AS loaiSanPham,
                        sp.mo_ta AS moTa,
                        sp.thong_so_ky_thuat AS thongSoKyThuat,
                        sp.trang_thai AS trangThai
                    FROM san_pham sp
                    JOIN danh_muc dm
                        ON dm.id = sp.danh_muc_id
                    LEFT JOIN thuong_hieu th
                        ON th.id = sp.thuong_hieu_id
                    WHERE sp.id = :productId
                        AND sp.trang_thai = 1
                        AND dm.trang_thai = 1
                        AND (
                            th.id IS NULL
                            OR th.trang_thai = 1
                        )
                    """,
      nativeQuery = true)
  Optional<ProductDetailProjection> findActiveProductDetail(@Param("productId") Long productId);

  @Query(
      value =
          """
                    SELECT
                        asp.id AS id,
                        asp.duong_dan_anh AS duongDanAnh,
                        asp.la_anh_chinh AS laAnhChinh,
                        asp.thu_tu_hien_thi AS thuTuHienThi
                    FROM anh_san_pham asp
                    WHERE asp.san_pham_id = :productId
                    ORDER BY
                        asp.la_anh_chinh DESC,
                        asp.thu_tu_hien_thi ASC,
                        asp.id ASC
                    """,
      nativeQuery = true)
  List<ProductDetailProjection.ProductImageProjection> findProductImages(
      @Param("productId") Long productId);

  @Query(
      value =
          """
                    SELECT
                        pbs.id AS id,
                        pbs.ten_phien_ban AS tenPhienBan,
                        pbs.ma_vach AS maVach,
                        pbs.gia_ban_le AS giaBanLe,
                        pbs.khoi_luong AS khoiLuong,
                        CAST(
                            COALESCE(
                                SUM(tk.ton_co_the_ban),
                                0
                            )
                            AS SIGNED
                        ) AS tonCoTheBan
                    FROM phien_ban_san_pham pbs
                    LEFT JOIN ton_kho tk
                        ON tk.phien_ban_id = pbs.id
                    WHERE pbs.san_pham_id = :productId
                        AND pbs.trang_thai = 1
                    GROUP BY
                        pbs.id,
                        pbs.ten_phien_ban,
                        pbs.ma_vach,
                        pbs.gia_ban_le,
                        pbs.khoi_luong
                    ORDER BY pbs.id ASC
                    """,
      nativeQuery = true)
  List<ProductDetailProjection.ProductVariantProjection> findActiveProductVariants(
      @Param("productId") Long productId);

  @Query(
      value =
          """
                    SELECT
                        pbs.id AS id,
                        pbs.san_pham_id AS sanPhamId,
                        pbs.ten_phien_ban AS tenPhienBan,
                        pbs.ma_vach AS maVach,
                        pbs.gia_ban_le AS giaBanLe,
                        pbs.khoi_luong AS khoiLuong,
                        pbs.trang_thai AS trangThai,
                        CAST(
                            COALESCE(
                                SUM(tk.ton_thuc_te),
                                0
                            )
                            AS SIGNED
                        ) AS tonThucTe,
                        CAST(
                            COALESCE(
                                SUM(tk.ton_co_the_ban),
                                0
                            )
                            AS SIGNED
                        ) AS tonCoTheBan
                    FROM phien_ban_san_pham pbs
                    JOIN san_pham sp
                        ON sp.id = pbs.san_pham_id
                    JOIN danh_muc dm
                        ON dm.id = sp.danh_muc_id
                    LEFT JOIN thuong_hieu th
                        ON th.id = sp.thuong_hieu_id
                    LEFT JOIN ton_kho tk
                        ON tk.phien_ban_id = pbs.id
                    WHERE sp.id = :productId
                        AND pbs.id = :variantId
                        AND sp.trang_thai = 1
                        AND pbs.trang_thai = 1
                        AND dm.trang_thai = 1
                        AND (
                            th.id IS NULL
                            OR th.trang_thai = 1
                        )
                    GROUP BY
                        pbs.id,
                        pbs.san_pham_id,
                        pbs.ten_phien_ban,
                        pbs.ma_vach,
                        pbs.gia_ban_le,
                        pbs.khoi_luong,
                        pbs.trang_thai
                    """,
      nativeQuery = true)
  Optional<ProductDetailProjection.ProductVariantDetailProjection> findActiveProductVariantDetail(
      @Param("productId") Long productId, @Param("variantId") Long variantId);
}
