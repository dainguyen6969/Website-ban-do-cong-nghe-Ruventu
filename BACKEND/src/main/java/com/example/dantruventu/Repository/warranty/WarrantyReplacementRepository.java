package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import jakarta.persistence.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WarrantyReplacementRepository {
  private final EntityManager em;
  private final JdbcTemplate jdbc;

  public PhienBanSanPham activeVariant(Long id) {
    var variant = em.find(PhienBanSanPham.class, id, LockModeType.PESSIMISTIC_READ);
    if (variant == null)
      throw WarrantyReadException.notFound(
          ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
          "phien_ban_thay_the_id",
          "PRODUCT_VARIANT_NOT_FOUND");
    em.refresh(variant, LockModeType.PESSIMISTIC_READ);
    var product = variant.getSanPham();
    if (product == null) throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    if (variant.getCoQuanLySerial() == null)
      throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    em.lock(product, LockModeType.PESSIMISTIC_READ);
    em.refresh(product, LockModeType.PESSIMISTIC_READ);
    if (variant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || product.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG)
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_REPLACEMENT_POLICY_INVALID,
          "phien_ban_thay_the_id",
          "REPLACEMENT_VARIANT_UNAVAILABLE");
    return variant;
  }

  public TonKho stock(Long id) {
    var stock = em.find(TonKho.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (stock == null) throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
    em.refresh(stock, LockModeType.PESSIMISTIC_WRITE);
    return stock;
  }

  public SoSerialSanPham serial(Long id) {
    var serial = em.find(SoSerialSanPham.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (serial == null) throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
    em.refresh(serial, LockModeType.PESSIMISTIC_WRITE);
    return serial;
  }

  public List<TheKho> issues(Long ticket) {
    return em.createQuery(
            "SELECT t FROM TheKho t WHERE t.phieuBaoHanh.id=:id AND t.loaiGiaoDich=:kind ORDER BY t.id",
            TheKho.class)
        .setParameter("id", ticket)
        .setParameter("kind", LoaiGiaoDichKho.XUAT_DOI_BAO_HANH)
        .getResultList();
  }

  public record HoldOwner(Long ticketId, Long version, Long serialId, long quantity) {}

  public List<HoldOwner> activeHolds(Long stock) {
    // Chỉ đọc lần cập nhật mới nhất của từng lần giữ; không suy chủ giữ từ tổng tồn kho.
    return jdbc.query(
        """
        SELECT h.phieu_bao_hanh_id,
          CAST(JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.phien_ban_phuong_an')) AS SIGNED) version,
          CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.so_serial_id')),'null') AS SIGNED) serial_id,
          CAST(JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.so_luong')) AS SIGNED) quantity
        FROM lich_su_bao_hanh h
        WHERE JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.ton_kho_id') = ?
          AND JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.dang_giu') = true
          AND NOT EXISTS (SELECT 1 FROM lich_su_bao_hanh n
             WHERE n.phieu_bao_hanh_id=h.phieu_bao_hanh_id AND n.id>h.id
               AND JSON_EXTRACT(n.du_lieu_chi_tiet,'$.giu_cho_hang_doi.phien_ban_phuong_an') =
                   JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.phien_ban_phuong_an'))
        ORDER BY h.id
        """,
        (rs, row) ->
            new HoldOwner(
                rs.getLong("phieu_bao_hanh_id"),
                rs.getLong("version"),
                rs.getObject("serial_id", Long.class),
                rs.getLong("quantity")),
        stock);
  }

  public void flush() {
    em.flush();
  }

  public boolean serialHeldByAnotherPlan(Long serialId, Long ticketId, Long version) {
    return jdbc.queryForObject(
            """
        SELECT COUNT(*) FROM lich_su_bao_hanh h
        WHERE JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.so_serial_id') = ?
          AND JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.dang_giu') = true
          AND NOT (h.phieu_bao_hanh_id = ? AND
            JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.phien_ban_phuong_an') = ?)
          AND NOT EXISTS (SELECT 1 FROM lich_su_bao_hanh n
            WHERE n.phieu_bao_hanh_id=h.phieu_bao_hanh_id AND n.id>h.id
              AND JSON_EXTRACT(n.du_lieu_chi_tiet,'$.giu_cho_hang_doi.phien_ban_phuong_an') =
                  JSON_EXTRACT(h.du_lieu_chi_tiet,'$.giu_cho_hang_doi.phien_ban_phuong_an'))
        """,
            Long.class,
            serialId,
            ticketId,
            version)
        > 0;
  }
}
