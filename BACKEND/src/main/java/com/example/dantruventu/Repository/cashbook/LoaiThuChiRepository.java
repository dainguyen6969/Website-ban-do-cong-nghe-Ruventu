package com.example.dantruventu.Repository.cashbook;

import com.example.dantruventu.Entity.LoaiThuChi;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoaiThuChiRepository extends JpaRepository<LoaiThuChi, Long> {

  Optional<LoaiThuChi> findByMaLoaiAndTrangThai(String maLoai, TrangThaiCoBanEnum trangThai);
}
