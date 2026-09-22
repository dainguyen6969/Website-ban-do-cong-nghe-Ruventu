package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.SoDiaChi;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SoDiaChiRepository extends JpaRepository<SoDiaChi, Long> {

    List<SoDiaChi> findByNguoiDungId(Long nguoiDungId);
}