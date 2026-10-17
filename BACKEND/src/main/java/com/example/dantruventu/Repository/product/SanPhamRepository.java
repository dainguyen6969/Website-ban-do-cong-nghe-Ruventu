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

  String PUBLIC_CATALOG_CTE =
      """
    WITH warehouse_state AS (
        SELECT
            CASE
                WHEN COUNT(*) = 1
                    AND MAX(
                        CASE
                            WHEN id = :warehouseId AND trang_thai = 1
                            THEN 1 ELSE 0
                        END
                    ) = 1
                THEN 1 ELSE 0
            END AS ready
        FROM kho_hang
    ),
    variant_stock AS (
        SELECT
            t.phien_ban_id,
            COUNT(*) AS stock_rows,
            MAX(t.ton_co_the_ban) AS available,
            MIN(
                CASE
                    WHEN t.ton_thuc_te IS NOT NULL
                        AND t.ton_co_the_ban IS NOT NULL
                        AND t.hang_loi IS NOT NULL
                        AND t.ton_thuc_te >= 0
                        AND t.ton_co_the_ban >= 0
                        AND t.hang_loi >= 0
                        AND t.ton_co_the_ban + t.hang_loi
                            <= t.ton_thuc_te
                    THEN 1 ELSE 0
                END
            ) AS valid_stock
        FROM ton_kho t
        WHERE t.kho_hang_id = :warehouseId
        GROUP BY t.phien_ban_id
    ),
    variant_data AS (
        SELECT
            v.san_pham_id,
            COUNT(*) AS total_variants,
            SUM(
                CASE WHEN v.trang_thai = 1
                THEN 1 ELSE 0 END
            ) AS active_variants,
            MIN(
                CASE WHEN v.trang_thai = 1
                THEN v.gia_ban_le END
            ) AS minimum_price,
            MAX(
                CASE WHEN v.trang_thai = 1
                THEN v.gia_ban_le END
            ) AS maximum_price,
            SUM(
                CASE
                    WHEN v.trang_thai = 1
                        AND COALESCE(s.stock_rows, 1) = 1
                        AND COALESCE(s.valid_stock, 1) = 1
                    THEN COALESCE(s.available, 0)
                    ELSE 0
                END
            ) AS physical_quantity
        FROM phien_ban_san_pham v
        LEFT JOIN variant_stock s ON s.phien_ban_id = v.id
        GROUP BY v.san_pham_id
    ),
    component_units AS (
        SELECT
            c.san_pham_combo_id,
            c.phien_ban_thanh_phan_id,
            SUM(c.so_luong) AS required_quantity,
            MIN(
                CASE WHEN c.so_luong > 0
                THEN 1 ELSE 0 END
            ) AS valid_quantity
        FROM thanh_phan_combo c
        GROUP BY
            c.san_pham_combo_id,
            c.phien_ban_thanh_phan_id
    ),
    combo_stock AS (
        SELECT
            c.san_pham_combo_id,
            MIN(
                FLOOR(
                    COALESCE(s.available, 0)
                    / NULLIF(c.required_quantity, 0)
                )
            ) AS assembly_capacity,
            MIN(
                CASE
                    WHEN c.valid_quantity = 1
                        AND c.required_quantity BETWEEN 1 AND 2147483647
                        AND v.trang_thai = 1
                        AND p.trang_thai = 1
                        AND p.loai_san_pham = 'DON'
                        AND COALESCE(s.stock_rows, 1) = 1
                        AND COALESCE(s.valid_stock, 1) = 1
                    THEN 1 ELSE 0
                END
            ) AS valid_configuration
        FROM component_units c
        LEFT JOIN phien_ban_san_pham v
            ON v.id = c.phien_ban_thanh_phan_id
        LEFT JOIN san_pham p ON p.id = v.san_pham_id
        LEFT JOIN variant_stock s ON s.phien_ban_id = v.id
        GROUP BY c.san_pham_combo_id
    ),
    product_stock AS (
        SELECT
            p.id AS san_pham_id,
            CAST(
                CASE
                    WHEN p.loai_san_pham = 'DON'
                    THEN
                        CASE WHEN w.ready = 1
                        THEN COALESCE(v.physical_quantity, 0)
                        ELSE 0 END
                    ELSE NULL
                END AS SIGNED
            ) AS physical_quantity,
            CAST(
                CASE
                    WHEN p.loai_san_pham = 'BO_PC'
                        AND w.ready = 1
                        AND v.total_variants = 1
                        AND v.active_variants = 1
                        AND c.valid_configuration = 1
                    THEN c.assembly_capacity
                    ELSE NULL
                END AS SIGNED
            ) AS assembly_capacity
        FROM san_pham p
        CROSS JOIN warehouse_state w
        LEFT JOIN variant_data v ON v.san_pham_id = p.id
        LEFT JOIN combo_stock c ON c.san_pham_combo_id = p.id
    ),
    sales_data AS (
        SELECT
            v.san_pham_id,
            SUM(l.so_luong) AS sold_quantity
        FROM chi_tiet_don_hang l
        JOIN don_hang d ON d.id = l.don_hang_id
        JOIN phien_ban_san_pham v ON v.id = l.phien_ban_id
        WHERE d.trang_thai_don_hang = 'HOAN_THANH'
        GROUP BY v.san_pham_id
    )
    """;

  String PUBLIC_CATALOG_FROM =
      """
    FROM san_pham sp
    JOIN danh_muc dm ON dm.id = sp.danh_muc_id
    LEFT JOIN thuong_hieu th ON th.id = sp.thuong_hieu_id
    JOIN variant_data vd ON vd.san_pham_id = sp.id
    JOIN product_stock ps ON ps.san_pham_id = sp.id
    LEFT JOIN sales_data sd ON sd.san_pham_id = sp.id
    WHERE sp.trang_thai = 1
        AND dm.trang_thai = 1
        AND (th.id IS NULL OR th.trang_thai = 1)
        AND vd.active_variants > 0
        AND (
            :keyword IS NULL
            OR :keyword = ''
            OR CONCAT_WS(' ', dm.ten_danh_muc, sp.ten_san_pham, th.ten_thuong_hieu)
                LIKE CONCAT('%', :keyword, '%')
            OR sp.ma_san_pham LIKE CONCAT('%', :keyword, '%')
            OR dm.ten_danh_muc LIKE CONCAT('%', :keyword, '%')
            OR th.ten_thuong_hieu LIKE CONCAT('%', :keyword, '%')
            OR sp.loai_san_pham LIKE CONCAT('%', :keyword, '%')
            OR EXISTS (
                SELECT 1
                FROM phien_ban_san_pham search_v
                WHERE search_v.san_pham_id = sp.id
                    AND search_v.trang_thai = 1
                    AND (
                        search_v.ten_phien_ban
                            LIKE CONCAT('%', :keyword, '%')
                        OR search_v.ma_vach
                            LIKE CONCAT('%', :keyword, '%')
                    )
            )
            OR (sp.loai_san_pham = 'BO_PC' AND EXISTS (
                SELECT 1
                FROM thanh_phan_combo search_part
                JOIN phien_ban_san_pham part_v ON part_v.id = search_part.phien_ban_thanh_phan_id
                JOIN san_pham part_p ON part_p.id = part_v.san_pham_id
                JOIN danh_muc part_dm ON part_dm.id = part_p.danh_muc_id
                LEFT JOIN thuong_hieu part_th ON part_th.id = part_p.thuong_hieu_id
                WHERE search_part.san_pham_combo_id = sp.id
                    AND part_p.trang_thai = 1 AND part_v.trang_thai = 1
                    AND CONCAT_WS(' ', part_dm.ten_danh_muc, part_p.ten_san_pham,
                        part_th.ten_thuong_hieu, part_v.ten_phien_ban, part_v.ma_vach)
                        LIKE CONCAT('%', :keyword, '%')
            ))
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
            (:giaMin IS NULL AND :giaMax IS NULL)
            OR EXISTS (
                SELECT 1
                FROM phien_ban_san_pham price_v
                WHERE price_v.san_pham_id = sp.id
                    AND price_v.trang_thai = 1
                    AND (
                        :giaMin IS NULL
                        OR price_v.gia_ban_le >= :giaMin
                    )
                    AND (
                        :giaMax IS NULL
                        OR price_v.gia_ban_le <= :giaMax
                    )
            )
        )
        AND (
            :tonKho IS NULL
            OR (
                :tonKho = TRUE
                AND COALESCE(
                    ps.assembly_capacity,
                    ps.physical_quantity,
                    0
                ) > 0
            )
            OR (
                :tonKho = FALSE
                AND COALESCE(
                    ps.assembly_capacity,
                    ps.physical_quantity,
                    0
                ) <= 0
            )
        )
    """;

  @Query(
      value =
          PUBLIC_CATALOG_CTE
              + """
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
                    SELECT a.duong_dan_anh
                    FROM anh_san_pham a
                    WHERE a.san_pham_id = sp.id
                    ORDER BY
                        a.la_anh_chinh DESC,
                        a.thu_tu_hien_thi ASC,
                        a.id ASC
                    LIMIT 1
                ) AS anhChinh,
                vd.minimum_price AS giaThapNhat,
                vd.maximum_price AS giaCaoNhat,
                ps.physical_quantity AS tonKhoKhaDung,
                ps.assembly_capacity AS soBoCoTheLap,
                sp.ngay_tao AS ngayTao
            """
              + PUBLIC_CATALOG_FROM
              + """
            ORDER BY
                CASE WHEN :sort = 'gia_tang_dan'
                    THEN vd.minimum_price END ASC,
                CASE WHEN :sort = 'gia_giam_dan'
                    THEN vd.minimum_price END DESC,
                CASE WHEN :sort = 'ban_chay'
                    THEN COALESCE(sd.sold_quantity, 0) END DESC,
                CASE WHEN :sort = 'moi_nhat'
                    THEN sp.ngay_tao END DESC,
                sp.id DESC
            """,
      countQuery = PUBLIC_CATALOG_CTE + " SELECT COUNT(*) " + PUBLIC_CATALOG_FROM,
      nativeQuery = true)
  Page<ProductListProjection> findProducts(
      @Param("keyword") String keyword,
      @Param("giaMin") BigDecimal giaMin,
      @Param("giaMax") BigDecimal giaMax,
      @Param("thuongHieuId") Long thuongHieuId,
      @Param("danhMucId") Long danhMucId,
      @Param("tonKho") Boolean tonKho,
      @Param("sort") String sort,
      @Param("warehouseId") Long warehouseId,
      Pageable pageable);
}
