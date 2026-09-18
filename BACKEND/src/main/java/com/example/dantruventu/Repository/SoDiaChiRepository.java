package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.SoDiaChi;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SoDiaChiRepository extends JpaRepository<SoDiaChi, Long> {

    List<SoDiaChi> findByNguoiDungId(Long nguoiDungId);

    Optional<SoDiaChi> findFirstByNguoiDungIdAndLaMacDinhTrue(Long nguoiDungId);

    Optional<SoDiaChi> findByNguoiDungIdAndLaMacDinhTrue(Long nguoiDungId);

    Optional<SoDiaChi> findByIdAndNguoiDungId(Long id, Long nguoiDungId);
}