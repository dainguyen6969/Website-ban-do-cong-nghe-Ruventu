package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.NguoiDung;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NguoiDungRepository extends JpaRepository<NguoiDung, Long> {

    Optional<NguoiDung> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsBySoDienThoai(String soDienThoai);
}