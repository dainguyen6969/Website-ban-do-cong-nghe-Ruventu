package com.example.dantruventu.Repository.promotion;

import com.example.dantruventu.Entity.KhuyenMai;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminPromotionRepository
    extends JpaRepository<KhuyenMai, Long>, JpaSpecificationExecutor<KhuyenMai> {

  boolean existsByMaChuongTrinhIgnoreCase(String maChuongTrinh);

  boolean existsByMaChuongTrinhIgnoreCaseAndIdNot(String maChuongTrinh, Long excludedId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT k FROM KhuyenMai k WHERE k.id = :id")
  Optional<KhuyenMai> findByIdForUpdate(@Param("id") Long id);
}
