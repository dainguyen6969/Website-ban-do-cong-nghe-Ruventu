package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.invalidHistory;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyReplacementPlanResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class WarrantyReplacementTransactions {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;
  private final WarrantyReplacementRepository repository;
  private final WarrantyReplacementResources resources;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;
  private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyReplacementPlanResponse> apply(
      Long id, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-PLAN-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/" + id + "/replacement-plan",
            input,
            AdminWarrantyReplacementPlanResponse.class,
            WarrantyReplacementValidation.INVALID);
    if (replay.previous() != null) return replay.previous();
    var origin = workflow.ticketOrigin(id);
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    var ticket = workflow.lockTicket(id);
    var beforeState = ticket.getTrangThaiXuLy();
    var beforeResult = ticket.getKetQuaXuLy();
    if (ticket.getThietBi() == null
        || ticket.getDonHang() == null
        || ticket.getThietBi().getChiTietDonHang() == null
        || !origin.orderId().equals(ticket.getDonHang().getId())
        || !origin.lineId().equals(ticket.getThietBi().getChiTietDonHang().getId())
        || ticket.getTrangThaiXuLy() == null
        || ticket.getKetQuaXuLy() == null) throw invalidHistory();
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT
        || ticket.getKetQuaXuLy() == KetQuaXuLyBaoHanh.DOI_SAN_PHAM
        || events.stream().anyMatch(e -> "HANDOVER".equals(e.getLoaiSuKien()))) throw handedOver();
    var original = locks.lockDevice(ticket.getThietBi().getId());
    if (original.getChiTietDonHang() == null
        || !origin.lineId().equals(original.getChiTietDonHang().getId())) throw invalidHistory();
    if (original.getChiTietTraHang() != null) throw conflict();
    if (original.getSoSerial() != null) {
      var serial = locks.lockSerial(original.getSoSerial().getId());
      if (serial.getTrangThai() != TrangThaiSerial.DANG_BAO_HANH) throw conflict();
      if (ticket.getSoSerial() != null && !ticket.getSoSerial().getId().equals(serial.getId()))
        throw invalidHistory();
    } else if (ticket.getSoSerial() != null) throw invalidHistory();
    var versions = versions(events);
    var previous = versions.isEmpty() ? null : versions.lastEntry().getValue();
    if (previous != null && Boolean.TRUE.equals(previous.get("da_ban_giao"))) throw handedOver();
    String action = input.get("hanh_dong").toString();
    if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.TIEP_NHAN) throw conflict();
    Map<String, Object> plan;
    Map<String, Object> extra = new LinkedHashMap<>(), releasedHold = null;
    String message;
    if (action.equals("LAP_PHIEN_BAN")) {
      if (previous == null
          && (!repository.issues(id).isEmpty()
              || events.stream().anyMatch(e -> history.payload(e).containsKey("giu_cho_hang_doi"))))
        throw invalidHistory();
      if (previous == null && input.get("thay_the_phien_ban") != null) throw versionNotFound();
      if (previous != null
          && !Objects.equals(
              history.id(previous.get("phien_ban")),
              input.get("thay_the_phien_ban") == null
                  ? null
                  : ((Integer) input.get("thay_the_phien_ban")).longValue())) throw conflict();
      if (previous != null && resources.state(ticket, previous, events).hasResources()
          || ticket.getThietBiThayThe() != null) throw conflict();
      conclusion(events, (Long) input.get("ket_luan_lich_su_id"));
      repository.activeVariant((Long) input.get("phien_ban_thay_the_id"));
      Integer quote = (Integer) input.get("bao_gia_phien_ban");
      if (quote != null && !quotes(ticket, events).containsKey(quote)) throw quoteNotFound();
      OffsetDateTime expiry = expiry(ticket, events, input);
      int version = versions.isEmpty() ? 1 : Math.addExact(versions.lastKey(), 1);
      plan = new LinkedHashMap<>(input);
      plan.remove("hanh_dong");
      if (plan.get("han_moi_xac_nhan") instanceof OffsetDateTime time)
        plan.put("han_moi_xac_nhan", time.toString());
      plan.putAll(
          fields(
              "phien_ban",
              version,
              "thiet_bi_cu_id",
              ticket.getThietBi().getId(),
              "thiet_bi_thay_the_id",
              null,
              "da_duyet",
              false,
              "khach_dong_y",
              false,
              "quyet_dinh_khach",
              null,
              "quyet_dinh",
              null,
              "da_huy",
              false,
              "da_ban_giao",
              false,
              "nguoi_phe_duyet_id",
              null,
              "han_bao_hanh_ap_dung",
              expiry.toString(),
              "thoi_diem_lap",
              OffsetDateTime.now(VN).toString()));
      if ("HAN_MOI_XAC_NHAN".equals(input.get("cach_tinh_han")))
        plan.put("nguoi_xac_nhan_han_id", actorId);
      ticket.setNguonSanPhamThayThe(
          NguonSanPhamThayTheBaoHanh.valueOf(input.get("nguon").toString()));
      if (previous != null || ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.CHO_TRA_KHACH) {
        ticket.setTrangThaiXuLy(originalState(ticket, events));
      }
      ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA);
      extra.put("thay_the_phien_ban", input.get("thay_the_phien_ban"));
      extra.put(
          "phien_ban_truoc",
          previous == null
              ? null
              : fields(
                  "phien_ban",
                  history.id(previous.get("phien_ban")),
                  "da_duyet",
                  previous.get("da_duyet"),
                  "quyet_dinh_khach",
                  previous.get("quyet_dinh_khach")));
      if (previous != null) {
        extra.put("bao_gia_phien_ban", quote);
        extra.put("can_phe_duyet_lai", true);
        extra.put("can_khach_xac_nhan_lai", true);
        message = "Lập phương án đổi mới, giữ quyết định cũ và chờ xác nhận lại";
      } else if ("HAN_MOI_XAC_NHAN".equals(input.get("cach_tinh_han")))
        message = "Ghi hạn sau đổi theo chính sách đã xác nhận";
      else if ("DON_VI_BAO_HANH".equals(input.get("nguon")))
        message = "Lập phương án nguồn đơn vị cấp riêng";
      else message = "Lập phương án đổi, chờ phê duyệt và khách";
      if ("DON_VI_BAO_HANH".equals(input.get("nguon"))) {
        extra.put("tinh_trang_hang", input.get("tinh_trang_hang"));
        extra.put("khong_mac_dinh_hang_moi_nguyen_seal", true);
      }
      if ("HAN_MOI_XAC_NHAN".equals(input.get("cach_tinh_han"))) {
        extra.put("cach_tinh_han", input.get("cach_tinh_han"));
        extra.put("can_cu_han", input.get("can_cu_han"));
      }
    } else {
      Integer version = (Integer) input.get("phien_ban_phuong_an");
      if (!versions.containsKey(version)) throw versionNotFound();
      if (!versions.lastKey().equals(version)) throw conflict();
      plan = new LinkedHashMap<>(previous);
      if (Boolean.TRUE.equals(plan.get("da_huy")) || "HUY".equals(plan.get("trang_thai")))
        throw conflict();
      if (!ticket.getThietBi().getId().equals(history.id(plan.get("thiet_bi_cu_id"))))
        throw invalidHistory();
      switch (action) {
        case "PHE_DUYET" -> {
          if (Boolean.TRUE.equals(plan.get("da_duyet")) || plan.get("quyet_dinh") != null)
            throw conflict();
          validatePolicy(ticket, events, plan);
          plan.put("da_duyet", true);
          plan.put("nguoi_phe_duyet_id", actorId);
          plan.put(
              "phe_duyet",
              fields(
                  "nguoi_phe_duyet_id",
                  actorId,
                  "ly_do",
                  input.get("ly_do"),
                  "can_cu",
                  input.get("can_cu"),
                  "thoi_diem",
                  OffsetDateTime.now(VN).toString()));
          message = "Phê duyệt phương án đổi, chờ quyết định của khách";
        }
        case "QUYET_DINH_KHACH" -> {
          if (plan.get("quyet_dinh") != null || plan.get("quyet_dinh_khach") != null)
            throw conflict();
          if (!Boolean.TRUE.equals(plan.get("da_duyet"))) throw notApproved();
          OffsetDateTime at = (OffsetDateTime) input.get("thoi_diem");
          var approved = history.object(plan.get("phe_duyet"));
          var approvedAt = approved == null ? null : history.time(approved.get("thoi_diem"));
          if (approvedAt == null || at.isBefore(approvedAt)) throw conflict();
          String decision = input.get("quyet_dinh").toString();
          var consent =
              fields(
                  "quyet_dinh",
                  decision,
                  "thoi_diem",
                  at.toString(),
                  "kenh",
                  input.get("kenh"),
                  "bang_chung_urls",
                  input.get("bang_chung_urls"));
          if (input.get("ly_do") != null) consent.put("ly_do", input.get("ly_do"));
          if (decision.equals("DONG_Y")) {
            validatePolicy(ticket, events, plan);
            requireQuoteConsent(ticket, events, plan, at);
            var state = resources.state(ticket, plan, events);
            ticket.setTrangThaiXuLy(
                state.replacement() != null
                        && replacementAtShop(events, state.replacement().getId())
                    ? TrangThaiBaoHanh.DA_NHAN_LAI
                    : TrangThaiBaoHanh.CHO_DOI_SAN_PHAM);
            message = "Khách đồng ý phương án đã duyệt, chờ hàng";
          } else {
            ticket.setTrangThaiXuLy(originalState(ticket, events));
            message = "Khách từ chối phương án, tiếp tục theo dõi thiết bị";
          }
          plan.put("quyet_dinh", consent);
          plan.put("quyet_dinh_khach", decision);
          plan.put("khach_dong_y", decision.equals("DONG_Y"));
          ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA);
          extra.put("quyet_dinh", consent);
        }
        case "HUY" -> {
          for (var settlement :
              new WarrantySupplierSettlementSnapshots(history).load(events).values()) {
            if (!Objects.equals(
                history.id(settlement.get("phien_ban_phuong_an")),
                history.id(plan.get("phien_ban")))) continue;
            if (WarrantySupplierSettlementSnapshots.quantity(settlement.get("so_luong_da_bu")) > 0
                || WarrantyQuoteSnapshots.amount(settlement.get("so_tien_nghia_vu")).signum() > 0)
              throw WarrantySupplierSettlementTransactions.conflict("phien_ban_phuong_an");
            var oldLocation = history.latestSection(events, "noi_dang_giu_thiet_bi_cu");
            if (oldLocation != null && !"CUA_HANG".equals(oldLocation.get("loai")))
              throw WarrantySupplierSettlementTransactions.conflict("thiet_bi_cu_id");
            for (var event : events) {
              var pending = history.object(history.payload(event).get("hang_bu_thuc_nhan"));
              if (pending != null
                  && Boolean.TRUE.equals(pending.get("cho_xac_minh"))
                  && Objects.equals(
                      history.id(pending.get("nghia_vu_lich_su_id")),
                      history.id(settlement.get("nghia_vu_lich_su_id"))))
                throw WarrantySupplierSettlementTransactions.conflict("phien_ban_phuong_an");
            }
          }
          var state = resources.state(ticket, plan, events);
          var after = originalState(ticket, events);
          var cancelled = resources.cancel(ticket, plan, state);
          extra.putAll(cancelled.extra());
          releasedHold = cancelled.releasedHold();
          plan.put("da_huy", true);
          if (releasedHold != null) plan.put("da_giu_cho", false);
          plan.put(
              "huy",
              fields(
                  "nguoi_thuc_hien_id",
                  actorId,
                  "ly_do",
                  input.get("ly_do"),
                  "thoi_diem",
                  OffsetDateTime.now(VN).toString(),
                  "ket_qua",
                  extra));
          ticket.setTrangThaiXuLy(after);
          ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA);
          if (state.issue() != null)
            message = "Hủy sau xuất, chờ thực nhận và kiểm tra trước hoàn xuất";
          else if (state.replacement() != null)
            message = "Hủy phương án đã nhận hàng hãng, chờ trả nguồn";
          else if (state.held()) message = "Hủy sau giữ chỗ, giải phóng hàng kho";
          else message = "Hủy phương án trước giữ hoặc cấp hàng";
        }
        default -> throw WarrantyReplacementValidation.invalid();
      }
    }
    var payload =
        fields(
            "thoi_diem",
            OffsetDateTime.now(VN).toString(),
            "hanh_dong_phuong_an",
            action,
            "phuong_an_doi",
            plan,
            "san_sang_tra",
            null);
    payload.put(
        "trang_thai",
        fields(
            "su_kien",
            "PHUONG_AN_DOI_" + action,
            "thoi_diem",
            payload.get("thoi_diem"),
            "trang_thai_truoc",
            beforeState.name(),
            "trang_thai_sau",
            ticket.getTrangThaiXuLy().name(),
            "ket_qua_truoc",
            beforeResult.name(),
            "ket_qua_sau",
            ticket.getKetQuaXuLy().name()));
    if (releasedHold != null) payload.put("giu_cho_hang_doi", releasedHold);
    var event =
        workflow.append(
            ticket,
            actorId,
            "PHUONG_AN_DOI_" + action,
            message,
            mapper.writeValueAsString(payload));
    if (event == null || event.getId() == null) throw invalidHistory();
    if (action.equals("PHE_DUYET")) {
      plan.put("lich_su_phe_duyet_id", event.getId());
      extra.put("lich_su_phe_duyet_id", event.getId());
      event.setDuLieuChiTiet(mapper.writeValueAsString(payload));
    }
    repository.flush();
    var data = new AdminWarrantyReplacementPlanResponse();
    data.putAll(
        fields(
            "phieu_bao_hanh_id",
            id,
            "phien_ban_phuong_an",
            history.id(plan.get("phien_ban")),
            "da_duyet",
            plan.get("da_duyet"),
            "khach_dong_y",
            plan.get("khach_dong_y"),
            "nguon",
            plan.get("nguon"),
            "phien_ban_thay_the_id",
            plan.get("phien_ban_thay_the_id"),
            "han_bao_hanh_ap_dung",
            history.time(plan.get("han_bao_hanh_ap_dung")),
            "trang_thai_xu_ly",
            ticket.getTrangThaiXuLy(),
            "ket_qua_xu_ly",
            ticket.getKetQuaXuLy(),
            "thiet_bi_thay_the_id",
            ticket.getThietBiThayThe() == null ? null : ticket.getThietBiThayThe().getId(),
            "quyet_dinh_khach",
            plan.get("quyet_dinh_khach"),
            "da_huy",
            plan.get("da_huy"),
            "da_ban_giao",
            plan.get("da_ban_giao"),
            "nguoi_phe_duyet_id",
            plan.get("nguoi_phe_duyet_id")));
    data.putAll(extra);
    return mutations.complete(replay, 200, message, data);
  }

  TreeMap<Integer, Map<String, Object>> versions(List<LichSuBaoHanh> events) {
    var result = new TreeMap<Integer, Map<String, Object>>();
    for (var event : events) {
      var value = history.object(history.payload(event).get("phuong_an_doi"));
      if (value == null) continue;
      Long number = history.id(value.get("phien_ban"));
      if (number == null || number > Integer.MAX_VALUE) throw invalidHistory();
      int version = number.intValue();
      var previous = result.get(version);
      var merged =
          previous == null ? new LinkedHashMap<String, Object>() : new LinkedHashMap<>(previous);
      if (previous != null) {
        for (String field :
            List.of(
                "thiet_bi_cu_id",
                "phien_ban_thay_the_id",
                "nguon",
                "tinh_trang_hang",
                "phu_kien",
                "han_bao_hanh_ap_dung",
                "cach_tinh_han",
                "han_moi_xac_nhan",
                "can_cu_han",
                "bao_gia_phien_ban",
                "ket_luan_lich_su_id",
                "ly_do",
                "can_cu",
                "don_vi_phe_duyet",
                "huong_xu_ly_thiet_bi_cu",
                "chung_tu_urls",
                "thay_the_phien_ban"))
          if (previous.containsKey(field)
              && value.containsKey(field)
              && !Objects.equals(previous.get(field), value.get(field))) throw invalidHistory();
        for (String field :
            List.of(
                "quyet_dinh",
                "quyet_dinh_khach",
                "phe_duyet",
                "nguoi_phe_duyet_id",
                "lich_su_phe_duyet_id"))
          if (previous.get(field) != null
              && value.containsKey(field)
              && !Objects.equals(previous.get(field), value.get(field))) throw invalidHistory();
        for (String flag : List.of("da_duyet", "da_huy", "da_ban_giao", "khach_dong_y"))
          if (Boolean.TRUE.equals(previous.get(flag))
              && value.containsKey(flag)
              && !Boolean.TRUE.equals(value.get(flag))) throw invalidHistory();
      }
      merged.putAll(value);
      result.put(version, merged);
    }
    return result;
  }

  private void conclusion(List<LichSuBaoHanh> events, Long id) {
    var selected =
        events.stream()
            .filter(e -> id != null && id.equals(e.getId()))
            .findFirst()
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.NOT_FOUND, "ket_luan_lich_su_id", "CONCLUSION_NOT_FOUND"));
    var conclusion = history.object(history.payload(selected).get("ket_luan"));
    if (!"GHI_KET_LUAN".equals(selected.getLoaiSuKien()) || conclusion == null) throw policy();
    Map<String, Long> latest = new HashMap<>();
    for (var event : events) {
      var report = history.object(history.payload(event).get("ket_luan"));
      for (Object raw : history.array(report == null ? null : report.get("hang_muc"))) {
        var item = history.object(raw);
        if (item == null || history.text(item.get("ma_hang_muc")) == null) throw invalidHistory();
        latest.put(history.text(item.get("ma_hang_muc")), event.getId());
      }
    }
    boolean eligible = false;
    for (Object raw : history.array(conclusion.get("hang_muc"))) {
      var item = history.object(raw);
      if (item == null) throw invalidHistory();
      String code = history.text(item.get("ma_hang_muc"));
      if (!id.equals(latest.get(code))
          || history.text(item.get("can_cu")) == null
          || history.text(item.get("can_cu")).isBlank()) throw policy();
      if ("DU_DIEU_KIEN".equals(item.get("dieu_kien_bao_hanh"))
          || "CUA_HANG".equals(item.get("ben_chiu_phi"))) eligible = true;
    }
    if (!eligible) throw policy();
  }

  private OffsetDateTime expiry(
      PhieuBaoHanh ticket, List<LichSuBaoHanh> events, Map<String, Object> input) {
    OffsetDateTime deadline;
    if ("HAN_MOI_XAC_NHAN".equals(input.get("cach_tinh_han"))) {
      deadline = (OffsetDateTime) input.get("han_moi_xac_nhan");
      if (deadline == null || !deadline.isAfter(OffsetDateTime.now(VN))) throw policy();
    } else {
      var device = ticket.getThietBi();
      deadline =
          WarrantyReadValidation.time(
              device.getSoSerial() == null
                  ? device.getHanBaoHanh()
                  : device.getSoSerial().getHanBaoHanh());
      if (deadline == null)
        for (var event : events) {
          var snapshot = history.object(history.payload(event).get("thiet_bi"));
          if (snapshot != null
              && (snapshot.get("id") == null
                  || device.getId().equals(history.id(snapshot.get("id")))))
            deadline = history.time(snapshot.get("han_bao_hanh"));
        }
    }
    if (deadline == null
        || ticket.getNgayTiepNhan() == null
        || deadline.isBefore(WarrantyReadValidation.time(ticket.getNgayTiepNhan()))) throw policy();
    return deadline;
  }

  void validatePolicy(PhieuBaoHanh ticket, List<LichSuBaoHanh> events, Map<String, Object> plan) {
    conclusion(events, history.id(plan.get("ket_luan_lich_su_id")));
    Long variant = history.id(plan.get("phien_ban_thay_the_id"));
    if (variant == null || history.time(plan.get("han_bao_hanh_ap_dung")) == null) throw policy();
    repository.activeVariant(variant);
    if (history.text(plan.get("can_cu")) == null
        || history.text(plan.get("can_cu_han")) == null
        || history.array(plan.get("chung_tu_urls")).isEmpty()) throw policy();
  }

  private TreeMap<Integer, Map<String, Object>> quotes(
      PhieuBaoHanh ticket, List<LichSuBaoHanh> events) {
    return WarrantyQuoteSnapshots.load(history, ticket, events, details.findFees(ticket.getId()));
  }

  void requireQuoteConsent(
      PhieuBaoHanh ticket,
      List<LichSuBaoHanh> events,
      Map<String, Object> plan,
      OffsetDateTime at) {
    Long version = history.id(plan.get("bao_gia_phien_ban"));
    if (version == null) return;
    var quote = quotes(ticket, events).get(version.intValue());
    if (quote == null) throw quoteNotFound();
    var consent = history.object(quote.get("quyet_dinh"));
    if (!"DONG_Y".equals(quote.get("trang_thai"))
        || Boolean.TRUE.equals(quote.get("da_huy"))
        || consent == null
        || !"DONG_Y".equals(consent.get("quyet_dinh"))
        || history.time(consent.get("thoi_diem")) == null
        || history.time(consent.get("thoi_diem")).isAfter(at)
        || history.text(consent.get("kenh")) == null
        || history.array(consent.get("bang_chung_urls")).isEmpty()
        || history.time(quote.get("han_phan_hoi")) == null
        || history.time(consent.get("thoi_diem")).isAfter(history.time(quote.get("han_phan_hoi"))))
      throw quoteUnapproved();
    if (WarrantyQuoteSnapshots.amount(quote.get("tong_tien_khach")).signum() > 0) {
      var active =
          details.findInvoices(ticket.getId()).stream()
              .filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC)
              .toList();
      if (active.size() != 1 || !version.equals(active.getFirst().getPhienBanBaoGia().longValue()))
        throw quoteUnapproved();
      WarrantyInvoiceAdjustments.validate(active.getFirst(), quote, events, history);
    }
  }

  TrangThaiBaoHanh originalState(PhieuBaoHanh ticket, List<LichSuBaoHanh> events) {
    Map<String, Object> location = null;
    for (var event : events)
      for (String key : List.of("noi_dang_giu", "noi_dang_giu_thiet_bi_cu")) {
        var value = history.object(history.payload(event).get(key));
        if (value != null
            && ticket.getThietBi().getId().equals(history.id(value.get("thiet_bi_id"))))
          location = value;
      }
    if (location == null) throw conflict();
    return switch (Objects.toString(location.get("loai"), "")) {
      case "CUA_HANG" -> TrangThaiBaoHanh.DANG_KIEM_TRA;
      case "DON_VI_BAO_HANH" -> TrangThaiBaoHanh.DANG_BAO_HANH;
      case "DANG_VAN_CHUYEN" -> TrangThaiBaoHanh.DA_GUI_BAO_HANH;
      default -> throw conflict();
    };
  }

  private boolean replacementAtShop(List<LichSuBaoHanh> events, Long id) {
    var location = history.latestSection(events, "noi_dang_giu");
    return location != null
        && "CUA_HANG".equals(location.get("loai"))
        && id.equals(history.id(location.get("thiet_bi_id")));
  }

  private static WarrantyReadException versionNotFound() {
    return WarrantyReadException.notFound(
        ErrorCode.NOT_FOUND, "phien_ban_phuong_an", "REPLACEMENT_VERSION_NOT_FOUND");
  }

  private static WarrantyReadException quoteNotFound() {
    return WarrantyReadException.notFound(
        ErrorCode.NOT_FOUND, "bao_gia_phien_ban", "QUOTE_VERSION_NOT_FOUND");
  }

  private static WarrantyReadException conflict() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_REPLACEMENT_CONFLICT,
        "phien_ban_phuong_an",
        "REPLACEMENT_VERSION_CONFLICT");
  }

  private static WarrantyReadException notApproved() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_REPLACEMENT_NOT_APPROVED,
        "phien_ban_phuong_an",
        "REPLACEMENT_NOT_APPROVED");
  }

  private static WarrantyReadException handedOver() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_REPLACEMENT_ALREADY_HANDED_OVER,
        "hanh_dong",
        "REPLACEMENT_ALREADY_HANDED_OVER");
  }

  private static WarrantyReadException policy() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_REPLACEMENT_POLICY_INVALID,
        "ket_luan_lich_su_id",
        "REPLACEMENT_POLICY_INVALID");
  }

  private static WarrantyReadException quoteUnapproved() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_REPLACEMENT_QUOTE_NOT_APPROVED,
        "bao_gia_phien_ban",
        "REPLACEMENT_QUOTE_NOT_APPROVED");
  }
}
