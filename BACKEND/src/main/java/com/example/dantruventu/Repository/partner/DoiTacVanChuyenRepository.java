package com.example.dantruventu.Repository.partner;

import com.example.dantruventu.Entity.DoiTacVanChuyen;
import com.example.dantruventu.Enum.LoaiDoiTacVanChuyenEnum;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface DoiTacVanChuyenRepository
    extends JpaRepository<DoiTacVanChuyen, Long>, JpaSpecificationExecutor<DoiTacVanChuyen> {

  boolean existsBySoDienThoai(String soDienThoai);

  @Query(
      """
      SELECT d
      FROM DoiTacVanChuyen d
      WHERE d.trangThai = :activeStatus
        AND (
          :keyword IS NULL
          OR LOWER(d.tenDoiTac) LIKE :keyword ESCAPE '!'
          OR LOWER(d.soDienThoai) LIKE :keyword ESCAPE '!'
        )
      """)
  Page<DoiTacVanChuyen> findActiveReceiptPayers(
      @Param("activeStatus") TrangThaiCoBanEnum activeStatus,
      @Param("keyword") String keyword,
      Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_READ)
  Optional<DoiTacVanChuyen> findFirstByLoaiDoiTacOrderByTrangThaiDescIdAsc(
      LoaiDoiTacVanChuyenEnum loaiDoiTac);

  @Modifying
  @Query(
      value =
          """
                    INSERT INTO doi_tac_van_chuyen
                        (ma_doi_tac, ten_doi_tac, so_dien_thoai, loai_doi_tac, trang_thai,
                         ngay_tao, ngay_cap_nhat)
                    VALUES ('GHN', 'Giao Hàng Nhanh', '1900636677', 'GHN', 1, :now, :now)
                    ON DUPLICATE KEY UPDATE id = id
                    """,
      nativeQuery = true)
  void insertGhnPartnerIfAbsent(@Param("now") LocalDateTime now);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT d FROM DoiTacVanChuyen d WHERE d.id = :id")
  Optional<DoiTacVanChuyen> findByIdForUpdate(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_READ)
  @Query("SELECT d FROM DoiTacVanChuyen d WHERE d.id = :id")
  Optional<DoiTacVanChuyen> findByIdForShare(@Param("id") Long id);
}
