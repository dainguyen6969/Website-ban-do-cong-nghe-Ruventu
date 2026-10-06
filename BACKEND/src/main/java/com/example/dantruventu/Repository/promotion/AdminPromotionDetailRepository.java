package com.example.dantruventu.Repository.promotion;

import com.example.dantruventu.Entity.ChiTietKhuyenMai;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminPromotionDetailRepository extends JpaRepository<ChiTietKhuyenMai, Long> {

  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham"})
  List<ChiTietKhuyenMai> findByKhuyenMai_IdOrderByIdAsc(Long promotionId);
}
