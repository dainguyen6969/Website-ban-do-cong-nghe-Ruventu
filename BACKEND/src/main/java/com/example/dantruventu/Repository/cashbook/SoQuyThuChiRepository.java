package com.example.dantruventu.Repository.cashbook;

import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SoQuyThuChiRepository extends JpaRepository<SoQuyThuChi, Long> {

  Optional<SoQuyThuChi> findByMaPhieu(String maPhieu);

  @Query(
      """
            SELECT COALESCE(SUM(s.soTien), 0)
            FROM SoQuyThuChi s
            WHERE s.maChungTuThamChieu = :maDonNhap
              AND s.loaiPhieu = :loaiPhieu
              AND s.trangThai = :trangThai
            """)
  BigDecimal sumByPurchaseOrder(
      @Param("maDonNhap") String maDonNhap,
      @Param("loaiPhieu") LoaiPhieuThuChi loaiPhieu,
      @Param("trangThai") TrangThaiPhieuThuChi trangThai);
}
