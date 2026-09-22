package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.DonHang;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DonHangRepository extends JpaRepository<DonHang, Long> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT d FROM DonHang d WHERE d.id = :id")
  Optional<DonHang> findByIdForUpdate(@Param("id") Long id);
}
