package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.ChiTietDonHang;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChiTietDonHangRepository extends JpaRepository<ChiTietDonHang, Long> {

  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham"})
  List<ChiTietDonHang> findByDonHang_IdOrderByIdAsc(Long orderId);

  /*
   * MVP một kho.
   * Những đơn đang đóng gói/đã đóng gói nhưng chưa xuất phải giữ đủ hàng.
   */
  @Query(
      value =
          """
          SELECT COALESCE(SUM(x.quantity), 0)
          FROM (
              SELECT ct.so_luong AS quantity
              FROM chi_tiet_don_hang ct
              JOIN don_hang d ON d.id = ct.don_hang_id
              JOIN phien_ban_san_pham v ON v.id = ct.phien_ban_id
              JOIN san_pham p ON p.id = v.san_pham_id
              WHERE v.id = :variantId
                AND p.loai_san_pham = 'DON'
                AND d.loai_don_hang = 'ONLINE'
                AND d.trang_thai_don_hang IN ('CHO_DONG_GOI', 'CHO_LAY_HANG')
                AND d.trang_thai_dong_goi IN ('DANG_DONG_GOI', 'DA_DONG_GOI')
                AND d.trang_thai_xuat_kho = 'CHUA_XUAT_KHO'

              UNION ALL

              SELECT ct.so_luong * c.so_luong AS quantity
              FROM chi_tiet_don_hang ct
              JOIN don_hang d ON d.id = ct.don_hang_id
              JOIN phien_ban_san_pham v ON v.id = ct.phien_ban_id
              JOIN san_pham p ON p.id = v.san_pham_id
              JOIN thanh_phan_combo c ON c.san_pham_combo_id = p.id
              WHERE c.phien_ban_thanh_phan_id = :variantId
                AND p.loai_san_pham = 'BO_PC'
                AND d.loai_don_hang = 'ONLINE'
                AND d.trang_thai_don_hang IN ('CHO_DONG_GOI', 'CHO_LAY_HANG')
                AND d.trang_thai_dong_goi IN ('DANG_DONG_GOI', 'DA_DONG_GOI')
                AND d.trang_thai_xuat_kho = 'CHUA_XUAT_KHO'
          ) x
          """,
      nativeQuery = true)
  Long sumReservedQuantity(@Param("variantId") Long variantId);

  @Query(
      """
    SELECT c
    FROM ChiTietDonHang c
    JOIN FETCH c.phienBan v
    JOIN FETCH v.sanPham
    WHERE c.id IN (
        SELECT MIN(x.id)
        FROM ChiTietDonHang x
        WHERE x.donHang.id IN :orderIds
        GROUP BY x.donHang.id
    )
    """)
  List<ChiTietDonHang> findFirstLinesForOrders(
      @Param("orderIds") java.util.Collection<Long> orderIds);
}
