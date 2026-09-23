package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.PhienBanSanPham;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface PhienBanSanPhamRepository
    extends JpaRepository<PhienBanSanPham, Long>, JpaSpecificationExecutor<PhienBanSanPham> {

  boolean existsByMaVach(String maVach);

  boolean existsByMaVachIn(Collection<String> maVach);

  List<PhienBanSanPham> findBySanPhamIdInOrderByIdAsc(Collection<Long> sanPhamIds);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
            SELECT v FROM PhienBanSanPham v
            WHERE v.sanPham.id = :sanPhamId
            ORDER BY v.id
            """)
  List<PhienBanSanPham> findSaleVariantsForUpdate(@Param("sanPhamId") Long sanPhamId);

  @Lock(LockModeType.PESSIMISTIC_READ)
  @Query(
      """
            SELECT v FROM PhienBanSanPham v
            JOIN FETCH v.sanPham
            WHERE v.id IN :ids
            ORDER BY v.id
            """)
  List<PhienBanSanPham> findComponentsForShare(@Param("ids") Collection<Long> ids);

  @Override
  @EntityGraph(attributePaths = "sanPham")
  Page<PhienBanSanPham> findAll(Specification<PhienBanSanPham> specification, Pageable pageable);

  @Query("SELECT v.sanPham.id FROM PhienBanSanPham v WHERE v.id = :id")
  Optional<Long> findProductIdForSale(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT v FROM PhienBanSanPham v WHERE v.id = :id")
  Optional<PhienBanSanPham> findByIdForSaleUpdate(@Param("id") Long id);
}
