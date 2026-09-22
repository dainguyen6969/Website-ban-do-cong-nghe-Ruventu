package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.SoSerialSanPham;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SoSerialSanPhamRepository
    extends JpaRepository<SoSerialSanPham, Long>, JpaSpecificationExecutor<SoSerialSanPham> {

  @Override
  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham", "donHang"})
  Page<SoSerialSanPham> findAll(Specification<SoSerialSanPham> specification, Pageable pageable);

  @Override
  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham", "donHang"})
  Optional<SoSerialSanPham> findById(Long id);

  @Query(
      """
            SELECT s.phienBan.id
            FROM SoSerialSanPham s
            WHERE s.id = :id
            """)
  Optional<Long> findPhienBanIdBySerialId(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM SoSerialSanPham s WHERE s.id = :id")
  Optional<SoSerialSanPham> findByIdForUpdate(@Param("id") Long id);

  boolean existsBySoSerial(String soSerial);

  boolean existsBySoSerialIn(java.util.Collection<String> soSerials);

  long countByPhienBanId(Long phienBanId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
    SELECT s
    FROM SoSerialSanPham s
    WHERE s.donHang.id = :orderId
    ORDER BY s.id
    """)
  java.util.List<SoSerialSanPham> findByOrderForUpdate(@Param("orderId") Long orderId);
}
