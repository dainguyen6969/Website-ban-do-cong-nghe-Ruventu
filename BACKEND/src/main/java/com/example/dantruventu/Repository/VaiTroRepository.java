package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.VaiTro;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VaiTroRepository
    extends JpaRepository<VaiTro, Long>, JpaSpecificationExecutor<VaiTro> {

  Optional<VaiTro> findByTenVaiTro(String tenVaiTro);

  boolean existsByTenVaiTroIgnoreCase(String tenVaiTro);

  @Query(
      """
      SELECT CASE WHEN COUNT(v) > 0 THEN TRUE ELSE FALSE END
      FROM VaiTro v
      WHERE LOWER(TRIM(v.tenVaiTro)) = LOWER(TRIM(:tenVaiTro))
      """)
  boolean existsByTrimmedTenVaiTroIgnoreCase(@Param("tenVaiTro") String tenVaiTro);

  @Query(
      """
      SELECT CASE WHEN COUNT(v) > 0 THEN TRUE ELSE FALSE END
      FROM VaiTro v
      WHERE LOWER(TRIM(v.tenVaiTro)) = LOWER(TRIM(:tenVaiTro))
        AND v.id <> :excludeId
      """)
  boolean existsByTrimmedTenVaiTroIgnoreCaseAndIdNot(
      @Param("tenVaiTro") String tenVaiTro, @Param("excludeId") Long excludeId);
}
