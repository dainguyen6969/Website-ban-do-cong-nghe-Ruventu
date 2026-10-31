package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.amount;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;

/** Đọc từng nghĩa vụ độc lập; tiền thực thu luôn đối chiếu lại với sổ quỹ. */
@RequiredArgsConstructor
public class WarrantySupplierSettlementSnapshots {
  private final WarrantyHistorySupport history;

  public Map<Long, Map<String, Object>> load(List<LichSuBaoHanh> events) {
    var result = new LinkedHashMap<Long, Map<String, Object>>();
    for (var event : events) {
      var value = history.object(history.payload(event).get("doi_soat_nha_cung_cap"));
      if (value == null || !Long.valueOf(1).equals(history.id(value.get("phien_ban_du_lieu"))))
        continue;
      Long id = history.id(value.get("nghia_vu_lich_su_id"));
      if (id == null) throw invalid();
      var previous = result.get(id);
      if (previous == null && !id.equals(event.getId())) throw invalid();
      if (previous != null) {
        for (String key :
            List.of(
                "nha_cung_cap_id",
                "giao_dich_xuat_the_kho_id",
                "phien_ban_phuong_an",
                "phien_ban_id",
                "thiet_bi_cu_id",
                "so_luong_can_bu",
                "loai_nghia_vu"))
          if (!Objects.equals(previous.get(key), value.get(key))) throw invalid();
        for (String key :
            List.of(
                "so_luong_da_bu",
                "so_luong_quy_doi_sang_tien",
                "so_luong_ket_thuc_theo_quyet_dinh",
                "so_luong_huy_do_hoan_xuat"))
          if (quantity(value.get(key)) < quantity(previous.get(key))) throw invalid();
        if (amount(value.get("so_tien_nghia_vu"))
                .compareTo(amount(previous.get("so_tien_nghia_vu")))
            < 0) throw invalid();
      }
      validate(value);
      result.put(id, new LinkedHashMap<>(value));
    }
    return result;
  }

  public Map<String, Object> require(List<LichSuBaoHanh> events, Long id) {
    var value = load(events).get(id);
    if (value == null)
      throw WarrantyReadException.notFound(
          ErrorCode.NOT_FOUND, "nghia_vu_lich_su_id", "SUPPLIER_SETTLEMENT_NOT_FOUND");
    return value;
  }

  public void reconcileMoney(
      Map<String, Object> value, List<LichSuBaoHanh> events, List<SoQuyThuChi> cash) {
    Long id = history.id(value.get("nghia_vu_lich_su_id"));
    Long supplier = history.id(value.get("nha_cung_cap_id"));
    Map<Long, Map<String, Object>> records = new HashMap<>();
    for (var event : events) {
      var record = history.object(history.payload(event).get("giao_dich_tien"));
      if (record == null || !"THU_DOI_SOAT_DON_VI".equals(record.get("loai"))) continue;
      var link = history.object(record.get("lien_ket_nguon"));
      if (link == null || !id.equals(history.id(link.get("nghia_vu_lich_su_id")))) continue;
      Long voucher = history.id(record.get("phieu_thu_chi_id"));
      if (voucher == null
          || !supplier.equals(history.id(record.get("nha_cung_cap_id")))
          || records.put(voucher, record) != null) throw invalid();
    }
    BigDecimal received = BigDecimal.ZERO;
    Set<Long> seen = new HashSet<>();
    Long ticketId =
        events.stream()
            .filter(e -> id.equals(e.getId()))
            .map(e -> e.getPhieuBaoHanh().getId())
            .findFirst()
            .orElseThrow(WarrantySupplierSettlementSnapshots::invalid);
    for (var voucher : cash) {
      if (!records.containsKey(voucher.getId())) continue;
      if (voucher.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN
          || voucher.getLoaiPhieu() != LoaiPhieuThuChi.THU
          || !WarrantyFinanceCalculator.isSupplierSettlement(voucher)
          || voucher.getHoaDonBaoHanh() != null
          || voucher.getNhaCungCap() == null
          || !supplier.equals(voucher.getNhaCungCap().getId())
          || !seen.add(voucher.getId())
          || voucher.getPhieuBaoHanh() == null
          || !ticketId.equals(voucher.getPhieuBaoHanh().getId())
          || amount(records.get(voucher.getId()).get("so_tien")).compareTo(voucher.getSoTien())
              != 0) throw invalid();
      received = received.add(voucher.getSoTien());
    }
    if (seen.size() != records.size()
        || received.compareTo(amount(value.get("so_tien_da_nhan"))) != 0
        || received.compareTo(amount(value.get("so_tien_nghia_vu"))) > 0) throw invalid();
    refresh(value);
  }

  public static void refresh(Map<String, Object> value) {
    long left =
        quantity(value.get("so_luong_can_bu"))
            - quantity(value.get("so_luong_da_bu"))
            - quantity(value.get("so_luong_quy_doi_sang_tien"))
            - quantity(value.get("so_luong_ket_thuc_theo_quyet_dinh"))
            - quantity(value.get("so_luong_huy_do_hoan_xuat"));
    if (left < 0) throw invalid();
    BigDecimal money =
        amount(value.get("so_tien_nghia_vu")).subtract(amount(value.get("so_tien_da_nhan")));
    if (money.signum() < 0) throw invalid();
    value.put("so_luong_con_bu", left);
    value.put("so_tien_con_doi_soat", money);
    value.put(
        "da_giai_quyet",
        left == 0
            && money.signum() == 0
            && Boolean.FALSE.equals(value.get("nghia_vu_gui_thiet_bi_cu_con_mo")));
  }

  public static void validate(Map<String, Object> value) {
    long left = quantity(value.get("so_luong_con_bu"));
    BigDecimal money = amount(value.get("so_tien_con_doi_soat"));
    Object resolved = value.get("da_giai_quyet");
    if (!(value.get("nghia_vu_gui_thiet_bi_cu_con_mo") instanceof Boolean)
        || !Boolean.TRUE.equals(value.get("da_xac_nhan"))) throw invalid();
    var copy = new LinkedHashMap<>(value);
    refresh(copy);
    if (left != quantity(copy.get("so_luong_con_bu"))
        || money.compareTo(amount(copy.get("so_tien_con_doi_soat"))) != 0
        || !Objects.equals(resolved, copy.get("da_giai_quyet"))) throw invalid();
  }

  public static long quantity(Object value) {
    if (value == null) return 0;
    try {
      if (!(value instanceof Number)) throw invalid();
      long result = new BigDecimal(value.toString()).longValueExact();
      if (result < 0) throw invalid();
      return result;
    } catch (ArithmeticException e) {
      throw invalid();
    }
  }

  static AppException invalid() {
    return new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
  }
}
