package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WarrantyMoneyRepository {
  private final EntityManager em;
  private final LoaiThuChiRepository types;

  public void lockReferenceRegistry(String requestedType) {
    // Khóa cấu hình chung để hai yêu cầu bảo hành khác phiếu vẫn không ghi trùng chứng từ.
    requireType("THU_BAO_HANH", LoaiPhieuThuChi.THU);
    requireType(
        requestedType,
        requestedType.startsWith("CHI_") ? LoaiPhieuThuChi.CHI : LoaiPhieuThuChi.THU);
  }

  private void requireType(String code, LoaiPhieuThuChi kind) {
    var type =
        types
            .findByMaLoaiForUpdate(code)
            .orElseThrow(() -> new AppException(ErrorCode.WARRANTY_MONEY_CONFIGURATION));
    if (type.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG || type.getLoaiPhieu() != kind)
      throw new AppException(ErrorCode.WARRANTY_MONEY_CONFIGURATION);
  }

  public boolean referenceExists(String reference) {
    return em.createQuery(
                "SELECT COUNT(v) FROM SoQuyThuChi v WHERE LOWER(TRIM(v.maChungTuThamChieu)) = LOWER(:reference)",
                Long.class)
            .setParameter("reference", reference)
            .getSingleResult()
        > 0;
  }

  public void lockInvoice(HoaDonBaoHanh invoice) {
    em.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
  }

  public NguoiDung actor(Long id) {
    return em.getReference(NguoiDung.class, id);
  }

  public void flush() {
    em.flush();
  }
}
