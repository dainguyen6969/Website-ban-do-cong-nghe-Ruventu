package com.example.dantruventu.Repository.promotion;

import com.example.dantruventu.Entity.KhuyenMaiDonHang;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminPromotionStatisticsRepository extends JpaRepository<KhuyenMaiDonHang, Long> {

  interface UsageAggregate {
    TrangThaiApDungKhuyenMai getUsageStatus();

    Long getOrderCount();

    BigDecimal getDiscountTotal();
  }

  interface GiftAggregate {
    Long getVariantId();

    Long getQuantity();
  }

  @Query(
      """
      SELECT a.trangThaiApDung AS usageStatus,
             COUNT(a.id) AS orderCount,
             SUM(a.soTienGiam) AS discountTotal
      FROM KhuyenMaiDonHang a
      WHERE a.khuyenMai.id = :promotionId
      GROUP BY a.trangThaiApDung
      """)
  List<UsageAggregate> summarizeAll(@Param("promotionId") Long promotionId);

  @Query(
      """
      SELECT a.trangThaiApDung AS usageStatus,
             COUNT(a.id) AS orderCount,
             SUM(a.soTienGiam) AS discountTotal
      FROM KhuyenMaiDonHang a
      WHERE a.khuyenMai.id = :promotionId
        AND a.ngayTao >= :start
        AND a.ngayTao < :end
      GROUP BY a.trangThaiApDung
      """)
  List<UsageAggregate> summarizePeriod(
      @Param("promotionId") Long promotionId,
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end);

  // One application per order. Aggregate gift lines separately from usage and discounts.
  @Query(
      """
      SELECT c.phienBan.id AS variantId, SUM(c.soLuong) AS quantity
      FROM ChiTietDonHang c, KhuyenMaiDonHang a
      WHERE c.donHang.id = a.donHang.id
        AND a.khuyenMai.id = :promotionId
        AND a.trangThaiApDung = :usedStatus
        AND a.ngayTao >= :start
        AND a.ngayTao < :end
        AND c.laQuaTang = true
      GROUP BY c.phienBan.id
      ORDER BY c.phienBan.id
      """)
  List<GiftAggregate> summarizeDeliveredGifts(
      @Param("promotionId") Long promotionId,
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end,
      @Param("usedStatus") TrangThaiApDungKhuyenMai usedStatus);
}
