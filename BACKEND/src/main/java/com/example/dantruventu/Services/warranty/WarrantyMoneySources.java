package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.amount;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WarrantyMoneySources {
  private final WarrantyHistorySupport history;

  public Map<Long, Map<String, Object>> transactions(List<LichSuBaoHanh> events) {
    Map<Long, Map<String, Object>> result = new HashMap<>();
    for (var event : events) {
      var transaction = history.object(history.payload(event).get("giao_dich_tien"));
      if (transaction == null) continue;
      Long id = history.id(transaction.get("phieu_thu_chi_id"));
      if (id == null || result.put(id, transaction) != null) throw invalid();
    }
    return result;
  }

  public record Costs(
      Map<String, BigDecimal> confirmed,
      Map<String, Long> latestIds,
      Map<String, BigDecimal> netPaid,
      Map<Long, Map<String, Object>> transactions,
      BigDecimal total,
      BigDecimal paid,
      BigDecimal refunded) {
    public Map<String, Object> summary() {
      BigDecimal net = paid.subtract(refunded);
      return fields(
          "chi_phi_ncc_xac_nhan",
          total,
          "da_chi",
          paid,
          "da_nhan_hoan",
          refunded,
          "con_phai_chi",
          total.subtract(net).max(BigDecimal.ZERO),
          "con_phai_nhan_hoan",
          net.subtract(total).max(BigDecimal.ZERO));
    }
  }

  public Costs costs(
      PhieuBaoHanh ticket, List<LichSuBaoHanh> events, List<SoQuyThuChi> cash, Long supplier) {
    Map<String, BigDecimal> all = new LinkedHashMap<>(),
        confirmed = new LinkedHashMap<>(),
        net = new HashMap<>();
    Map<String, Long> latest = new HashMap<>();
    for (var event : events) {
      var report = history.object(history.payload(event).get("bao_phi_don_vi"));
      if (report == null || !Boolean.TRUE.equals(report.get("da_xac_nhan"))) continue;
      Long owner = history.id(report.get("nha_cung_cap_id"));
      if (owner == null
          || history.text(report.get("can_cu")) == null
          || history.text(report.get("can_cu")).isBlank()) throw invalid();
      Set<String> seen = new HashSet<>();
      for (Object raw : history.array(report.get("hang_muc"))) {
        var item = history.object(raw);
        String code = item == null ? null : history.text(item.get("ma_hang_muc"));
        if (code == null || !seen.add(code)) throw invalid();
        BigDecimal value = amount(item.get("chi_phi"));
        all.put(owner + ":" + code, value);
        if (owner.equals(supplier)) {
          confirmed.put(code, value);
          latest.put(code, event.getId());
        }
      }
    }
    BigDecimal totalAll = all.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    if (ticket.getChiPhiNccXacNhan() == null
        || ticket.getChiPhiNccXacNhan().compareTo(totalAll) != 0) throw invalid();
    var records = transactions(events);
    BigDecimal paid = BigDecimal.ZERO, refunded = BigDecimal.ZERO;
    Set<Long> seen = new HashSet<>();
    for (var voucher : cash) {
      if (voucher.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN
          || voucher.getHoaDonBaoHanh() != null
          || voucher.getNhaCungCap() == null
          || !supplier.equals(voucher.getNhaCungCap().getId())
          || WarrantyFinanceCalculator.isSupplierSettlement(voucher)) continue;
      WarrantyFinanceCalculator.validateMoney(voucher);
      if (!seen.add(voucher.getId())
          || voucher.getPhieuBaoHanh() == null
          || !ticket.getId().equals(voucher.getPhieuBaoHanh().getId())) throw invalid();
      var record = records.get(voucher.getId());
      boolean spend = voucher.getLoaiPhieu() == LoaiPhieuThuChi.CHI;
      if (record == null
          || !Objects.equals(history.id(record.get("nha_cung_cap_id")), supplier)
          || !(spend ? "CHI_DON_VI" : "THU_HOAN_DON_VI").equals(record.get("loai")))
        throw invalid();
      var allocation = allocation(record);
      BigDecimal sum = allocation.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
      if (sum.compareTo(voucher.getSoTien()) != 0) throw invalid();
      allocation.forEach(
          (code, value) -> net.merge(code, spend ? value : value.negate(), BigDecimal::add));
      if (spend) paid = paid.add(voucher.getSoTien());
      else refunded = refunded.add(voucher.getSoTien());
    }
    if (refunded.compareTo(paid) > 0 || net.values().stream().anyMatch(v -> v.signum() < 0))
      throw invalid();
    return new Costs(
        confirmed,
        latest,
        net,
        records,
        confirmed.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add),
        paid,
        refunded);
  }

  public Map<String, BigDecimal> payable(
      Costs costs, List<LichSuBaoHanh> events, Long source, Long supplier) {
    var report = costSource(events, source, supplier);
    Map<String, BigDecimal> capacity = new LinkedHashMap<>();
    for (Object raw : history.array(report.get("hang_muc"))) {
      var item = history.object(raw);
      String code = history.text(item.get("ma_hang_muc"));
      if (!source.equals(costs.latestIds().get(code))) throw stale();
      capacity.put(
          code,
          costs
              .confirmed()
              .get(code)
              .subtract(costs.netPaid().getOrDefault(code, BigDecimal.ZERO))
              .max(BigDecimal.ZERO));
    }
    return capacity;
  }

  public Map<String, Object> costSource(List<LichSuBaoHanh> events, Long source, Long supplier) {
    var report = history.object(source(events, source, "chi_phi_lich_su_id").get("bao_phi_don_vi"));
    if (report == null
        || !Boolean.TRUE.equals(report.get("da_xac_nhan"))
        || !supplier.equals(history.id(report.get("nha_cung_cap_id")))) throw stale();
    return report;
  }

  public SoQuyThuChi originalPayment(
      List<SoQuyThuChi> cash, Long payment, Long supplier, Long ticket) {
    var original =
        cash.stream()
            .filter(v -> payment.equals(v.getId()))
            .findFirst()
            .orElseThrow(() -> notFound("giao_dich_chi_goc_id"));
    if (original.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN
        || original.getLoaiPhieu() != LoaiPhieuThuChi.CHI
        || original.getHoaDonBaoHanh() != null
        || original.getNhaCungCap() == null
        || !supplier.equals(original.getNhaCungCap().getId())
        || original.getPhieuBaoHanh() == null
        || !ticket.equals(original.getPhieuBaoHanh().getId())) throw stale();
    return original;
  }

  public Map<String, BigDecimal> recoverable(
      Costs costs, List<SoQuyThuChi> cash, Long payment, Long supplier, Long ticket) {
    originalPayment(cash, payment, supplier, ticket);
    var record = costs.transactions().get(payment);
    if (record == null || !"CHI_DON_VI".equals(record.get("loai"))) throw stale();
    var capacity = new LinkedHashMap<>(allocation(record));
    for (var voucher : cash) {
      if (voucher.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN) continue;
      var refund = costs.transactions().get(voucher.getId());
      if (refund == null || !"THU_HOAN_DON_VI".equals(refund.get("loai"))) continue;
      var links = history.object(refund.get("lien_ket_nguon"));
      if (links != null && payment.equals(history.id(links.get("giao_dich_chi_goc_id"))))
        allocation(refund)
            .forEach((code, value) -> capacity.merge(code, value.negate(), BigDecimal::add));
    }
    capacity.replaceAll(
        (code, value) ->
            value.min(
                costs
                    .netPaid()
                    .getOrDefault(code, BigDecimal.ZERO)
                    .subtract(costs.confirmed().getOrDefault(code, BigDecimal.ZERO))
                    .max(BigDecimal.ZERO)));
    if (capacity.values().stream().anyMatch(v -> v.signum() < 0)) throw invalid();
    return capacity;
  }

  private Map<String, BigDecimal> allocation(Map<String, Object> record) {
    Map<String, BigDecimal> result = new LinkedHashMap<>();
    for (Object raw : history.array(record.get("phan_bo_chi_phi"))) {
      var item = history.object(raw);
      String code = history.text(item.get("ma_hang_muc"));
      BigDecimal value = amount(item.get("so_tien"));
      if (code == null || value.signum() <= 0 || result.put(code, value) != null) throw invalid();
    }
    if (result.isEmpty()) throw invalid();
    return result;
  }

  public List<Map<String, Object>> distribute(Map<String, BigDecimal> capacity, BigDecimal amount) {
    if (amount.compareTo(capacity.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add)) > 0)
      throw exceeds();
    List<Map<String, Object>> result = new ArrayList<>();
    BigDecimal remaining = amount;
    for (var entry : capacity.entrySet()) {
      BigDecimal value = remaining.min(entry.getValue());
      if (value.signum() > 0) {
        result.add(fields("ma_hang_muc", entry.getKey(), "so_tien", value));
        remaining = remaining.subtract(value);
      }
    }
    return result;
  }

  public Map<String, Object> settlement(
      List<LichSuBaoHanh> events, List<SoQuyThuChi> cash, Long source, Long supplier) {
    var snapshots = new WarrantySupplierSettlementSnapshots(history);
    var current = snapshots.load(events).get(source);
    if (current != null) {
      if (!supplier.equals(history.id(current.get("nha_cung_cap_id")))
          || amount(current.get("so_tien_nghia_vu")).signum() <= 0
          || amount(current.get("so_tien_con_doi_soat")).signum() <= 0
          || WarrantySupplierSettlementSnapshots.quantity(current.get("so_luong_huy_do_hoan_xuat"))
              > 0) throw stale();
      snapshots.reconcileMoney(current, events, cash);
      return current;
    }
    var initial =
        history.object(source(events, source, "nghia_vu_lich_su_id").get("doi_soat_nha_cung_cap"));
    if (initial == null
        || !Boolean.TRUE.equals(initial.get("da_xac_nhan"))
        || !supplier.equals(history.id(initial.get("nha_cung_cap_id")))
        || (initial.get("nghia_vu_lich_su_id") != null
            && !source.equals(history.id(initial.get("nghia_vu_lich_su_id"))))) throw stale();
    Map<String, Object> latest = initial;
    for (var event : events) {
      var update = history.object(history.payload(event).get("doi_soat_nha_cung_cap"));
      if (update != null && source.equals(history.id(update.get("nghia_vu_lich_su_id"))))
        latest = update;
    }
    BigDecimal total = amount(initial.get("so_tien_nghia_vu"));
    if (total.signum() <= 0
        || !Boolean.TRUE.equals(latest.get("da_xac_nhan"))
        || !supplier.equals(history.id(latest.get("nha_cung_cap_id")))
        || total.compareTo(amount(latest.get("so_tien_nghia_vu"))) != 0) throw stale();
    long required = quantity(latest.get("so_luong_can_bu")),
        supplied = quantity(latest.get("so_luong_da_bu")),
        left = quantity(latest.get("so_luong_con_bu"));
    if (required - supplied != left) throw invalid();
    BigDecimal received = BigDecimal.ZERO;
    var records = transactions(events);
    Set<Long> seen = new HashSet<>();
    for (var voucher : cash) {
      if (voucher.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN
          || !WarrantyFinanceCalculator.isSupplierSettlement(voucher)) continue;
      var record = records.get(voucher.getId());
      if (record == null) throw invalid();
      var links = history.object(record.get("lien_ket_nguon"));
      if (links != null && source.equals(history.id(links.get("nghia_vu_lich_su_id")))) {
        WarrantyFinanceCalculator.validateMoney(voucher);
        if (!seen.add(voucher.getId())
            || !"THU_DOI_SOAT_DON_VI".equals(record.get("loai"))
            || !supplier.equals(history.id(record.get("nha_cung_cap_id")))
            || voucher.getLoaiPhieu() != LoaiPhieuThuChi.THU
            || voucher.getHoaDonBaoHanh() != null
            || voucher.getNhaCungCap() == null
            || !supplier.equals(voucher.getNhaCungCap().getId())) throw invalid();
        received = received.add(voucher.getSoTien());
      }
    }
    if (received.compareTo(total) > 0
        || received.compareTo(amount(latest.get("so_tien_da_nhan"))) != 0
        || total.subtract(received).compareTo(amount(latest.get("so_tien_con_doi_soat"))) != 0)
      throw invalid();
    return fields(
        "nghia_vu_lich_su_id",
        source,
        "nha_cung_cap_id",
        supplier,
        "da_xac_nhan",
        true,
        "so_luong_can_bu",
        required,
        "so_luong_da_bu",
        supplied,
        "so_luong_con_bu",
        left,
        "so_tien_nghia_vu",
        total,
        "so_tien_da_nhan",
        received,
        "so_tien_con_doi_soat",
        total.subtract(received),
        "da_giai_quyet",
        left == 0 && received.compareTo(total) == 0);
  }

  private long quantity(Object raw) {
    try {
      if (!(raw instanceof Number)) throw invalid();
      long v = new BigDecimal(raw.toString()).longValueExact();
      if (v < 0) throw invalid();
      return v;
    } catch (ArithmeticException e) {
      throw invalid();
    }
  }

  private Map<String, Object> source(List<LichSuBaoHanh> events, Long id, String field) {
    return history.payload(
        events.stream()
            .filter(e -> id.equals(e.getId()))
            .findFirst()
            .orElseThrow(() -> notFound(field)));
  }

  private static WarrantyReadException notFound(String field) {
    return WarrantyReadException.notFound(ErrorCode.NOT_FOUND, field, "MONEY_SOURCE_NOT_FOUND");
  }

  static WarrantyReadException stale() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_MONEY_SOURCE_INVALID, "loai", "MONEY_SOURCE_INVALID");
  }

  static WarrantyReadException exceeds() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_MONEY_EXCEEDS_OUTSTANDING, "so_tien", "MONEY_EXCEEDS_OUTSTANDING");
  }

  private static AppException invalid() {
    return new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
  }
}
