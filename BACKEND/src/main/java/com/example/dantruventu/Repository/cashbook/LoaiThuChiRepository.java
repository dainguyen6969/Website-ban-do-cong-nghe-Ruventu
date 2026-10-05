package com.example.dantruventu.Repository.cashbook;

import com.example.dantruventu.Entity.LoaiThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoaiThuChiRepository
    extends JpaRepository<LoaiThuChi, Long>, JpaSpecificationExecutor<LoaiThuChi> {

  Optional<LoaiThuChi> findByMaLoai(String maLoai);

  Optional<LoaiThuChi> findByMaLoaiAndTrangThai(String maLoai, TrangThaiCoBanEnum trangThai);

  boolean existsByMaLoaiIgnoreCase(String maLoai);

  Optional<LoaiThuChi> findByIdAndLoaiPhieu(Long id, LoaiPhieuThuChi loaiPhieu);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      SELECT l
      FROM LoaiThuChi l
      WHERE l.id = :id
        AND l.loaiPhieu = :loaiPhieu
      """)
  Optional<LoaiThuChi> findByIdAndLoaiPhieuForUpdate(
      @Param("id") Long id, @Param("loaiPhieu") LoaiPhieuThuChi loaiPhieu);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      """
      UPDATE LoaiThuChi l
      SET l.trangThai = :trangThai
      WHERE l.id = :id
      """)
  int updateStatus(
      @Param("id") Long id, @Param("trangThai") TrangThaiCoBanEnum trangThai);

  @Lock(LockModeType.PESSIMISTIC_READ)
  @Query("SELECT l FROM LoaiThuChi l WHERE l.id = :id")
  Optional<LoaiThuChi> findByIdForShare(@Param("id") Long id);
    
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT l FROM LoaiThuChi l WHERE l.maLoai = :maLoai")
  Optional<LoaiThuChi> findByMaLoaiForUpdate(@Param("maLoai") String maLoai);
}
