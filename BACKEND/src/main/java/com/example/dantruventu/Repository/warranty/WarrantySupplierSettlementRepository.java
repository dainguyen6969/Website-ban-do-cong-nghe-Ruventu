package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WarrantySupplierSettlementRepository {
  private final EntityManager em;

  @Value("${ruventu.inventory.default-warehouse-id:1}")
  private Long warehouseId;

  public TheKho issue(Long id) {
    var value = em.find(TheKho.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (value == null)
      throw WarrantyReadException.notFound(
          ErrorCode.NOT_FOUND, "giao_dich_xuat_the_kho_id", "REPLACEMENT_ISSUE_NOT_FOUND");
    em.refresh(value, LockModeType.PESSIMISTIC_WRITE);
    return value;
  }

  public void lockSerialRegistry() {
    // Cùng khóa kho cho nhận serial mới và lưu vật chờ xác minh để tránh nhận trùng đồng thời.
    var warehouse = em.find(KhoHang.class, warehouseId, LockModeType.PESSIMISTIC_WRITE);
    if (warehouse == null || warehouse.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG)
      throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
  }

  public boolean pendingSerial(String serial) {
    return ((Number)
                em.createNativeQuery(
                        """
      SELECT COUNT(*) FROM lich_su_bao_hanh h,
      JSON_TABLE(h.du_lieu_chi_tiet,'$.hang_bu_thuc_nhan.serials[*]'
        COLUMNS(code VARCHAR(100) PATH '$')) j
      WHERE LOWER(TRIM(j.code))=LOWER(:code)
        AND JSON_EXTRACT(h.du_lieu_chi_tiet,'$.hang_bu_thuc_nhan.cho_xac_minh')=true
      """)
                    .setParameter("code", serial)
                    .getSingleResult())
            .longValue()
        > 0;
  }

  public TheKho receipt(PhieuBaoHanh ticket, TonKho stock, int quantity, LocalDateTime at) {
    var card =
        TheKho.builder()
            .khoHang(stock.getKhoHang())
            .phienBan(stock.getPhienBan())
            .loaiGiaoDich(LoaiGiaoDichKho.NHAP_BU_BAO_HANH)
            .maChungTuGoc(ticket.getId())
            .phieuBaoHanh(ticket)
            .soLuongThayDoi(quantity)
            .tonCuoi(stock.getTonThucTe())
            .ghiChu("Nhập hàng bù bảo hành đã xác minh")
            .ngayTao(at)
            .build();
    em.persist(card);
    em.flush();
    return card;
  }

  public void flush() {
    em.flush();
  }
}
