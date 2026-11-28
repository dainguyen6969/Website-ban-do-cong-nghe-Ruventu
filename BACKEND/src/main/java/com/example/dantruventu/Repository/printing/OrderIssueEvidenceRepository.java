package com.example.dantruventu.Repository.printing;

import com.example.dantruventu.Entity.PhieuBaoHanh;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderIssueEvidenceRepository extends JpaRepository<PhieuBaoHanh, Long> {
  @Query(
      """
      SELECT DISTINCT replacement.soSerial.id
      FROM PhieuBaoHanh warranty
      JOIN warranty.thietBiThayThe replacement
      WHERE warranty.donHang.id = :orderId
        AND replacement.soSerial IS NOT NULL
      """)
  List<Long> findReplacementSerialIds(@Param("orderId") Long orderId);
}
