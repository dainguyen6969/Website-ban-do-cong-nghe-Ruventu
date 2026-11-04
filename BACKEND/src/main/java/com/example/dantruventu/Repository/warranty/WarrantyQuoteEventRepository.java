package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** The ticket is already locked before locking/updating an invoice. No cash/stock writes. */
@Repository
@RequiredArgsConstructor
public class WarrantyQuoteEventRepository {
  private final EntityManager entityManager;

  public void lockInvoice(HoaDonBaoHanh invoice) {
    entityManager.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
  }

  public void insertInvoice(HoaDonBaoHanh invoice, Long actorId) {
    invoice.setNguoiLap(entityManager.getReference(NguoiDung.class, actorId));
    entityManager.persist(invoice);
    invoice.setMaHoaDon("HDBH-" + invoice.getId());
  }

  public void flush() {
    entityManager.flush();
  }
}
