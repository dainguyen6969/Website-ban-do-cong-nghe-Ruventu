package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.GiuHangTungPhan;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GiuHangTungPhanRepository extends JpaRepository<GiuHangTungPhan, Long> {

  List<GiuHangTungPhan> findByDonHangIdOrderByPhienBanIdAsc(Long orderId);

  boolean existsByDonHangId(Long orderId);

  @Query(
      value =
          """
          SELECT COALESCE(SUM(g.so_luong), 0)
          FROM giu_hang_tung_phan g
          JOIN don_hang d ON d.id = g.don_hang_id
          WHERE g.phien_ban_id = :variantId
            AND d.trang_thai_xuat_kho = 'CHUA_XUAT_KHO'
          """,
      nativeQuery = true)
  Long sumReservedQuantity(@Param("variantId") Long variantId);
}
