package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.DanhMuc;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DanhMucRepository
    extends JpaRepository<DanhMuc, Long>, JpaSpecificationExecutor<DanhMuc> {

  Optional<DanhMuc> findByDuongDanUrl(String duongDanUrl);

  List<DanhMuc> findByDanhMucChaId(Long danhMucChaId);

  boolean existsByDanhMucChaId(Long danhMucChaId);

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
  }

  @Query(
      """
            SELECT d.id AS danhMucId,
                   COUNT(s.id) AS soLuongSanPham
            FROM DanhMuc d
            LEFT JOIN d.danhSachSanPham s
            WHERE d.id IN :ids
            GROUP BY d.id
            """)
  List<ProductCountProjection> countProductsByCategoryIds(@Param("ids") Collection<Long> ids);
}
