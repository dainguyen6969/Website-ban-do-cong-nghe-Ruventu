package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.ThuongHieu;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ThuongHieuRepository extends JpaRepository<ThuongHieu, Long> {

  Optional<ThuongHieu> findByDuongDanUrl(String duongDanUrl);
}
