package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.ChiTietPhiBaoHanh;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** Inserts immutable version lines. No update/delete or invoice/cash/stock write is exposed. */
@Repository
@RequiredArgsConstructor
public class WarrantyQuoteRepository {
  private final EntityManager entityManager;

  public void insert(ChiTietPhiBaoHanh fee) {
    entityManager.persist(fee);
  }

  public void flush() {
    entityManager.flush();
  }
}
