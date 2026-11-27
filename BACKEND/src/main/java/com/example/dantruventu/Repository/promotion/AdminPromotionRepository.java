package com.example.dantruventu.Repository.promotion;

import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminPromotionRepository
    extends JpaRepository<KhuyenMai, Long>, JpaSpecificationExecutor<KhuyenMai> {

  interface PromotionUsageCount {
    Long getPromotionId();

    long getUsageCount();
  }

  @Query(
      """
      SELECT kmdh.khuyenMai.id AS promotionId, COUNT(kmdh) AS usageCount
      FROM KhuyenMaiDonHang kmdh
      WHERE kmdh.khuyenMai.id IN :promotionIds AND kmdh.trangThaiApDung = :status
      GROUP BY kmdh.khuyenMai.id
      """)
  List<PromotionUsageCount> countUsageByPromotion(
      @Param("promotionIds") Collection<Long> promotionIds,
      @Param("status") TrangThaiApDungKhuyenMai status);

  interface PromotionUsageStatusCount {
    TrangThaiApDungKhuyenMai getStatus();

    long getUsageCount();
  }

  @Query(
      """
      SELECT kmdh.trangThaiApDung AS status, COUNT(kmdh) AS usageCount
      FROM KhuyenMaiDonHang kmdh
      WHERE kmdh.khuyenMai.id = :promotionId
      GROUP BY kmdh.trangThaiApDung
      """)
  List<PromotionUsageStatusCount> countUsageByStatus(@Param("promotionId") Long promotionId);

  boolean existsByMaChuongTrinhIgnoreCase(String maChuongTrinh);

  boolean existsByMaChuongTrinhIgnoreCaseAndIdNot(String maChuongTrinh, Long excludedId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT k FROM KhuyenMai k WHERE k.id = :id")
  Optional<KhuyenMai> findByIdForUpdate(@Param("id") Long id);
}
