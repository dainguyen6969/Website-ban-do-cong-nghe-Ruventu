// Product-image persistence queries used for deterministic list thumbnails.
package com.example.dantruventu.Repository.product;

import com.example.dantruventu.Entity.AnhSanPham;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnhSanPhamRepository extends JpaRepository<AnhSanPham, Long> {

  void deleteBySanPhamId(Long sanPhamId);

  List<AnhSanPham> findBySanPhamIdInOrderByThuTuHienThiAscIdAsc(Collection<Long> sanPhamIds);
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnhSanPhamRepository extends JpaRepository<AnhSanPham, Long> {
  Optional<AnhSanPham> findFirstBySanPham_IdOrderByLaAnhChinhDescThuTuHienThiAscIdAsc(
      Long sanPhamId);
}
