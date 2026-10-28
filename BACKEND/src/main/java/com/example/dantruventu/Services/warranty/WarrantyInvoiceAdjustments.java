package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.amount;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Error.*;
import java.math.BigDecimal;
import java.util.*;

/** Approved quote remains immutable. Only audited, authorized reductions change its invoice. */
final class WarrantyInvoiceAdjustments {
  private WarrantyInvoiceAdjustments() {}

  static void validate(
      HoaDonBaoHanh invoice,
      Map<String, Object> quote,
      List<LichSuBaoHanh> events,
      WarrantyHistorySupport history) {
    if (invoice.getId() == null
        || invoice.getPhienBanBaoGia() == null
        || quote == null
        || !"DONG_Y".equals(quote.get("trang_thai"))) throw invalid();
    BigDecimal expected = amount(quote.get("tong_tien_khach"));
    for (var event : events) {
      var adjustment = history.object(history.payload(event).get("dieu_chinh_hoa_don"));
      if (adjustment == null || !"DUYET_MIEN_GIAM".equals(adjustment.get("hanh_dong"))) continue;
      var after = history.object(adjustment.get("hoa_don_sau"));
      if (after == null
          || !invoice.getId().equals(history.id(after.get("id")))
          || !Objects.equals(
              invoice.getPhienBanBaoGia().longValue(), history.id(after.get("phien_ban_bao_gia"))))
        continue;
      var before = history.object(adjustment.get("hoa_don_truoc"));
      var approval = history.object(adjustment.get("phe_duyet_mien_giam"));
      if (before == null
          || approval == null
          || event.getNguoiThucHien() == null
          || !event
              .getNguoiThucHien()
              .getId()
              .equals(history.id(approval.get("nguoi_phe_duyet_id")))
          || !invoice.getId().equals(history.id(before.get("id")))
          || !Objects.equals(
              history.id(before.get("phien_ban_bao_gia")), invoice.getPhienBanBaoGia().longValue())
          || !"HIEU_LUC".equals(before.get("trang_thai"))
          || !"HIEU_LUC".equals(after.get("trang_thai"))
          || amount(before.get("tong_tien")).compareTo(expected) != 0
          || amount(approval.get("so_tien")).signum() <= 0) throw invalid();
      expected = expected.subtract(amount(approval.get("so_tien")));
      if (expected.signum() < 0 || amount(after.get("tong_tien")).compareTo(expected) != 0)
        throw invalid();
    }
    if (invoice.getTongTien() == null || invoice.getTongTien().compareTo(expected) != 0)
      throw invalid();
  }

  private static AppException invalid() {
    return new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
  }
}
