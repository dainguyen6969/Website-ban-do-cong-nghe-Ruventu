package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.GioHang;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GioHangRepository extends JpaRepository<GioHang, Long> {

  List<GioHang> findByNguoiDungIdOrderByNgayCapNhatDesc(Long nguoiDungId);

  Optional<GioHang> findByNguoiDungIdAndPhienBanId(Long nguoiDungId, Long phienBanId);
}
