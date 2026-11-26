package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface DanhMucRepository
    extends JpaRepository<DanhMuc, Long>, JpaSpecificationExecutor<DanhMuc> {

  Optional<DanhMuc> findByDuongDanUrl(String duongDanUrl);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT d FROM DanhMuc d WHERE d.id = :id")
  Optional<DanhMuc> findByIdForUpdate(@Param("id") Long id);

  List<DanhMuc> findByDuongDanUrlIn(Collection<String> slugs);

  List<DanhMuc> findByDanhMucChaId(Long danhMucChaId);

  boolean existsByDanhMucChaIdAndTrangThai(Long danhMucChaId, TrangThaiCoBanEnum trangThai);

  boolean existsByTenDanhMucIgnoreCase(String tenDanhMuc);

  boolean existsByTenDanhMucIgnoreCaseAndIdNot(String tenDanhMuc, Long id);

  boolean existsByDuongDanUrl(String duongDanUrl);

  boolean existsByDuongDanUrlAndIdNot(String duongDanUrl, Long id);

  @Override
  @EntityGraph(attributePaths = "danhMucCha")
  Page<DanhMuc> findAll(Specification<DanhMuc> specification, Pageable pageable);

  interface ProductCountProjection {

    Long getDanhMucId();

    Long getSoLuongSanPham();

    Long getSoLuongSanPhamDangKinhDoanh();
  }

  @Query(
      """
                        SELECT d.id AS danhMucId,
                               COUNT(s.id) AS soLuongSanPham,
                               SUM(CASE WHEN s.trangThai = :activeStatus THEN 1 ELSE 0 END)
                                   AS soLuongSanPhamDangKinhDoanh
                        FROM DanhMuc d
                        LEFT JOIN d.danhSachSanPham s
                        WHERE d.id IN :ids
                        GROUP BY d.id
                        """)
  List<ProductCountProjection> countProductsByCategoryIds(
      @Param("ids") Collection<Long> ids, @Param("activeStatus") TrangThaiCoBanEnum activeStatus);
}
