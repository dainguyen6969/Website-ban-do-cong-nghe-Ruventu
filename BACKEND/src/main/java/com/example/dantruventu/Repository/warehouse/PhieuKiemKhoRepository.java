package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.PhieuKiemKho;
import com.example.dantruventu.Enum.TrangThaiPhieuKiemKho;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PhieuKiemKhoRepository
    extends JpaRepository<PhieuKiemKho, Long>, JpaSpecificationExecutor<PhieuKiemKho> {

  boolean existsByPhienBan_IdAndTrangThai(
      Long phienBanId, TrangThaiPhieuKiemKho trangThai);

  @Override
  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham", "nguoiKiem"})
  Page<PhieuKiemKho> findAll(
      Specification<PhieuKiemKho> specification, Pageable pageable);

  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham", "nguoiKiem"})
  @Query("SELECT p FROM PhieuKiemKho p WHERE p.id = :id")
  Optional<PhieuKiemKho> findDetailById(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham", "nguoiKiem"})
  @Query("SELECT p FROM PhieuKiemKho p WHERE p.id = :id")
  Optional<PhieuKiemKho> findByIdForInventoryCheckUpdate(@Param("id") Long id);
}
