package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChiTietTraHangRepository extends JpaRepository<ChiTietTraHang, Long> {

  @EntityGraph(
      attributePaths = {
        "chiTietDonHang",
        "chiTietDonHang.phienBan",
        "chiTietDonHang.phienBan.sanPham"
      })
  List<ChiTietTraHang> findByPhieuTraHang_IdOrderByIdAsc(Long returnId);

  interface ReturnedQuantityProjection {

    Long getChiTietDonHangId();

    Long getSoLuongDaYeuCauTra();

    BigDecimal getTongTienDaYeuCauTra();
  }

  interface ReceivedQuantityProjection {

    Long getChiTietDonHangId();

    Long getSoLuongDaNhan();
  }

  @Query(
      """
      SELECT c.chiTietDonHang.id AS chiTietDonHangId,
             SUM(c.soLuong) AS soLuongDaYeuCauTra,
             SUM(c.thanhTienHoan) AS tongTienDaYeuCauTra
      FROM ChiTietTraHang c
      WHERE c.chiTietDonHang.donHang.id = :orderId
      GROUP BY c.chiTietDonHang.id
      """)
  List<ReturnedQuantityProjection> sumReturnedQuantityByOrder(
      @Param("orderId") Long orderId);

  @Query(
      """
      SELECT c.chiTietDonHang.id AS chiTietDonHangId,
             SUM(c.soLuong) AS soLuongDaNhan
      FROM ChiTietTraHang c
      WHERE c.chiTietDonHang.donHang.id = :orderId
        AND c.phieuTraHang.trangThaiTraHang IN :statuses
      GROUP BY c.chiTietDonHang.id
      """)
  List<ReceivedQuantityProjection> sumReceivedQuantityByOrder(
      @Param("orderId") Long orderId,
      @Param("statuses") Collection<TrangThaiTraHang> statuses);
}
