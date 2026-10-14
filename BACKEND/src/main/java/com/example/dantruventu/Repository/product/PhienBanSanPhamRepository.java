package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.PhienBanSanPham;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface PhienBanSanPhamRepository
    extends JpaRepository<PhienBanSanPham, Long>, JpaSpecificationExecutor<PhienBanSanPham> {

  interface PcBuilderProduct {
    Long getSanPhamId();

    Long getPhienBanId();

    String getMaSanPham();

    String getMaVach();

    String getTenSanPham();

    String getTenPhienBan();

    String getAnhDaiDien();

    Long getThuongHieuId();

    String getTenThuongHieu();

    BigDecimal getGiaBanLe();

    Long getTonCoTheBan();

    String getThongSoKyThuat();
  }

  interface PcBuilderBrand {
    Long getId();

    String getTenThuongHieu();
  }

  String PC_BUILDER_FROM_WHERE =
      """
      FROM phien_ban_san_pham v
      JOIN san_pham p ON p.id = v.san_pham_id
      LEFT JOIN thuong_hieu b ON b.id = p.thuong_hieu_id
      LEFT JOIN (
        SELECT phien_ban_id, SUM(COALESCE(ton_co_the_ban, 0)) AS available
        FROM ton_kho WHERE kho_hang_id = :warehouseId GROUP BY phien_ban_id
      ) stock ON stock.phien_ban_id = v.id
      WHERE v.trang_thai = 1 AND p.trang_thai = 1
        AND p.loai_san_pham = 'DON' AND p.danh_muc_id = :categoryId
        AND (:keyword IS NULL
          OR LOWER(p.ten_san_pham) LIKE :keyword ESCAPE '!'
          OR LOWER(p.ma_san_pham) LIKE :keyword ESCAPE '!'
          OR LOWER(v.ten_phien_ban) LIKE :keyword ESCAPE '!'
          OR LOWER(v.ma_vach) LIKE :keyword ESCAPE '!')
        AND (:brandId IS NULL OR p.thuong_hieu_id = :brandId)
        AND (:minPrice IS NULL OR v.gia_ban_le >= :minPrice)
        AND (:maxPrice IS NULL OR v.gia_ban_le <= :maxPrice)
        AND (:stockStatus = 'TAT_CA'
          OR (:stockStatus = 'CON_HANG' AND COALESCE(stock.available, 0) > 0)
          OR (:stockStatus = 'HET_HANG' AND COALESCE(stock.available, 0) <= 0))
        AND (:socket IS NULL OR (
          JSON_TYPE(JSON_EXTRACT(p.thong_so_ky_thuat, '$.socket')) = 'STRING'
          AND CAST(JSON_UNQUOTE(JSON_EXTRACT(p.thong_so_ky_thuat, '$.socket')) AS BINARY)
              = CAST(:socket AS BINARY)))
      """;

  @Query(
      value =
          """
      SELECT p.id AS sanPhamId, v.id AS phienBanId,
        p.ma_san_pham AS maSanPham, v.ma_vach AS maVach,
        p.ten_san_pham AS tenSanPham, v.ten_phien_ban AS tenPhienBan,
        (SELECT a.duong_dan_anh FROM anh_san_pham a WHERE a.san_pham_id = p.id
          ORDER BY a.la_anh_chinh DESC, (a.thu_tu_hien_thi IS NULL) ASC,
                   a.thu_tu_hien_thi ASC, a.id ASC LIMIT 1) AS anhDaiDien,
        b.id AS thuongHieuId, b.ten_thuong_hieu AS tenThuongHieu,
        v.gia_ban_le AS giaBanLe, COALESCE(stock.available, 0) AS tonCoTheBan,
        p.thong_so_ky_thuat AS thongSoKyThuat
      """
              + PC_BUILDER_FROM_WHERE
              + """
      ORDER BY CASE WHEN :sortMode = 'MAC_DINH' AND COALESCE(stock.available, 0) > 0
                    THEN 0 WHEN :sortMode = 'MAC_DINH' THEN 1 ELSE 0 END ASC,
               CASE WHEN :sortMode = 'GIA_TANG' THEN v.gia_ban_le END ASC,
               CASE WHEN :sortMode = 'GIA_GIAM' THEN v.gia_ban_le END DESC,
               v.id DESC
      """,
      countQuery = "SELECT COUNT(*) " + PC_BUILDER_FROM_WHERE,
      nativeQuery = true)
  Page<PcBuilderProduct> findPcBuilderProducts(
      @Param("categoryId") Long categoryId,
      @Param("warehouseId") Long warehouseId,
      @Param("keyword") String keyword,
      @Param("brandId") Long brandId,
      @Param("minPrice") BigDecimal minPrice,
      @Param("maxPrice") BigDecimal maxPrice,
      @Param("stockStatus") String stockStatus,
      @Param("socket") String socket,
      @Param("sortMode") String sortMode,
      Pageable pageable);

  @Query(
      value =
          """
      SELECT DISTINCT b.id AS id, b.ten_thuong_hieu AS tenThuongHieu
      FROM thuong_hieu b
      JOIN san_pham p ON p.thuong_hieu_id = b.id
      JOIN phien_ban_san_pham v ON v.san_pham_id = p.id
      WHERE p.danh_muc_id = :categoryId AND p.loai_san_pham = 'DON'
        AND p.trang_thai = 1 AND v.trang_thai = 1
      ORDER BY b.id ASC
      """,
      nativeQuery = true)
  List<PcBuilderBrand> findPcBuilderBrands(@Param("categoryId") Long categoryId);

  @EntityGraph(attributePaths = {"sanPham", "sanPham.danhMuc"})
  @Query("SELECT v FROM PhienBanSanPham v WHERE v.id IN :ids ORDER BY v.id")
  List<PhienBanSanPham> findPcBuilderPreviewVariants(@Param("ids") Collection<Long> ids);

  boolean existsByMaVach(String maVach);

  boolean existsByMaVachAndIdNot(String maVach, Long id);

  boolean existsByMaVachIn(Collection<String> maVach);

  List<PhienBanSanPham> findBySanPhamIdInOrderByIdAsc(Collection<Long> sanPhamIds);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
            SELECT v FROM PhienBanSanPham v
            WHERE v.sanPham.id = :sanPhamId
            ORDER BY v.id
            """)
  List<PhienBanSanPham> findSaleVariantsForUpdate(@Param("sanPhamId") Long sanPhamId);

  @Lock(LockModeType.PESSIMISTIC_READ)
  @Query(
      """
            SELECT v FROM PhienBanSanPham v
            JOIN FETCH v.sanPham
            WHERE v.id IN :ids
            ORDER BY v.id
            """)
  List<PhienBanSanPham> findComponentsForShare(@Param("ids") Collection<Long> ids);

  @Override
  @EntityGraph(attributePaths = "sanPham")
  Page<PhienBanSanPham> findAll(Specification<PhienBanSanPham> specification, Pageable pageable);

  @Query("SELECT v.sanPham.id FROM PhienBanSanPham v WHERE v.id = :id")
  Optional<Long> findProductIdForSale(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT v FROM PhienBanSanPham v WHERE v.id = :id")
  Optional<PhienBanSanPham> findByIdForSaleUpdate(@Param("id") Long id);
}
