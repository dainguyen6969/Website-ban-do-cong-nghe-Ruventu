package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.PhieuTraHang;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhieuTraHangRepository
    extends JpaRepository<PhieuTraHang, Long>, JpaSpecificationExecutor<PhieuTraHang> {

  @Override
  @EntityGraph(attributePaths = {"donHang", "khachHang"})
  Optional<PhieuTraHang> findById(Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT p FROM PhieuTraHang p WHERE p.id = :id")
  Optional<PhieuTraHang> findByIdForUpdate(@Param("id") Long id);

  @Override
  @EntityGraph(attributePaths = {"donHang", "khachHang"})
  Page<PhieuTraHang> findAll(Specification<PhieuTraHang> specification, Pageable pageable);

  Optional<PhieuTraHang> findByMaTraHang(String maTraHang);

  boolean existsByDonHang_Id(Long orderId);
}
