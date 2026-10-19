package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.LichSuBaoHanh;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WarrantyHistoryRepository extends JpaRepository<LichSuBaoHanh, Long> {
  @EntityGraph(attributePaths = "nguoiThucHien")
  List<LichSuBaoHanh> findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(Long ticketId);

  @EntityGraph(attributePaths = "nguoiThucHien")
  Page<LichSuBaoHanh> findByPhieuBaoHanh_Id(Long ticketId, Pageable pageable);

  @Query(
      "SELECT h FROM LichSuBaoHanh h WHERE h.id = :id AND h.phieuBaoHanh IS NULL AND h.loaiSuKien = 'YEU_CAU_TIEP_NHAN'")
  Optional<LichSuBaoHanh> findIntakeById(@Param("id") Long id);

  @Query(
      value =
          """
      SELECT h.* FROM lich_su_bao_hanh h
      WHERE JSON_CONTAINS_PATH(h.du_lieu_chi_tiet, 'one', '$.yeu_cau_tiep_nhan') = 1
        AND (:serial IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,
             '$.yeu_cau_tiep_nhan.so_serial')) = :serial)
        AND (:tracking IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,
             '$.yeu_cau_tiep_nhan.ma_theo_doi')) = :tracking)
        AND (:orderCode IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,
             '$.yeu_cau_tiep_nhan.ma_don_hang')) = :orderCode)
        AND (:phone IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,
             '$.yeu_cau_tiep_nhan.sdt_nguoi_lien_he')) = :phone)
      ORDER BY h.ngay_tao ASC, h.id ASC
      """,
      nativeQuery = true)
  List<LichSuBaoHanh> searchIntakes(
      @Param("serial") String serial,
      @Param("tracking") String tracking,
      @Param("orderCode") String orderCode,
      @Param("phone") String phone);

  @Query(
      value =
          """
      SELECT h.* FROM lich_su_bao_hanh h
      WHERE h.id = :id OR JSON_EXTRACT(h.du_lieu_chi_tiet, '$.yeu_cau_tiep_nhan_id') = :id
      ORDER BY h.ngay_tao ASC, h.id ASC
      """,
      nativeQuery = true)
  List<LichSuBaoHanh> findIntakeEvents(@Param("id") Long id);
}
