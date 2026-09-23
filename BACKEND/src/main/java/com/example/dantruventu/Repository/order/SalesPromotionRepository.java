package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesPromotionRepository extends JpaRepository<KhuyenMai, Long> {

  Optional<KhuyenMai> findByMaChuongTrinhIgnoreCase(String code);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      SELECT k FROM KhuyenMai k
      WHERE LOWER(k.maChuongTrinh) = LOWER(:code)
      """)
  Optional<KhuyenMai> findByCodeForUpdate(@Param("code") String code);

  @Query(
      """
      SELECT k FROM KhuyenMai k
      WHERE k.trangThai = :status
        AND k.ngayBatDau <= :now
        AND k.ngayKetThuc >= :now
        AND (
          k.soLuongApDung IS NULL
          OR COALESCE(k.soLuongDaDung, 0) < k.soLuongApDung
        )
      ORDER BY k.id
      """)
  List<KhuyenMai> findAvailable(
      @Param("status") TrangThaiCoBanEnum status, @Param("now") LocalDateTime now);
}
