package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Repository.ProductListProjection;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
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

  boolean existsByMaSanPhamIgnoreCase(String maSanPham);

  boolean existsByMaSanPhamIgnoreCaseAndIdNot(String maSanPham, Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM SanPham s WHERE s.id = :id")
  Optional<SanPham> findByIdForUpdate(@Param("id") Long id);

    @Query(
            value = """
                    SELECT
                        sp.id AS id,
                        sp.ten_san_pham AS tenSanPham,
                        sp.ma_san_pham AS maSanPham,
                        sp.loai_san_pham AS loaiSanPham,
                        dm.id AS danhMucId,
                        dm.ten_danh_muc AS tenDanhMuc,
                        th.id AS thuongHieuId,
                        th.ten_thuong_hieu AS tenThuongHieu,
                        (
                            SELECT asp.duong_dan_anh
                            FROM anh_san_pham asp
                            WHERE asp.san_pham_id = sp.id
                            ORDER BY
                                asp.la_anh_chinh DESC,
                                asp.thu_tu_hien_thi ASC,
                                asp.id ASC
                            LIMIT 1
                        ) AS anhChinh,
                        price_data.gia_thap_nhat AS giaThapNhat,
                        price_data.gia_cao_nhat AS giaCaoNhat,
                        CAST(
                            COALESCE(stock_data.ton_kho_kha_dung, 0)
                            AS SIGNED
                        ) AS tonKhoKhaDung,
                        sp.ngay_tao AS ngayTao
                    FROM san_pham sp
                    JOIN danh_muc dm
                        ON dm.id = sp.danh_muc_id
                    LEFT JOIN thuong_hieu th
                        ON th.id = sp.thuong_hieu_id
                    JOIN (
                        SELECT
                            pbs.san_pham_id,
                            MIN(pbs.gia_ban_le) AS gia_thap_nhat,
                            MAX(pbs.gia_ban_le) AS gia_cao_nhat
                        FROM phien_ban_san_pham pbs
                        WHERE pbs.trang_thai = 1
                        GROUP BY pbs.san_pham_id
                    ) price_data
                        ON price_data.san_pham_id = sp.id
                    LEFT JOIN (
                        SELECT
                            pbs.san_pham_id,
                            SUM(COALESCE(tk.ton_co_the_ban, 0))
                                AS ton_kho_kha_dung
                        FROM phien_ban_san_pham pbs
                        LEFT JOIN ton_kho tk
                            ON tk.phien_ban_id = pbs.id
                        WHERE pbs.trang_thai = 1
                        GROUP BY pbs.san_pham_id
                    ) stock_data
                        ON stock_data.san_pham_id = sp.id
                    LEFT JOIN (
                        SELECT
                            pbs.san_pham_id,
                            SUM(ctdh.so_luong) AS so_luong_da_ban
                        FROM chi_tiet_don_hang ctdh
                        JOIN don_hang dh
                            ON dh.id = ctdh.don_hang_id
                        JOIN phien_ban_san_pham pbs
                            ON pbs.id = ctdh.phien_ban_id
                        WHERE dh.trang_thai_don_hang = 'HOAN_THANH'
                        GROUP BY pbs.san_pham_id
                    ) sales_data
                        ON sales_data.san_pham_id = sp.id
                    WHERE sp.trang_thai = 1
                        AND dm.trang_thai = 1
                        AND (
                            th.id IS NULL
                            OR th.trang_thai = 1
                        )
                        AND (
                            :keyword IS NULL
                            OR :keyword = ''
                            OR sp.ten_san_pham LIKE
                                CONCAT('%', :keyword, '%')
                            OR sp.ma_san_pham LIKE
                                CONCAT('%', :keyword, '%')
                            OR dm.ten_danh_muc LIKE
                                CONCAT('%', :keyword, '%')
                            OR th.ten_thuong_hieu LIKE
                                CONCAT('%', :keyword, '%')
                            OR sp.loai_san_pham LIKE
                                CONCAT('%', :keyword, '%')
                            OR EXISTS (
                                SELECT 1
                                FROM phien_ban_san_pham search_pbs
                                WHERE search_pbs.san_pham_id = sp.id
                                    AND search_pbs.trang_thai = 1
                                    AND (
                                        search_pbs.ten_phien_ban LIKE
                                            CONCAT('%', :keyword, '%')
                                        OR search_pbs.ma_vach LIKE
                                            CONCAT('%', :keyword, '%')
                                    )
                            )
                        )
                        AND (
                            :thuongHieuId IS NULL
                            OR sp.thuong_hieu_id = :thuongHieuId
                        )
                        AND (
                            :danhMucId IS NULL
                            OR sp.danh_muc_id = :danhMucId
                        )
                        AND (
                            (
                                :giaMin IS NULL
                                AND :giaMax IS NULL
                            )
                            OR EXISTS (
                                SELECT 1
                                FROM phien_ban_san_pham price_pbs
                                WHERE price_pbs.san_pham_id = sp.id
                                    AND price_pbs.trang_thai = 1
                                    AND (
                                        :giaMin IS NULL
                                        OR price_pbs.gia_ban_le >= :giaMin
                                    )
                                    AND (
                                        :giaMax IS NULL
                                        OR price_pbs.gia_ban_le <= :giaMax
                                    )
                            )
                        )
                        AND (
                            :tonKho IS NULL
                            OR (
                                :tonKho = TRUE
                                AND COALESCE(
                                    stock_data.ton_kho_kha_dung,
                                    0
                                ) > 0
                            )
                            OR (
                                :tonKho = FALSE
                                AND COALESCE(
                                    stock_data.ton_kho_kha_dung,
                                    0
                                ) <= 0
                            )
                        )
                    ORDER BY
                        CASE
                            WHEN :sort = 'gia_tang_dan'
                            THEN price_data.gia_thap_nhat
                        END ASC,
                        CASE
                            WHEN :sort = 'gia_giam_dan'
                            THEN price_data.gia_thap_nhat
                        END DESC,
                        CASE
                            WHEN :sort = 'ban_chay'
                            THEN COALESCE(
                                sales_data.so_luong_da_ban,
                                0
                            )
                        END DESC,
                        CASE
                            WHEN :sort = 'moi_nhat'
                            THEN sp.ngay_tao
                        END DESC,
                        sp.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(DISTINCT sp.id)
                    FROM san_pham sp
                    JOIN danh_muc dm
                        ON dm.id = sp.danh_muc_id
                    LEFT JOIN thuong_hieu th
                        ON th.id = sp.thuong_hieu_id
                    WHERE sp.trang_thai = 1
                        AND dm.trang_thai = 1
                        AND (
                            th.id IS NULL
                            OR th.trang_thai = 1
                        )
                        AND EXISTS (
                            SELECT 1
                            FROM phien_ban_san_pham active_pbs
                            WHERE active_pbs.san_pham_id = sp.id
                                AND active_pbs.trang_thai = 1
                        )
                        AND (
                            :keyword IS NULL
                            OR :keyword = ''
                            OR sp.ten_san_pham LIKE
                                CONCAT('%', :keyword, '%')
                            OR sp.ma_san_pham LIKE
                                CONCAT('%', :keyword, '%')
                            OR dm.ten_danh_muc LIKE
                                CONCAT('%', :keyword, '%')
                            OR th.ten_thuong_hieu LIKE
                                CONCAT('%', :keyword, '%')
                            OR sp.loai_san_pham LIKE
                                CONCAT('%', :keyword, '%')
                            OR EXISTS (
                                SELECT 1
                                FROM phien_ban_san_pham search_pbs
                                WHERE search_pbs.san_pham_id = sp.id
                                    AND search_pbs.trang_thai = 1
                                    AND (
                                        search_pbs.ten_phien_ban LIKE
                                            CONCAT('%', :keyword, '%')
                                        OR search_pbs.ma_vach LIKE
                                            CONCAT('%', :keyword, '%')
                                    )
                            )
                        )
                        AND (
                            :thuongHieuId IS NULL
                            OR sp.thuong_hieu_id = :thuongHieuId
                        )
                        AND (
                            :danhMucId IS NULL
                            OR sp.danh_muc_id = :danhMucId
                        )
                        AND (
                            (
                                :giaMin IS NULL
                                AND :giaMax IS NULL
                            )
                            OR EXISTS (
                                SELECT 1
                                FROM phien_ban_san_pham price_pbs
                                WHERE price_pbs.san_pham_id = sp.id
                                    AND price_pbs.trang_thai = 1
                                    AND (
                                        :giaMin IS NULL
                                        OR price_pbs.gia_ban_le >= :giaMin
                                    )
                                    AND (
                                        :giaMax IS NULL
                                        OR price_pbs.gia_ban_le <= :giaMax
                                    )
                            )
                        )
                        AND (
                            :tonKho IS NULL
                            OR (
                                :tonKho = TRUE
                                AND (
                                    SELECT COALESCE(
                                        SUM(tk.ton_co_the_ban),
                                        0
                                    )
                                    FROM phien_ban_san_pham stock_pbs
                                    LEFT JOIN ton_kho tk
                                        ON tk.phien_ban_id = stock_pbs.id
                                    WHERE stock_pbs.san_pham_id = sp.id
                                        AND stock_pbs.trang_thai = 1
                                ) > 0
                            )
                            OR (
                                :tonKho = FALSE
                                AND (
                                    SELECT COALESCE(
                                        SUM(tk.ton_co_the_ban),
                                        0
                                    )
                                    FROM phien_ban_san_pham stock_pbs
                                    LEFT JOIN ton_kho tk
                                        ON tk.phien_ban_id = stock_pbs.id
                                    WHERE stock_pbs.san_pham_id = sp.id
                                        AND stock_pbs.trang_thai = 1
                                ) <= 0
                            )
                        )
                    """,
            nativeQuery = true
    )
    Page<ProductListProjection> findProducts(
            @Param("keyword") String keyword,
            @Param("giaMin") BigDecimal giaMin,
            @Param("giaMax") BigDecimal giaMax,
            @Param("thuongHieuId") Long thuongHieuId,
            @Param("danhMucId") Long danhMucId,
            @Param("tonKho") Boolean tonKho,
            @Param("sort") String sort,
            Pageable pageable
    );
}
