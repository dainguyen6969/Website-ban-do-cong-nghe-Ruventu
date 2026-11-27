package com.example.dantruventu.Repository.promotion;

import com.example.dantruventu.Entity.KhuyenMaiDonHang;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminPromotionOrderRepository
    extends JpaRepository<KhuyenMaiDonHang, Long>, JpaSpecificationExecutor<KhuyenMaiDonHang> {

  // Only to-one associations: lines, gifts and returns must not multiply page rows or totals.
  @Override
  @EntityGraph(attributePaths = {"donHang", "donHang.khachHang"})
  Page<KhuyenMaiDonHang> findAll(Specification<KhuyenMaiDonHang> spec, Pageable pageable);

  interface GiftRow {
    Long getOrderId();

    Long getLineId();

    Long getVariantId();

    Integer getQuantity();

    BigDecimal getUnitPrice();

    BigDecimal getLinePayment();
  }

  // These are the gift lines financially committed to the order, including zero-paid lines.
  // No current promotion rule or catalog price is read when displaying historical benefits.
  @Query(
      """
      SELECT c.donHang.id AS orderId, c.id AS lineId, c.phienBan.id AS variantId,
             c.soLuong AS quantity, c.donGia AS unitPrice, c.thanhToanDong AS linePayment
      FROM ChiTietDonHang c
      WHERE c.donHang.id IN :orderIds AND c.laQuaTang = true
      ORDER BY c.donHang.id, c.id
      """)
  List<GiftRow> findGiftRows(@Param("orderIds") Collection<Long> orderIds);
}
