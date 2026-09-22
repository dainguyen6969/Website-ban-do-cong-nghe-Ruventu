package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.PhieuGiaoHang;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface PhieuGiaoHangRepository
    extends JpaRepository<PhieuGiaoHang, Long>, JpaSpecificationExecutor<PhieuGiaoHang> {

  @Override
  @EntityGraph(attributePaths = {"donHang", "doiTacVanChuyen"})
  Page<PhieuGiaoHang> findAll(Specification<PhieuGiaoHang> specification, Pageable pageable);

  @Override
  @EntityGraph(attributePaths = {"donHang", "doiTacVanChuyen"})
  Optional<PhieuGiaoHang> findById(Long id);

  @Query("SELECT p.donHang.id FROM PhieuGiaoHang p WHERE p.id = :id")
  Optional<Long> findOrderId(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT p FROM PhieuGiaoHang p WHERE p.id = :id")
  Optional<PhieuGiaoHang> findByIdForUpdate(@Param("id") Long id);

  List<PhieuGiaoHang> findByDonHang_IdOrderByIdAsc(Long orderId);

  boolean existsByMaVanDonIgnoreCaseAndIdNot(String maVanDon, Long id);
}
