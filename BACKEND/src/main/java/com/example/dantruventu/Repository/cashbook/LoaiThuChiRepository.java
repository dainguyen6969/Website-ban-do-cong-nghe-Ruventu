package com.example.dantruventu.Repository.cashbook;

import com.example.dantruventu.Entity.LoaiThuChi;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoaiThuChiRepository extends JpaRepository<LoaiThuChi, Long> {

  Optional<LoaiThuChi> findByMaLoai(String maLoai);

  Optional<LoaiThuChi> findByMaLoaiAndTrangThai(String maLoai, TrangThaiCoBanEnum trangThai);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT l FROM LoaiThuChi l WHERE l.maLoai = :maLoai")
  Optional<LoaiThuChi> findByMaLoaiForUpdate(@Param("maLoai") String maLoai);
}
