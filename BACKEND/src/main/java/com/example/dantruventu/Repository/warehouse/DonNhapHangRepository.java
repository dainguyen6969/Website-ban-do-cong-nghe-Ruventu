package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.DonNhapHang;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DonNhapHangRepository
    extends JpaRepository<DonNhapHang, Long>, JpaSpecificationExecutor<DonNhapHang> {
  Page<DonNhapHang> findByNhaCungCap_Id(Long nhaCungCapId, Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
            SELECT d
            FROM DonNhapHang d
            WHERE d.id = :id
            """)
  Optional<DonNhapHang> findByIdForUpdate(@Param("id") Long id);
}
