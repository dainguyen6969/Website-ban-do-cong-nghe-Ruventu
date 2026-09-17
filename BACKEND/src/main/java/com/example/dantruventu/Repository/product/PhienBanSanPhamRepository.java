package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.PhienBanSanPham;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhienBanSanPhamRepository extends JpaRepository<PhienBanSanPham, Long> {

  boolean existsByMaVach(String maVach);

  boolean existsByMaVachIn(Collection<String> maVach);
}
