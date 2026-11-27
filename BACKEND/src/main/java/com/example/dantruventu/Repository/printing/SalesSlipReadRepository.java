package com.example.dantruventu.Repository.printing;

import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Entity.SoQuyThuChi;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesSlipReadRepository extends JpaRepository<PhieuTraHang, Long> {
  @Query(
      """
      SELECT returned FROM PhieuTraHang returned
      WHERE returned.donHang.id = :orderId
      ORDER BY returned.ngayTao, returned.id
      """)
  List<PhieuTraHang> findReturns(@Param("orderId") Long orderId);

  @Query(
      """
      SELECT DISTINCT voucher FROM SoQuyThuChi voucher
      LEFT JOIN voucher.phieuTraHang linkedReturn
      LEFT JOIN linkedReturn.donHang linkedOrder
      WHERE linkedOrder.id = :orderId
         OR voucher.maChungTuThamChieu = :orderCode
         OR voucher.maChungTuThamChieu IN
             (SELECT returned.maTraHang FROM PhieuTraHang returned
              WHERE returned.donHang.id = :orderId)
      ORDER BY voucher.ngayGhiNhan, voucher.id
      """)
  List<SoQuyThuChi> findMoney(@Param("orderId") Long orderId, @Param("orderCode") String orderCode);
}
