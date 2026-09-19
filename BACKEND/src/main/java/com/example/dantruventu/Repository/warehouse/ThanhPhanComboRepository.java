package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.ThanhPhanCombo;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ThanhPhanComboRepository extends JpaRepository<ThanhPhanCombo, Long> {

  @Query(
      """
            SELECT c FROM ThanhPhanCombo c
            JOIN FETCH c.phienBanThanhPhan v
            JOIN FETCH v.sanPham
            WHERE c.sanPhamCombo.id IN :ids
            ORDER BY c.sanPhamCombo.id, v.id, c.id
            """)
  List<ThanhPhanCombo> findByComboIds(@Param("ids") Collection<Long> ids);

  @Modifying(flushAutomatically = true)
  @Query(
      """
            DELETE FROM ThanhPhanCombo c
            WHERE c.sanPhamCombo.id = :comboId
            """)
  int deleteComponents(@Param("comboId") Long comboId);
}
