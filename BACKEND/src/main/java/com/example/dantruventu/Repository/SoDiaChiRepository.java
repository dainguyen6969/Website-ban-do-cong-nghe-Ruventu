package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.SoDiaChi;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SoDiaChiRepository extends JpaRepository<SoDiaChi, Long> {

  List<SoDiaChi> findByNguoiDungId(Long nguoiDungId);
}
