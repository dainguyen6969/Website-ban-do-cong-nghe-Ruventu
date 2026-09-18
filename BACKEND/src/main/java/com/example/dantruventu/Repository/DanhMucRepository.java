package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.DanhMuc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DanhMucRepository extends JpaRepository<DanhMuc, Long> {

    Optional<DanhMuc> findByDuongDanUrl(String duongDanUrl);

    List<DanhMuc> findByDanhMucChaId(Long danhMucChaId);
}