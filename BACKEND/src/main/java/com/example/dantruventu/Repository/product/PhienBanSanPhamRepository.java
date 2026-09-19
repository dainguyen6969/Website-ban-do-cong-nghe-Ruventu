package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.PhienBanSanPham;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhienBanSanPhamRepository extends JpaRepository<PhienBanSanPham, Long> {

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
}
