package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.NguoiDung;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NguoiDungRepository extends JpaRepository<NguoiDung, Long> {

  Optional<NguoiDung> findByEmail(String email);

  Optional<NguoiDung> findByEmailOrSoDienThoai(String email, String soDienThoai);

  boolean existsByEmail(String email);

  boolean existsBySoDienThoai(String soDienThoai);
}
