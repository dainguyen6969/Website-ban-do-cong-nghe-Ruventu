package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.ThuongHieu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ThuongHieuRepository extends JpaRepository<ThuongHieu, Long> {

    Optional<ThuongHieu> findByDuongDanUrl(String duongDanUrl);
}