package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.WarrantyDetailRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Fail closed on missing quote/consent/scope/deposit evidence. This helper never writes money. */
@Component
@RequiredArgsConstructor
public class WarrantyEventWorkAuthorization {
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;

  public Map<String, Object> paid(
      PhieuBaoHanh ticket,
      List<LichSuBaoHanh> events,
      int version,
      List<Long> ids,
      OffsetDateTime at,
      boolean starting) {
    if (!Objects.equals(ticket.getPhienBanBaoGia(), version)
        || ticket.getTrangThaiBaoGia() != TrangThaiBaoGiaBaoHanh.DONG_Y) throw denied();
    Map<String, Object> quote = null;
    for (var event : events) {
      var q = history.object(history.payload(event).get("bao_gia"));
      if (q == null) continue;
      Long v = history.id(q.get("phien_ban"));
      if (v == null) throw invalidHistory();
      if (v != version) {
        if (Objects.equals(history.id(q.get("thay_the_phien_ban")), (long) version)) throw denied();
        continue;
      }
      var merged = quote == null ? new LinkedHashMap<String, Object>() : new LinkedHashMap<>(quote);
      var oldDecision = history.object(merged.get("quyet_dinh"));
      var decision = history.object(q.get("quyet_dinh"));
      if (oldDecision != null && decision != null && !oldDecision.equals(decision))
        throw invalidHistory();
      if (oldDecision != null)
        for (String immutable : List.of("hang_muc", "tong_tien_khach", "dieu_kien_dat_coc")) {
          if (q.containsKey(immutable) && !Objects.equals(merged.get(immutable), q.get(immutable)))
            throw denied();
        }
      merged.putAll(q);
      if (oldDecision != null && decision == null) merged.put("quyet_dinh", oldDecision);
      quote = merged;
    }
    if (quote == null
        || !"DONG_Y".equals(quote.get("trang_thai"))
        || Boolean.TRUE.equals(quote.get("da_huy"))) throw denied();
    var decision = history.object(quote.get("quyet_dinh"));
    OffsetDateTime accepted = decision == null ? null : history.time(decision.get("thoi_diem"));
    OffsetDateTime deadline = history.time(quote.get("han_phan_hoi"));
    if (decision == null
        || !"DONG_Y".equals(decision.get("quyet_dinh"))
        || accepted == null
        || accepted.isAfter(at)
        || history.text(decision.get("kenh")) == null
        || history.array(decision.get("bang_chung_urls")).isEmpty()
        || deadline != null && accepted.isAfter(deadline)) throw denied();
    // A response deadline does NOT expire an already accepted quote merely because now is later.
    Map<Long, Map<String, Object>> scope = new LinkedHashMap<>();
    for (Object raw : history.array(quote.get("hang_muc"))) {
      var item = history.object(raw);
      Long id = item == null ? null : history.id(item.get("id"));
      if (id == null || scope.put(id, item) != null) throw invalidHistory();
    }
    Map<Long, ChiTietPhiBaoHanh> fees = new LinkedHashMap<>();
    BigDecimal total = BigDecimal.ZERO;
    for (var fee : details.findFees(ticket.getId())) {
      if (!Objects.equals(fee.getPhienBanBaoGia(), version)) continue;
      if (fee.getPhieuBaoHanh() == null
          || !ticket.getId().equals(fee.getPhieuBaoHanh().getId())
          || fee.getId() == null
          || fee.getSoLuong() == null
          || fee.getSoLuong() <= 0
          || fee.getDonGiaKhach() == null
          || fee.getDonGiaKhach().signum() < 0
          || fee.getThanhTienKhach() == null
          || fee.getThanhTienKhach()
                  .compareTo(fee.getDonGiaKhach().multiply(BigDecimal.valueOf(fee.getSoLuong())))
              != 0) throw invalidHistory();
      fees.put(fee.getId(), fee);
      total = total.add(fee.getThanhTienKhach());
      var saved = scope.get(fee.getId());
      if (saved == null
          || !Objects.equals(history.text(saved.get("noi_dung")), fee.getNoiDung())
          || !Objects.equals(history.id(saved.get("so_luong")), fee.getSoLuong().longValue())
          || !equalMoney(saved.get("don_gia_khach"), fee.getDonGiaKhach())
          || !equalMoney(saved.get("thanh_tien_khach"), fee.getThanhTienKhach())) throw denied();
    }
    if (!scope.keySet().equals(fees.keySet()) || !equalMoney(quote.get("tong_tien_khach"), total))
      throw denied();
    for (Long id : ids) {
      var fee = fees.get(id);
      var saved = scope.get(id);
      if (fee == null
          || saved == null
          || !"KHACH_HANG".equals(saved.get("ben_chiu_phi"))
          || fee.getThanhTienKhach().signum() <= 0) throw denied();
    }
    List<HoaDonBaoHanh> invoices =
        details.findInvoices(ticket.getId()).stream()
            .filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC)
            .toList();
    if (invoices.size() != 1
        || !Objects.equals(invoices.getFirst().getPhienBanBaoGia(), version)
        || invoices.getFirst().getTongTien().compareTo(total) != 0) throw denied();
    var financial =
        WarrantyFinanceCalculator.invoice(
            invoices.getFirst(), details.findPostedMoney(ticket.getId()));
    var deposit = history.object(quote.get("dieu_kien_dat_coc"));
    BigDecimal minimum =
        deposit == null ? BigDecimal.ZERO : amount(deposit.get("so_tien_toi_thieu"));
    BigDecimal net = financial.daThu().subtract(financial.daHoan());
    if (minimum.signum() < 0 || minimum.compareTo(total) > 0 || net.compareTo(minimum) < 0)
      throw denied();
    for (var event : events) {
      var data = history.payload(event);
      if (starting && data.containsKey("yeu_cau_dung")) throw denied();
      var work = history.object(data.get("cong_viec_da_bat_dau"));
      if (starting
          && work != null
          && Objects.equals(history.id(work.get("phien_ban_bao_gia")), (long) version))
        for (Object raw : history.array(work.get("chi_tiet_phi_ids")))
          if (ids.contains(history.id(raw))) throw denied();
    }
    return fields("toi_thieu", minimum, "da_thu", net, "da_dat", true);
  }

  public void free(List<LichSuBaoHanh> events, Long conclusionId, List<String> codes) {
    var event =
        events.stream()
            .filter(e -> conclusionId.equals(e.getId()))
            .findFirst()
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.NOT_FOUND, "ket_luan_lich_su_id", "CONCLUSION_NOT_FOUND"));
    var conclusion = history.object(history.payload(event).get("ket_luan"));
    if (!"GHI_KET_LUAN".equals(event.getLoaiSuKien()) || conclusion == null) throw denied();
    Map<String, Map<String, Object>> latestItems = new HashMap<>();
    for (var candidate : events) {
      var section = history.object(history.payload(candidate).get("ket_luan"));
      for (Object raw : history.array(section == null ? null : section.get("hang_muc"))) {
        var item = history.object(raw);
        String code = item == null ? null : history.text(item.get("ma_hang_muc"));
        if (code == null) throw invalidHistory();
        latestItems.put(code, item);
      }
      if (history.payload(candidate).containsKey("yeu_cau_dung")) throw denied();
      var work = history.object(history.payload(candidate).get("cong_viec_da_bat_dau"));
      if (work != null)
        for (Object code : history.array(work.get("ma_hang_muc")))
          if (codes.contains(code)) throw denied();
    }
    Set<String> found = new HashSet<>();
    for (Object raw : history.array(conclusion.get("hang_muc"))) {
      var item = history.object(raw);
      String code = item == null ? null : history.text(item.get("ma_hang_muc"));
      if (!codes.contains(code)) continue;
      if (!Objects.equals(latestItems.get(code), item)
          || history.text(item.get("can_cu")) == null
          || !("DU_DIEU_KIEN".equals(item.get("dieu_kien_bao_hanh"))
              || "CUA_HANG".equals(item.get("ben_chiu_phi")))) throw denied();
      found.add(code);
    }
    if (!found.equals(new HashSet<>(codes))) throw denied();
  }

  public void progress(
      PhieuBaoHanh ticket,
      List<LichSuBaoHanh> events,
      List<Long> ids,
      OffsetDateTime at,
      String location) {
    Map<Integer, List<Long>> groups = new LinkedHashMap<>();
    for (Long id : ids) {
      Integer version = null;
      for (var event : events) {
        var work = history.object(history.payload(event).get("cong_viec_da_bat_dau"));
        if (work == null) continue;
        if (!location.equals(history.text(work.get("noi_xu_ly")))) continue;
        for (Object raw : history.array(work.get("chi_tiet_phi_ids")))
          if (id.equals(history.id(raw))) {
            Long v = history.id(work.get("phien_ban_bao_gia"));
            if (v == null || v > Integer.MAX_VALUE) throw invalidHistory();
            version = v.intValue();
          }
      }
      if (version == null) throw denied();
      groups.computeIfAbsent(version, k -> new ArrayList<>()).add(id);
    }
    for (var group : groups.entrySet())
      paid(ticket, events, group.getKey(), group.getValue(), at, false);
  }

  static Map<String, Object> fields(Object... pairs) {
    Map<String, Object> result = new LinkedHashMap<>();
    for (int i = 0; i < pairs.length; i += 2) result.put(pairs[i].toString(), pairs[i + 1]);
    return result;
  }

  private static BigDecimal amount(Object raw) {
    if (!(raw instanceof Number)) throw invalidHistory();
    try {
      return new BigDecimal(raw.toString());
    } catch (NumberFormatException e) {
      throw invalidHistory();
    }
  }

  private static boolean equalMoney(Object raw, BigDecimal expected) {
    return raw instanceof Number && amount(raw).compareTo(expected) == 0;
  }

  static WarrantyReadException denied() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_PAID_WORK_NOT_AUTHORIZED,
        "chi_tiet_phi_ids",
        "PAID_WORK_NOT_AUTHORIZED");
  }

  static AppException invalidHistory() {
    return new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
  }
}
