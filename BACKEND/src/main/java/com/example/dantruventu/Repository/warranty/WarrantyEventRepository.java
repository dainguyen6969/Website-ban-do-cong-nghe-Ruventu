package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.NhaCungCap;
import com.example.dantruventu.Entity.PhieuBaoHanh;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WarrantyEventRepository {
  private final EntityManager em;
  private final JdbcTemplate jdbc;

  public NhaCungCap supplier(Long id, boolean activeRequired) {
    NhaCungCap supplier = em.find(NhaCungCap.class, id, LockModeType.PESSIMISTIC_READ);
    if (supplier == null)
      throw WarrantyReadException.notFound(
          ErrorCode.NOT_FOUND, "nha_cung_cap_id", "SUPPLIER_NOT_FOUND");
    if (activeRequired && supplier.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG)
      throw new AppException(
          ErrorCode.WARRANTY_EVENT_TRANSITION_INVALID, "Đơn vị xử lý đã ngừng hoạt động.");
    return supplier;
  }

  public void finish(PhieuBaoHanh ticket, LocalDateTime businessTime) {
    em.flush();
    // @UpdateTimestamp is audit-clock based; this endpoint explicitly records the event time.
    jdbc.update(
        "UPDATE phieu_bao_hanh SET ngay_cap_nhat = ? WHERE id = ?",
        Timestamp.valueOf(businessTime),
        ticket.getId());
    em.refresh(ticket);
  }
}
