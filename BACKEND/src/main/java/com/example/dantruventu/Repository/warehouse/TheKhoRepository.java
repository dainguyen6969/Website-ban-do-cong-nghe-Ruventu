package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.TheKho;
import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TheKhoRepository
    extends JpaRepository<TheKho, Long>, JpaSpecificationExecutor<TheKho> {

  @Override
  @EntityGraph(attributePaths = {"phienBan", "khoHang"})
  Page<TheKho> findAll(Specification<TheKho> specification, Pageable pageable);

  boolean existsByPhienBanId(Long phienBanId);

  boolean existsByMaChungTuGocAndLoaiGiaoDich(Long maChungTuGoc, LoaiGiaoDichKho loaiGiaoDich);

  @Query(
      """
            SELECT COALESCE(SUM(t.soLuongThayDoi), 0)
            FROM TheKho t
            WHERE t.maChungTuGoc = :donNhapId
              AND t.phienBan.id = :phienBanId
              AND t.loaiGiaoDich = :loai
            """)
  Integer sumMovement(
      @Param("donNhapId") Long donNhapId,
      @Param("phienBanId") Long phienBanId,
      @Param("loai") LoaiGiaoDichKho loai);
}
