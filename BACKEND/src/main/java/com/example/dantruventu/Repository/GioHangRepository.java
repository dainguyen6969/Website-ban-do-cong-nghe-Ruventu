package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.GioHang;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GioHangRepository extends JpaRepository<GioHang, Long> {

    List<GioHang> findByNguoiDungIdOrderByNgayCapNhatDesc(
            Long nguoiDungId
    );

    Optional<GioHang> findByNguoiDungIdAndPhienBanId(
            Long nguoiDungId,
            Long phienBanId
    );
}