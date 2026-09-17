package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.DanhMuc;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DanhMucRepository extends JpaRepository<DanhMuc, Long> {

  Optional<DanhMuc> findByDuongDanUrl(String duongDanUrl);

  List<DanhMuc> findByDanhMucChaId(Long danhMucChaId);
}
