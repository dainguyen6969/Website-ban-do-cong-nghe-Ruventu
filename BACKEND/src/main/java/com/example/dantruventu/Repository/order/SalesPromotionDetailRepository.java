package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.ChiTietKhuyenMai;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesPromotionDetailRepository extends JpaRepository<ChiTietKhuyenMai, Long> {

  List<ChiTietKhuyenMai> findByKhuyenMai_IdOrderByIdAsc(Long khuyenMaiId);
}
