package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.AnhSanPham;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnhSanPhamRepository extends JpaRepository<AnhSanPham, Long> {
  Optional<AnhSanPham> findFirstBySanPham_IdOrderByLaAnhChinhDescThuTuHienThiAscIdAsc(
      Long sanPhamId);
}
