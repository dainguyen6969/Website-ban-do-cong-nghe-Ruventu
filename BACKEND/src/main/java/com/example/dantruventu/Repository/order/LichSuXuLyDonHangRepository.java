package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.LichSuXuLyDonHang;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LichSuXuLyDonHangRepository extends JpaRepository<LichSuXuLyDonHang, Long> {
  @EntityGraph(attributePaths = "nguoiThucHien")
  List<LichSuXuLyDonHang> findByDonHang_IdOrderByNgayThucHienAscIdAsc(Long orderId);
}
