package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.WarrantyReplacementRepository;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Đối chiếu nguồn do nghiệp vụ kho lưu trong JSON lịch sử: giu_cho_hang_doi gắn phiên bản phương
 * án, dòng tồn, kho, phiên bản hàng, một đơn vị và serial nếu có; xuat_hang_doi dẫn tới thẻ kho
 * thật. Request phương án không được truyền các dữ liệu nguồn này để tự nhận quyền giải phóng hàng.
 */
@Component
@RequiredArgsConstructor
public class WarrantyReplacementResources {
  private final WarrantyHistorySupport history;
  private final WarrantyReplacementRepository repository;

  public record State(Map<String, Object> hold, TheKho issue, ThietBiBaoHanh replacement) {
    boolean held() {
      return hold != null && Boolean.TRUE.equals(hold.get("dang_giu"));
    }

    boolean hasResources() {
      return held() || issue != null || replacement != null;
    }
  }

  public State state(PhieuBaoHanh ticket, Map<String, Object> plan, List<LichSuBaoHanh> events) {
    Long version = history.id(plan.get("phien_ban"));
    Map<String, Object> hold = null;
    Long issueId = history.id(plan.get("giao_dich_xuat_the_kho_id"));
    Set<Long> knownIssues = new HashSet<>();
    if (issueId != null) knownIssues.add(issueId);
    for (var event : events) {
      var data = history.payload(event);
      var snapshot = history.object(data.get("giu_cho_hang_doi"));
      if (snapshot != null && !(snapshot.get("dang_giu") instanceof Boolean)) throw invalid();
      if (snapshot != null && version.equals(history.id(snapshot.get("phien_ban_phuong_an"))))
        hold = snapshot;
      var issued = history.object(data.get("xuat_hang_doi"));
      if (issued != null) {
        Long link = history.id(issued.get("giao_dich_xuat_the_kho_id"));
        if (link == null) throw invalid();
        knownIssues.add(link);
        if (version.equals(history.id(issued.get("phien_ban_phuong_an")))) issueId = link;
      }
      var previous = history.object(data.get("phuong_an_doi"));
      if (previous != null && previous.get("giao_dich_xuat_the_kho_id") != null)
        knownIssues.add(history.id(previous.get("giao_dich_xuat_the_kho_id")));
    }
    TheKho issue = null;
    for (var ledger : repository.issues(ticket.getId())) {
      if (!knownIssues.contains(ledger.getId())) throw invalid();
      if (ledger.getId().equals(issueId)) issue = ledger;
    }
    if (issueId != null && issue == null) throw invalid();
    if (issue != null
        && (issue.getPhieuBaoHanh() == null
            || !ticket.getId().equals(issue.getPhieuBaoHanh().getId())
            || issue.getLoaiGiaoDich() != LoaiGiaoDichKho.XUAT_DOI_BAO_HANH
            || !Integer.valueOf(-1).equals(issue.getSoLuongThayDoi())
            || issue.getPhienBan() == null
            || !history.id(plan.get("phien_ban_thay_the_id")).equals(issue.getPhienBan().getId())))
      throw invalid();
    if (Boolean.TRUE.equals(plan.get("da_giu_cho")) && hold == null
        || Boolean.TRUE.equals(plan.get("da_xuat")) && issue == null) throw invalid();
    if (Boolean.TRUE.equals(plan.get("da_hoan_xuat"))
        || Boolean.TRUE.equals(plan.get("da_tra_nguon"))) {
      if (!Boolean.TRUE.equals(plan.get("da_huy"))
          || !Boolean.FALSE.equals(plan.get("dang_ap_dung_cho_phuong_an"))
          || ticket.getThietBiThayThe() != null
          || hold != null && Boolean.TRUE.equals(hold.get("dang_giu"))) throw invalid();
      boolean evidence =
          events.stream()
              .anyMatch(
                  e -> {
                    var payload = history.payload(e);
                    var returned =
                        history.object(
                            payload.get(
                                Boolean.TRUE.equals(plan.get("da_hoan_xuat"))
                                    ? "hoan_xuat_hang_doi"
                                    : "tra_hang_cap_rieng"));
                    return returned != null
                        && Objects.equals(
                            history.id(returned.get("thiet_bi_id")),
                            history.id(plan.get("thiet_bi_da_thu_hoi_id")));
                  });
      if (!evidence) throw invalid();
      return new State(hold, null, null);
    }
    var replacement = ticket.getThietBiThayThe();
    if (replacement != null) {
      if (!Objects.equals(history.id(plan.get("thiet_bi_thay_the_id")), replacement.getId())
          || replacement.getChiTietDonHang() == null
          || !ticket
              .getThietBi()
              .getChiTietDonHang()
              .getId()
              .equals(replacement.getChiTietDonHang().getId())) throw invalid();
      Long variant = history.id(plan.get("phien_ban_thay_the_id"));
      if (variant != null && !variant.equals(replacement.getPhienBan().getId())) throw invalid();
    } else if (plan.get("thiet_bi_thay_the_id") != null) throw invalid();
    if (issue != null && replacement == null) throw invalid();
    if (issue != null && hold != null && Boolean.TRUE.equals(hold.get("dang_giu"))) throw invalid();
    if ("TON_KHO_CUA_HANG".equals(plan.get("nguon")) && replacement != null && issue == null)
      throw invalid();
    if ("DON_VI_BAO_HANH".equals(plan.get("nguon")) && (issue != null || hold != null))
      throw invalid();
    return new State(hold, issue, replacement);
  }

  public record Cancellation(Map<String, Object> extra, Map<String, Object> releasedHold) {}

  public Cancellation cancel(PhieuBaoHanh ticket, Map<String, Object> plan, State state) {
    var extra =
        fields(
            "da_giai_phong_giu_cho",
            false,
            "da_hoan_xuat",
            false,
            "hang_can_thu_hoi",
            false,
            "thao_tac_tiep_theo",
            null);
    boolean issued = state.issue() != null, received = state.replacement() != null;
    Map<String, Object> released = null;
    if (issued || received) {
      extra.put("hang_can_thu_hoi", true);
      extra.put("thao_tac_tiep_theo", issued ? "HOAN_XUAT_HANG_DOI" : "TRA_HANG_CAP_RIENG_DON_VI");
      if (issued) extra.put("giao_dich_xuat_the_kho_id", state.issue().getId());
      var serial = state.replacement().getSoSerial();
      if (serial != null) {
        serial = repository.serial(serial.getId());
        if (serial.getTrangThai() != TrangThaiSerial.GIU_CHO_BAO_HANH
            && serial.getTrangThai() != TrangThaiSerial.DANG_BAO_HANH) throw invalid();
        extra.put(
            "serials", List.of(fields("id", serial.getId(), "trang_thai", serial.getTrangThai())));
      }
    } else if (state.held()) {
      var hold = state.hold();
      Long variant = history.id(plan.get("phien_ban_thay_the_id")),
          stockId = history.id(hold.get("ton_kho_id")),
          warehouse = history.id(hold.get("kho_hang_id"));
      Long serialId = history.id(hold.get("so_serial_id"));
      if (stockId == null
          || warehouse == null
          || variant == null
          || !variant.equals(history.id(hold.get("phien_ban_id")))
          || !Long.valueOf(1).equals(history.id(hold.get("so_luong")))) throw invalid();
      var stock = repository.stock(stockId);
      if (stock.getKhoHang() == null
          || !warehouse.equals(stock.getKhoHang().getId())
          || stock.getPhienBan() == null
          || !variant.equals(stock.getPhienBan().getId())
          || stock.getPhienBan().getCoQuanLySerial() == null
          || stock.getTonThucTe() == null
          || stock.getTonCoTheBan() == null
          || stock.getHangLoi() == null
          || stock.getSoLuongGiuChoBaoHanh() == null
          || stock.getTonThucTe() < 0
          || stock.getTonCoTheBan() < 0
          || stock.getHangLoi() < 0
          || stock.getSoLuongGiuChoBaoHanh() < 1
          || (long) stock.getTonCoTheBan() + stock.getHangLoi() + stock.getSoLuongGiuChoBaoHanh()
              > stock.getTonThucTe()) throw invalid();
      var owners = repository.activeHolds(stockId);
      long total = 0, own = 0;
      Set<Long> serials = new HashSet<>();
      for (var owner : owners) {
        if (owner.quantity() != 1
            || owner.ticketId() == null
            || owner.version() == null
            || owner.ticketId() <= 0
            || owner.version() <= 0
            || owner.serialId() != null && !serials.add(owner.serialId())) throw invalid();
        total = Math.addExact(total, owner.quantity());
        if (ticket.getId().equals(owner.ticketId())
            && history.id(plan.get("phien_ban")).equals(owner.version())) {
          if (!Objects.equals(serialId, owner.serialId())) throw invalid();
          own++;
        }
      }
      if (total != stock.getSoLuongGiuChoBaoHanh()
          || own != 1
          || !Objects.equals(
              Boolean.TRUE.equals(stock.getPhienBan().getCoQuanLySerial()), serialId != null))
        throw invalid();
      SoSerialSanPham serial = null;
      if (serialId != null) {
        serial = repository.serial(serialId);
        if (serial.getPhienBan() == null
            || !variant.equals(serial.getPhienBan().getId())
            || serial.getTrangThai() != TrangThaiSerial.GIU_CHO_BAO_HANH
            || serial.getDonHang() != null
            || serial.getNgayKichHoat() != null
            || repository.serialHeldByAnotherPlan(
                serialId, ticket.getId(), history.id(plan.get("phien_ban")))) throw invalid();
      }
      stock.setTonCoTheBan(Math.addExact(stock.getTonCoTheBan(), 1));
      stock.setSoLuongGiuChoBaoHanh(stock.getSoLuongGiuChoBaoHanh() - 1);
      if (serial != null) {
        serial.setTrangThai(TrangThaiSerial.TRONG_KHO);
        extra.put(
            "serials", List.of(fields("id", serial.getId(), "trang_thai", serial.getTrangThai())));
      }
      released = new LinkedHashMap<>(hold);
      released.put("dang_giu", false);
      extra.put("da_giai_phong_giu_cho", true);
    } else extra.put("da_giai_phong_giu_cho", true);
    if (state.held() || issued || received) {
      extra.put("the_kho", null);
      extra.put(
          "bien_dong_ton",
          fields(
              "ton_thuc_te",
              0,
              "ton_co_the_ban",
              released == null ? 0 : 1,
              "so_luong_giu_cho_bao_hanh",
              released == null ? 0 : -1));
    }
    return new Cancellation(extra, released);
  }

  private AppException invalid() {
    return new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
  }
}
