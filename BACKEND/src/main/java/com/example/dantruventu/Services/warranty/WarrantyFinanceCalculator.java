package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyDetailResponse.Invoice;
import com.example.dantruventu.Entity.HoaDonBaoHanh;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.util.List;

/** Matches the invoice-scoped financial rules of WarrantyListRepository. */
public final class WarrantyFinanceCalculator {
  private WarrantyFinanceCalculator() {}

  public static Invoice invoice(HoaDonBaoHanh invoice, List<SoQuyThuChi> vouchers) {
    if (invoice.getId() == null
        || invoice.getPhieuBaoHanh() == null
        || invoice.getPhieuBaoHanh().getId() == null
        || invoice.getPhienBanBaoGia() == null
        || invoice.getPhienBanBaoGia() <= 0
        || invoice.getTongTien() == null
        || invoice.getTongTien().signum() < 0
        || invoice.getTrangThai() == null) throw invalid();
    BigDecimal received = BigDecimal.ZERO;
    BigDecimal refunded = BigDecimal.ZERO;
    for (SoQuyThuChi cash : vouchers) {
      if (cash.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN) continue;
      if (cash.getHoaDonBaoHanh() == null
          || !invoice.getId().equals(cash.getHoaDonBaoHanh().getId())) continue;
      validateMoney(cash);
      if (cash.getPhieuBaoHanh() != null
          && !invoice.getPhieuBaoHanh().getId().equals(cash.getPhieuBaoHanh().getId()))
        throw invalid();
      if (cash.getLoaiPhieu() == LoaiPhieuThuChi.THU) received = received.add(cash.getSoTien());
      else refunded = refunded.add(cash.getSoTien());
    }
    if (refunded.compareTo(received) > 0) throw invalid();
    boolean active = invoice.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC;
    BigDecimal effectiveDue = active ? invoice.getTongTien() : BigDecimal.ZERO;
    BigDecimal netReceived = received.subtract(refunded);
    BigDecimal requiredRefund = received.subtract(effectiveDue).max(BigDecimal.ZERO);
    BigDecimal remainingRefund = requiredRefund.subtract(refunded).max(BigDecimal.ZERO);
    TrangThaiThanhToanBaoHanh payment =
        !active
            ? null
            : netReceived.compareTo(effectiveDue) >= 0
                ? TrangThaiThanhToanBaoHanh.DA_THANH_TOAN
                : netReceived.signum() > 0
                    ? TrangThaiThanhToanBaoHanh.THANH_TOAN_MOT_PHAN
                    : TrangThaiThanhToanBaoHanh.CHUA_THANH_TOAN;
    TrangThaiHoanTienBaoHanh refund =
        requiredRefund.signum() == 0
            ? TrangThaiHoanTienBaoHanh.KHONG_CAN_HOAN
            : remainingRefund.signum() == 0
                ? TrangThaiHoanTienBaoHanh.DA_HOAN
                : refunded.signum() > 0
                    ? TrangThaiHoanTienBaoHanh.HOAN_MOT_PHAN
                    : TrangThaiHoanTienBaoHanh.CHO_HOAN;
    return new Invoice(
        invoice.getId(),
        invoice.getMaHoaDon(),
        invoice.getTrangThai(),
        invoice.getPhienBanBaoGia(),
        invoice.getTongTien(),
        effectiveDue,
        received,
        refunded,
        effectiveDue.subtract(netReceived).max(BigDecimal.ZERO),
        requiredRefund,
        remainingRefund,
        payment,
        refund);
  }

  public static void validateMoney(SoQuyThuChi cash) {
    if (cash.getId() == null
        || cash.getSoTien() == null
        || cash.getSoTien().signum() <= 0
        || cash.getLoaiPhieu() == null) throw invalid();
  }

  public static boolean isSupplierSettlement(SoQuyThuChi cash) {
    return cash.getLoaiThuChi() != null
        && "THU_DOI_SOAT_BAO_HANH".equals(cash.getLoaiThuChi().getMaLoai());
  }

  private static AppException invalid() {
    return new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
  }
}
