package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import jakarta.persistence.EntityManager;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WarrantyHandoverRepository {
  private final EntityManager em;

  public boolean usedByAnotherOpenTicket(Long ticket, List<Long> devices) {
    return em.createQuery(
                "SELECT COUNT(w) FROM PhieuBaoHanh w LEFT JOIN w.thietBiThayThe replacement WHERE w.id<>:ticket AND w.trangThaiXuLy<>:done AND (w.thietBi.id IN :devices OR replacement.id IN :devices)",
                Long.class)
            .setParameter("ticket", ticket)
            .setParameter("done", TrangThaiBaoHanh.HOAN_TAT)
            .setParameter("devices", devices)
            .getSingleResult()
        > 0;
  }

  public void flush() {
    em.flush();
  }
}
