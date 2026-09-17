package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.NguoiDung;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NguoiDungRepository extends JpaRepository<NguoiDung, Long> {

  Optional<NguoiDung> findByEmail(String email);

  Optional<NguoiDung> findByEmailOrSoDienThoai(String email, String soDienThoai);

  boolean existsByEmail(String email);

  boolean existsBySoDienThoai(String soDienThoai);

  @Query(
      """
      SELECT n
      FROM NguoiDung n
      JOIN FETCH n.vaiTro
      WHERE n.id = :id
      """)
  Optional<NguoiDung> findByIdWithVaiTro(@Param("id") Long id);
}
