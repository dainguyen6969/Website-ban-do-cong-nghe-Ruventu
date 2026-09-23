package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.ChiTietDonNhap;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChiTietDonNhapRepository extends JpaRepository<ChiTietDonNhap, Long> {

  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham"})
  List<ChiTietDonNhap> findByDonNhapHangIdOrderByIdAsc(Long donNhapHangId);

  void deleteByDonNhapHangId(Long donNhapHangId);
}
