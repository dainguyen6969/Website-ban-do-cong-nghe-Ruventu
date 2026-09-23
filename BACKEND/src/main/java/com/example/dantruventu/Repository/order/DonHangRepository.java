package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.DonHang;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface DonHangRepository
    extends JpaRepository<DonHang, Long>, JpaSpecificationExecutor<DonHang> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT d FROM DonHang d WHERE d.id = :id")
  Optional<DonHang> findByIdForUpdate(@Param("id") Long id);

  @Override
  @EntityGraph(attributePaths = {"khachHang"})
  Page<DonHang> findAll(Specification<DonHang> specification, Pageable pageable);
}
