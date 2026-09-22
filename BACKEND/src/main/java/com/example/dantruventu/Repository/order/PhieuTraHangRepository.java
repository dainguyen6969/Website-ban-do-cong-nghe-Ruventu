package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.PhieuTraHang;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhieuTraHangRepository extends JpaRepository<PhieuTraHang, Long> {

  Optional<PhieuTraHang> findByMaTraHang(String maTraHang);

  boolean existsByDonHang_Id(Long orderId);
}
