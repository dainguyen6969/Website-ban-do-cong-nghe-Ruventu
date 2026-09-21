package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.VaiTro;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VaiTroRepository extends JpaRepository<VaiTro, Long> {

  Optional<VaiTro> findByTenVaiTro(String tenVaiTro);
}
