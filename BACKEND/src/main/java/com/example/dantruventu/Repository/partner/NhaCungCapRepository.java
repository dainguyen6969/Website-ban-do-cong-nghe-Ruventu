package com.example.dantruventu.Repository.partner;

import com.example.dantruventu.Entity.NhaCungCap;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NhaCungCapRepository
    extends JpaRepository<NhaCungCap, Long>, JpaSpecificationExecutor<NhaCungCap> {
  boolean existsByMaNhaCungCapIgnoreCase(String maNhaCungCap);

  boolean existsBySoDienThoai(String soDienThoai);

  boolean existsBySoDienThoaiAndIdNot(String soDienThoai, Long id);

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

  @Query(
      """
      SELECT n
      FROM NhaCungCap n
      WHERE n.trangThai = :activeStatus
        AND (
          :keyword IS NULL
          OR LOWER(n.tenNhaCungCap) LIKE :keyword ESCAPE '!'
          OR LOWER(n.soDienThoai) LIKE :keyword ESCAPE '!'
        )
      """)
  Page<NhaCungCap> findActiveReceiptPayers(
      @Param("activeStatus") TrangThaiCoBanEnum activeStatus,
      @Param("keyword") String keyword,
      Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT n FROM NhaCungCap n WHERE n.id = :id")
  Optional<NhaCungCap> findByIdForUpdate(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_READ)
  @Query("SELECT n FROM NhaCungCap n WHERE n.id = :id")
  Optional<NhaCungCap> findByIdForShare(@Param("id") Long id);
}
