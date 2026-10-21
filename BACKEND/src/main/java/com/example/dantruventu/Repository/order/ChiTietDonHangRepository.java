package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Enum.LoaiSanPham;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChiTietDonHangRepository extends JpaRepository<ChiTietDonHang, Long> {

  // Called only after locking the order and its lines, shared with warranty intake.
  @Query(
      "SELECT COUNT(w) FROM PhieuBaoHanh w WHERE w.thietBi.chiTietDonHang.id IN :lineIds AND w.trangThaiXuLy <> com.example.dantruventu.Enum.TrangThaiBaoHanh.HOAN_TAT")
  long countOpenWarrantiesForLines(@Param("lineIds") java.util.Collection<Long> lineIds);

  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham"})
  List<ChiTietDonHang> findByDonHang_IdOrderByIdAsc(Long orderId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham"})
  @Query(
      """
      SELECT c
      FROM ChiTietDonHang c
      WHERE c.donHang.id = :orderId
      ORDER BY c.id
      """)
  List<ChiTietDonHang> findByDonHangIdForUpdate(@Param("orderId") Long orderId);

  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham", "donHang"})
  @Query(
      """
    SELECT c
    FROM ChiTietDonHang c
    WHERE c.donHang.loaiDonHang =
        com.example.dantruventu.Enum.LoaiDonHang.ONLINE
      AND c.donHang.trangThaiDonHang IN (
        com.example.dantruventu.Enum.TrangThaiDonHang.CHO_DONG_GOI,
        com.example.dantruventu.Enum.TrangThaiDonHang.CHO_LAY_HANG
      )
      AND c.donHang.trangThaiDongGoi IN (
        com.example.dantruventu.Enum.TrangThaiDongGoi.DANG_DONG_GOI,
        com.example.dantruventu.Enum.TrangThaiDongGoi.DA_DONG_GOI
      )
      AND c.donHang.trangThaiXuatKho =
        com.example.dantruventu.Enum.TrangThaiXuatKho.CHUA_XUAT_KHO
    ORDER BY c.id
    """)
  List<ChiTietDonHang> findHeldLines();

  @Query(
      """
      SELECT DISTINCT c.donHang.id
      FROM ChiTietDonHang c
      WHERE c.donHang.id IN :orderIds
        AND (
          c.laQuaTang = true
          OR c.phienBan.sanPham.loaiSanPham = :comboType
          OR EXISTS (
            SELECT sibling.id
            FROM ChiTietDonHang sibling
            WHERE sibling.donHang = c.donHang
              AND sibling.phienBan = c.phienBan
              AND sibling.id <> c.id
          )
        )
      """)
  List<Long> findOrderIdsRequiringFullReturn(
      @Param("orderIds") Collection<Long> orderIds, @Param("comboType") LoaiSanPham comboType);

  /*
   * MVP một kho.
   * Những đơn đang đóng gói/đã đóng gói nhưng chưa xuất phải giữ đủ hàng. (Sau này sẽ thay đổi lại thành đóng gói sẽ giữ hàng.)
   */
  @Query(
      value =
          """
        SELECT COALESCE(SUM(x.quantity), 0)
        FROM (
            SELECT
                ct.don_hang_id AS order_id,
                part.variant_id,
                part.quantity
            FROM chi_tiet_don_hang ct
            JOIN JSON_TABLE(
                CASE
                    WHEN JSON_UNQUOTE(
                        JSON_EXTRACT(ct.cau_hinh_da_ban, '$.loai_san_pham')
                    ) = 'BO_PC'
                    THEN JSON_EXTRACT(
                        ct.cau_hinh_da_ban, '$.thanh_phan'
                    )
                    ELSE JSON_ARRAY(JSON_OBJECT(
                        'phien_ban_id', ct.phien_ban_id,
                        'so_luong_tong', ct.so_luong
                    ))
                END,
                '$[*]' COLUMNS (
                    variant_id BIGINT PATH '$.phien_ban_id',
                    quantity BIGINT PATH '$.so_luong_tong'
                )
            ) part ON TRUE
            WHERE JSON_EXTRACT(
                ct.cau_hinh_da_ban, '$.phien_ban_snapshot'
            ) = 1

            UNION ALL

            SELECT ct.don_hang_id, ct.phien_ban_id, ct.so_luong
            FROM chi_tiet_don_hang ct
            JOIN phien_ban_san_pham v ON v.id = ct.phien_ban_id
            JOIN san_pham p ON p.id = v.san_pham_id
            WHERE p.loai_san_pham = 'DON'
              AND JSON_EXTRACT(
                  ct.cau_hinh_da_ban, '$.phien_ban_snapshot'
              ) IS NULL

            UNION ALL

            SELECT
                ct.don_hang_id,
                c.phien_ban_thanh_phan_id,
                ct.so_luong * c.so_luong
            FROM chi_tiet_don_hang ct
            JOIN phien_ban_san_pham v ON v.id = ct.phien_ban_id
            JOIN san_pham p ON p.id = v.san_pham_id
            JOIN thanh_phan_combo c ON c.san_pham_combo_id = p.id
            WHERE p.loai_san_pham = 'BO_PC'
              AND JSON_EXTRACT(
                  ct.cau_hinh_da_ban, '$.phien_ban_snapshot'
              ) IS NULL
        ) x
        JOIN don_hang d ON d.id = x.order_id
        WHERE x.variant_id = :variantId
          AND d.loai_don_hang = 'ONLINE'
          AND d.trang_thai_don_hang IN ('CHO_DONG_GOI', 'CHO_LAY_HANG')
          AND d.trang_thai_dong_goi IN ('DANG_DONG_GOI', 'DA_DONG_GOI')
          AND d.trang_thai_xuat_kho = 'CHUA_XUAT_KHO'
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
  List<ChiTietDonHang> findFirstLinesForOrders(@Param("orderIds") Collection<Long> orderIds);
}
