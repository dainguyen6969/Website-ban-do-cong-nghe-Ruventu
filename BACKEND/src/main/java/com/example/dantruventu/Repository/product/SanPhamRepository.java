package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.SanPham;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SanPhamRepository
    extends JpaRepository<SanPham, Long>, JpaSpecificationExecutor<SanPham> {
  boolean existsByMaSanPham(String maSanPham);

  boolean existsByMaSanPhamAndIdNot(String maSanPham, Long id);
}
