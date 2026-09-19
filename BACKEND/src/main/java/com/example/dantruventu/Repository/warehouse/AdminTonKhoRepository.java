package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.LoaiSanPham;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AdminTonKhoRepository extends JpaRepository<SanPham, Long> {
    interface ItemProjection {

        String getLoaiDoiTuong();

        Long getDoiTuongId();

        String getAnh();

        String getMaHienThi();

        String getTenHienThi();

        Long getTonCoTheBan();

        Long getTonThucTe();

        String getViTriLuuKho();

        Integer getCanhBao();

        Integer getCoTonAm();
    }

    interface StockProjection {

        Long getKhoHangId();

        String getTenKho();

        Long getTonThucTe();

        Long getTonCoTheBan();

        String getViTriLuuKho();

        Long getMucTonToiThieu();

        Integer getCanhBao();

        Integer getCoTonAm();
    }

    interface ComponentProjection {

        Long getPhienBanId();

        String getTenPhienBan();

        String getMaVach();

        Long getSoLuong();

        Integer getHopLe();
    }

    interface ComponentStockProjection extends StockProjection {

        Long getPhienBanId();
    }

    @Query(
            value = TonKhoSql.FIND_ITEMS,
            countQuery = TonKhoSql.COUNT_ITEMS,
            nativeQuery = true)
    Page<ItemProjection> findInventoryItems(
            @Param("keyword") String keyword,
            @Param("loaiDoiTuong") String loaiDoiTuong,
            @Param("khoHangId") Long khoHangId,
            @Param("chiCanhBao") boolean chiCanhBao,
            @Param("sortField") String sortField,
            @Param("sortDir") String sortDir,
            Pageable pageable);

    @Query(
            """
            SELECT v
            FROM PhienBanSanPham v
            JOIN FETCH v.sanPham p
            WHERE v.id = :id AND p.loaiSanPham = :loai
            """)
    Optional<PhienBanSanPham> findVariant(
            @Param("id") Long id,
            @Param("loai") LoaiSanPham loai);

    @Query(
            """
            SELECT s
            FROM SanPham s
            WHERE s.id = :id AND s.loaiSanPham = :loai
            """)
    Optional<SanPham> findCombo(
            @Param("id") Long id,
            @Param("loai") LoaiSanPham loai);

    @Query(value = TonKhoSql.VARIANT_STOCKS, nativeQuery = true)
    List<StockProjection> findVariantStocks(
            @Param("id") Long id,
            @Param("khoHangId") Long khoHangId);

    @Query(value = TonKhoSql.COMBO_STOCKS, nativeQuery = true)
    List<StockProjection> findComboStocks(
            @Param("id") Long id,
            @Param("khoHangId") Long khoHangId);

    @Query(value = TonKhoSql.COMPONENTS, nativeQuery = true)
    List<ComponentProjection> findComponents(
            @Param("id") Long id,
            @Param("khoHangId") Long khoHangId);

    @Query(value = TonKhoSql.COMPONENT_STOCKS, nativeQuery = true)
    List<ComponentStockProjection> findComponentStocks(
            @Param("id") Long id,
            @Param("khoHangId") Long khoHangId);
}
