package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.LichSuBaoHanh;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuBaoHanh;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.WarrantyReadException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WarrantyWorkflowRepository {
  private final EntityManager entityManager;
  private final JdbcTemplate jdbc;

  public record TicketOrigin(Long orderId, Long lineId) {}

  public TicketOrigin ticketOrigin(Long id) {
    var rows =
        jdbc.query(
            """
        SELECT w.don_hang_id, t.chi_tiet_don_hang_id FROM phieu_bao_hanh w
        JOIN thiet_bi_bao_hanh t ON t.id = w.thiet_bi_id WHERE w.id = ?
        """,
            (rs, row) -> new TicketOrigin(rs.getLong(1), rs.getLong(2)),
            id);
    if (rows.isEmpty())
      throw WarrantyReadException.notFound(
          ErrorCode.WARRANTY_NOT_FOUND, "path.id", "WARRANTY_NOT_FOUND");
    return rows.getFirst();
  }

  public void requireOrder(Long id) {
    if (jdbc.queryForObject("SELECT COUNT(*) FROM don_hang WHERE id = ?", Long.class, id) == 0)
      throw WarrantyReadException.notFound(ErrorCode.NOT_FOUND, "don_hang_id", "ORDER_NOT_FOUND");
  }

  public boolean deviceExists(Long id) {
    return jdbc.queryForObject(
            "SELECT COUNT(*) FROM thiet_bi_bao_hanh WHERE id = ?", Long.class, id)
        > 0;
  }

  public Long serialId(String text) {
    if (text == null) return null;
    List<Long> ids =
        jdbc.queryForList(
            "SELECT id FROM so_serial_san_pham WHERE so_serial = ?", Long.class, text);
    return ids.isEmpty() ? null : ids.getFirst();
  }

  public boolean hasOpenCustody(Long deviceId, Long serialId, Long ambiguousLineId) {
    if (deviceId == null && serialId == null && ambiguousLineId == null) return false;
    return jdbc.queryForObject(
            """
        SELECT COUNT(*) FROM phieu_bao_hanh w
        LEFT JOIN thiet_bi_bao_hanh original ON original.id = w.thiet_bi_id
        LEFT JOIN thiet_bi_bao_hanh replacement ON replacement.id = w.thiet_bi_thay_the_id
        WHERE w.trang_thai_xu_ly <> 'HOAN_TAT'
          AND (w.thiet_bi_id = ? OR w.thiet_bi_thay_the_id = ?
            OR w.so_serial_id = ? OR original.so_serial_id = ? OR replacement.so_serial_id = ?
            OR original.chi_tiet_don_hang_id = ?)
        """,
            Long.class,
            deviceId,
            deviceId,
            serialId,
            serialId,
            serialId,
            ambiguousLineId)
        > 0;
  }

  public PhieuBaoHanh lockTicket(Long id) {
    PhieuBaoHanh ticket =
        entityManager.find(PhieuBaoHanh.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (ticket == null)
      throw WarrantyReadException.notFound(
          ErrorCode.WARRANTY_NOT_FOUND, "path.id", "WARRANTY_NOT_FOUND");
    entityManager.refresh(ticket, LockModeType.PESSIMISTIC_WRITE);
    return ticket;
  }

  public LichSuBaoHanh append(
      PhieuBaoHanh ticket, Long actorId, String type, String description, String json) {
    var event =
        LichSuBaoHanh.builder()
            .phieuBaoHanh(ticket)
            .nguoiThucHien(entityManager.getReference(NguoiDung.class, actorId))
            .loaiSuKien(type)
            .noiDung(description)
            .duLieuChiTiet(json)
            .build();
    entityManager.persist(event);
    entityManager.flush();
    return event;
  }
}
