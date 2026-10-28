package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.amount;
import static com.example.dantruventu.Services.warranty.WarrantySupplierSettlementSnapshots.*;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantySupplierSettlementResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class WarrantySupplierSettlementTransactions {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;
  private final WarrantyReplacementRepository replacements;
  private final WarrantyReplacementItemsRepository items;
  private final WarrantySupplierSettlementRepository repository;
  private final WarrantyReplacementTransactions plans;
  private final WarrantyReplacementResources resources;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;
  private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantySupplierSettlementResponse> apply(
      Long id, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-SET-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/" + id + "/supplier-settlements",
            input,
            AdminWarrantySupplierSettlementResponse.class,
            WarrantySupplierSettlementValidation.INVALID);
    if (replay.previous() != null) return replay.previous();
    var origin = workflow.ticketOrigin(id);
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    var ticket = workflow.lockTicket(id);
    if (ticket.getThietBi() == null
        || ticket.getDonHang() == null
        || ticket.getThietBi().getChiTietDonHang() == null
        || !origin.orderId().equals(ticket.getDonHang().getId())
        || !origin.lineId().equals(ticket.getThietBi().getChiTietDonHang().getId()))
      throw invalid();
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    var snapshots = new WarrantySupplierSettlementSnapshots(history);
    var obligations = snapshots.load(events);
    String action = input.get("hanh_dong").toString();
    OffsetDateTime at =
        input.get("thoi_diem") == null
            ? OffsetDateTime.now(VN)
            : (OffsetDateTime) input.get("thoi_diem");
    if (ticket.getNgayTiepNhan() == null
        || at.isBefore(WarrantyReadValidation.time(ticket.getNgayTiepNhan())))
      throw conflict("thoi_diem");
    Map<String, Object> value;
    if (action.equals("GHI_NGHIA_VU")) value = register(ticket, input, events, obligations, at);
    else {
      value = snapshots.require(events, (Long) input.get("nghia_vu_lich_su_id"));
      snapshots.reconcileMoney(value, events, details.findPostedMoney(id));
      var last = history.time(value.get("thoi_diem_cap_nhat"));
      if (last == null || at.isBefore(last)) throw conflict("thoi_diem");
      if (quantity(value.get("so_luong_huy_do_hoan_xuat")) > 0) throw resolved();
      if (Set.of("NHAN_HANG_BU", "CHOT_PHUONG_AN_KHAC").contains(action)) {
        var version =
            plans.versions(events).get(history.id(value.get("phien_ban_phuong_an")).intValue());
        if (version == null || Boolean.TRUE.equals(version.get("da_huy")))
          throw conflict("nghia_vu_lich_su_id");
      }
      items.supplierForReturn(history.id(value.get("nha_cung_cap_id")));
      if (Set.of("CHOT_PHUONG_AN_KHAC", "GHI_NCC_TU_CHOI").contains(action))
        for (var event : events) {
          var pending = history.object(history.payload(event).get("hang_bu_thuc_nhan"));
          if (pending != null
              && Boolean.TRUE.equals(pending.get("cho_xac_minh"))
              && Objects.equals(
                  history.id(pending.get("nghia_vu_lich_su_id")),
                  history.id(value.get("nghia_vu_lich_su_id"))))
            throw conflict("nghia_vu_lich_su_id");
        }
    }
    var original = locks.lockDevice(ticket.getThietBi().getId());
    if (!original.getId().equals(history.id(value.get("thiet_bi_cu_id")))
        || original.getChiTietTraHang() != null) throw conflict("thiet_bi_id");
    var payload = fields("thoi_diem", at.toString(), "hanh_dong_doi_soat", action);
    var extra = new LinkedHashMap<String, Object>();
    TheKho card = null;
    List<SoSerialSanPham> serials = new ArrayList<>();
    String message;
    switch (action) {
      case "GHI_NGHIA_VU" -> message = "Ghi nghĩa vụ bù hàng chưa thực nhận";
      case "GUI_THIET_BI_CU" -> {
        if (!original.getId().equals(input.get("thiet_bi_cu_id"))
            || !Objects.equals(
                history.id(value.get("nha_cung_cap_id")), input.get("nha_cung_cap_id")))
          throw conflict("thiet_bi_cu_id");
        if (!Boolean.TRUE.equals(value.get("nghia_vu_gui_thiet_bi_cu_con_mo"))) throw resolved();
        var custody = oldCustody(events, original.getId());
        requireCustody(custody, "CUA_HANG", null);
        var location =
            fields(
                "loai",
                "DANG_VAN_CHUYEN",
                "nha_cung_cap_id",
                value.get("nha_cung_cap_id"),
                "ten",
                input.get("ten_don_vi"),
                "thiet_bi_id",
                original.getId());
        payload.put("noi_dang_giu_thiet_bi_cu", location);
        payload.put(
            "gui_thiet_bi_cu",
            fields(
                "nghia_vu_lich_su_id",
                value.get("nghia_vu_lich_su_id"),
                "thiet_bi_cu_id",
                original.getId(),
                "nha_cung_cap_id",
                value.get("nha_cung_cap_id"),
                "ten_don_vi",
                input.get("ten_don_vi"),
                "phu_kien",
                input.get("phu_kien"),
                "thoi_diem",
                at.toString(),
                "chung_tu_urls",
                input.get("chung_tu_urls")));
        extra.put("noi_dang_giu_thiet_bi_cu", location);
        message = "Gửi thiết bị cũ sau khách đã nhận hàng đổi";
      }
      case "DON_VI_NHAN_THIET_BI_CU" -> {
        if (!Boolean.TRUE.equals(value.get("nghia_vu_gui_thiet_bi_cu_con_mo"))) throw resolved();
        Long sending = (Long) input.get("lan_gui_lich_su_id");
        var sent = history.object(source(events, sending).get("gui_thiet_bi_cu"));
        if (sent == null
            || !sending.equals(history.id(value.get("lan_gui_lich_su_id")))
            || !Objects.equals(
                history.id(sent.get("nghia_vu_lich_su_id")),
                history.id(value.get("nghia_vu_lich_su_id")))
            || !original.getId().equals(history.id(sent.get("thiet_bi_cu_id"))))
          throw conflict("lan_gui_lich_su_id");
        requireCustody(
            oldCustody(events, original.getId()),
            "DANG_VAN_CHUYEN",
            history.id(value.get("nha_cung_cap_id")));
        var location =
            fields(
                "loai",
                "DON_VI_BAO_HANH",
                "nha_cung_cap_id",
                value.get("nha_cung_cap_id"),
                "thiet_bi_id",
                original.getId());
        payload.put("noi_dang_giu_thiet_bi_cu", location);
        payload.put("don_vi_nhan_thiet_bi_cu", input);
        value.put("don_vi_da_nhan_thiet_bi_cu", true);
        value.put("nghia_vu_gui_thiet_bi_cu_con_mo", false);
        extra.put("noi_dang_giu_thiet_bi_cu", location);
        message =
            quantity(value.get("so_luong_can_bu")) == 0
                ? "Hoàn tất riêng nghĩa vụ gửi thiết bị cũ theo nguồn hãng"
                : "Đơn vị đã nhận thiết bị cũ, chưa bù hàng";
      }
      case "NHAN_THIET_BI_CU" -> {
        if (!original.getId().equals(input.get("thiet_bi_id"))) throw conflict("thiet_bi_id");
        requireCustody(
            oldCustody(events, original.getId()),
            "DON_VI_BAO_HANH",
            history.id(value.get("nha_cung_cap_id")));
        var location = fields("loai", "CUA_HANG", "thiet_bi_id", original.getId());
        payload.put("noi_dang_giu_thiet_bi_cu", location);
        payload.put("nhan_thiet_bi_cu", new LinkedHashMap<>(input));
        extra.putAll(
            fields(
                "noi_dang_giu_thiet_bi_cu", location, "quyen_so_huu", input.get("quyen_so_huu")));
        message = "Nhận thiết bị cũ, chưa xác định sở hữu nên chưa nhập tồn";
      }
      case "NHAN_HANG_BU" -> {
        requireOutstanding(value, (Integer) input.get("so_luong"));
        for (var event : events) {
          var pending = history.object(history.payload(event).get("hang_bu_thuc_nhan"));
          if (pending != null
              && Boolean.TRUE.equals(pending.get("cho_xac_minh"))
              && Objects.equals(
                  history.id(pending.get("nghia_vu_lich_su_id")),
                  history.id(value.get("nghia_vu_lich_su_id"))))
            throw conflict("nghia_vu_lich_su_id");
        }
        if (!Objects.equals(history.id(value.get("phien_ban_id")), input.get("phien_ban_id")))
          throw conflict("phien_ban_id");
        if (!"CUA_HANG".equals(input.get("quyen_so_huu"))) throw ownership();
        var variant = items.receivedVariant((Long) input.get("phien_ban_id"));
        List<String> codes = codes(input, variant);
        repository.lockSerialRegistry();
        for (String code : codes)
          if (items.serialExists(code) || repository.pendingSerial(code)) throw conflict("serials");
        int bad = (Integer) input.get("so_luong_can_xu_ly");
        if (bad > 0) {
          // Tạm hỗ trợ F14 theo xác nhận: lời khai của client không thay quyết định chấp nhận hàng
          // lỗi.
          payload.put(
              "hang_bu_thuc_nhan",
              fields(
                  "nghia_vu_lich_su_id",
                  value.get("nghia_vu_lich_su_id"),
                  "phien_ban_id",
                  variant.getId(),
                  "serials",
                  codes,
                  "so_luong",
                  input.get("so_luong"),
                  "tinh_trang",
                  input.get("tinh_trang"),
                  "cho_xac_minh",
                  true,
                  "du_lieu_khai_bao",
                  input));
          extra.putAll(
              fields(
                  "quyen_so_huu",
                  "CHUA_XAC_DINH",
                  "hang_thuc_nhan",
                  fields(
                      "phien_ban_id",
                      variant.getId(),
                      "serials",
                      codes,
                      "so_luong",
                      input.get("so_luong"),
                      "tinh_trang",
                      input.get("tinh_trang")),
                  "co_the_chot_bu",
                  false,
                  "canh_bao",
                  List.of(
                      "Đã lưu vật thực nhận; căn cứ sở hữu/điều kiện chấp nhận bù chưa được xác minh")));
          message = "Lưu nhận hàng bù lỗi đang chờ xác minh, chưa nhập/chốt";
        } else {
          var stock = items.stockForVariant(variant.getId());
          validateStock(stock);
          for (String code : codes) {
            var serial = items.createSerial(variant, code);
            serial.setTrangThai(TrangThaiSerial.TRONG_KHO);
            serials.add(serial);
          }
          int quantity = (Integer) input.get("so_luong");
          stock.setTonThucTe(Math.addExact(stock.getTonThucTe(), quantity));
          stock.setTonCoTheBan(Math.addExact(stock.getTonCoTheBan(), quantity));
          card = repository.receipt(ticket, stock, quantity, at.toLocalDateTime());
          value.put("so_luong_da_bu", quantity(value.get("so_luong_da_bu")) + quantity);
          payload.put(
              "nhan_hang_bu",
              fields("du_lieu", input, "the_kho_id", card.getId(), "so_luong", quantity));
          extra.putAll(
              fields(
                  "quyen_so_huu",
                  "CUA_HANG",
                  "bien_dong_ton",
                  delta(quantity, quantity, 0),
                  "phan_loai",
                  fields("so_luong_ban_lai", quantity, "so_luong_can_xu_ly", 0)));
          message =
              !Boolean.TRUE.equals(variant.getCoQuanLySerial())
                  ? "Nhận hàng bù không serial"
                  : Boolean.TRUE.equals(value.get("nghia_vu_gui_thiet_bi_cu_con_mo"))
                      ? "Bù hàng đủ nhưng còn nghĩa vụ gửi thiết bị cũ"
                      : "Nhận đủ hàng bù thuộc cửa hàng, nhập tồn bán";
        }
      }
      case "CHOT_PHUONG_AN_KHAC" -> {
        int quantity = (Integer) input.get("so_luong_quy_doi_duoc_chot");
        requireOutstanding(value, quantity);
        if ("THIET_BI_CU_LAM_HANG_BU".equals(input.get("hinh_thuc_doi_soat"))) {
          Long receipt = (Long) input.get("nhan_thiet_bi_cu_lich_su_id");
          var recorded = history.object(source(events, receipt).get("nhan_thiet_bi_cu"));
          if (recorded == null
              || !receipt.equals(history.id(value.get("nhan_thiet_bi_cu_lich_su_id")))
              || !Objects.equals(
                  history.id(recorded.get("nghia_vu_lich_su_id")),
                  history.id(value.get("nghia_vu_lich_su_id"))))
            throw conflict("nhan_thiet_bi_cu_lich_su_id");
          requireCustody(oldCustody(events, original.getId()), "CUA_HANG", null);
          if (ticket.getTrangThaiXuLy() != TrangThaiBaoHanh.HOAN_TAT
              || ticket.getKetQuaXuLy() != KetQuaXuLyBaoHanh.DOI_SAN_PHAM
              || events.stream().noneMatch(e -> "HANDOVER".equals(e.getLoaiSuKien())))
            throw conflict("thiet_bi_id");
          if (!original.getId().equals(input.get("thiet_bi_id"))
              || !original.getPhienBan().getId().equals(input.get("phien_ban_id"))
              || quantity != 1
              || !Integer.valueOf(1).equals(input.get("so_luong"))
              || !Integer.valueOf(1).equals(input.get("so_luong_ban_lai"))
              || !Integer.valueOf(0).equals(input.get("so_luong_can_xu_ly"))
              || !"CUA_HANG".equals(input.get("quyen_so_huu"))) throw ownership();
          var stock = items.stockForVariant(original.getPhienBan().getId());
          validateStock(stock);
          if (original.getSoSerial() != null) {
            var serial = items.selectedSerial(original.getSoSerial().getId());
            if (serial.getTrangThai() != TrangThaiSerial.DA_THAY_THE_BAO_HANH)
              throw conflict("thiet_bi_id");
            serial.setTrangThai(TrangThaiSerial.TRONG_KHO);
            serial.setDonHang(null);
            serial.setNgayKichHoat(null);
            serial.setHanBaoHanh(null);
            serials.add(serial);
          }
          stock.setTonThucTe(Math.addExact(stock.getTonThucTe(), 1));
          stock.setTonCoTheBan(Math.addExact(stock.getTonCoTheBan(), 1));
          card = repository.receipt(ticket, stock, 1, at.toLocalDateTime());
          value.put("so_luong_da_bu", quantity(value.get("so_luong_da_bu")) + 1);
          value.put("thiet_bi_cu_da_nhap_bu", true);
          extra.putAll(
              fields(
                  "thiet_bi_cu_id",
                  original.getId(),
                  "quyen_so_huu",
                  "CUA_HANG",
                  "nhan_thiet_bi_cu_lich_su_id",
                  receipt,
                  "bien_dong_ton",
                  delta(1, 1, 0),
                  "quyen_bao_hanh_giao_dich_cu_cua_thiet_bi",
                  false));
          message = "Dùng thiết bị cũ đã nhận làm khoản bù có phê duyệt";
        } else {
          value.put(
              "so_luong_quy_doi_sang_tien",
              quantity(value.get("so_luong_quy_doi_sang_tien")) + quantity);
          value.put(
              "so_tien_nghia_vu",
              amount(value.get("so_tien_nghia_vu"))
                  .add((BigDecimal) input.get("so_tien_nghia_vu")));
          extra.put("phieu_thu_chi_id", null);
          message = "Chuyển nghĩa vụ hàng sang bù tiền, chưa ghi thu";
        }
        payload.put(
            "quyet_dinh_doi_soat",
            fields("du_lieu", input, "nguoi_phe_duyet_id", actorId, "thoi_diem", at.toString()));
        extra.putAll(fields("nguoi_phe_duyet_id", actorId, "so_luong_quy_doi_duoc_chot", quantity));
      }
      case "GHI_NCC_TU_CHOI" -> {
        long remaining = quantity(value.get("so_luong_con_bu"));
        if (remaining == 0 || amount(value.get("so_tien_nghia_vu")).signum() > 0) throw resolved();
        value.put(
            "so_luong_ket_thuc_theo_quyet_dinh",
            quantity(value.get("so_luong_ket_thuc_theo_quyet_dinh")) + remaining);
        value.put("ncc_tu_choi", true);
        value.put("nghia_vu_gui_thiet_bi_cu_con_mo", false);
        value.put("nghia_vu_gui_ket_thuc_theo_quyet_dinh", true);
        value.put("quyet_dinh_xu_ly", input.get("quyet_dinh_xu_ly"));
        payload.put("quyet_dinh_doi_soat", fields("du_lieu", input, "nguoi_phe_duyet_id", actorId));
        extra.putAll(
            fields("nguoi_phe_duyet_id", actorId, "so_tien_phat_sinh_khach", BigDecimal.ZERO));
        message = "Chốt phương án cửa hàng chịu khi nhà cung cấp từ chối bù";
      }
      default -> throw WarrantySupplierSettlementValidation.invalid();
    }
    value.put("thoi_diem_cap_nhat", at.toString());
    refresh(value);
    payload.put("doi_soat_nha_cung_cap", value);
    payload.put("chung_tu_urls", input.get("chung_tu_urls"));
    var event =
        workflow.append(ticket, actorId, action, message, mapper.writeValueAsString(payload));
    if (event == null || event.getId() == null) throw invalid();
    if (action.equals("GHI_NGHIA_VU")) value.put("nghia_vu_lich_su_id", event.getId());
    if (action.equals("GUI_THIET_BI_CU")) value.put("lan_gui_lich_su_id", event.getId());
    if (action.equals("NHAN_THIET_BI_CU")) {
      value.put("nhan_thiet_bi_cu_lich_su_id", event.getId());
      extra.put("nhan_thiet_bi_cu_lich_su_id", event.getId());
    }
    event.setDuLieuChiTiet(mapper.writeValueAsString(payload));
    repository.flush();
    var response = new AdminWarrantySupplierSettlementResponse();
    response.putAll(value);
    response.remove("phien_ban_du_lieu");
    response.putAll(
        fields(
            "phieu_bao_hanh_id",
            id,
            "trang_thai_xu_ly",
            ticket.getTrangThaiXuLy(),
            "hanh_dong",
            action,
            "the_kho",
            card == null
                ? null
                : fields(
                    "id",
                    card.getId(),
                    "loai_giao_dich",
                    card.getLoaiGiaoDich(),
                    "kho_hang_id",
                    card.getKhoHang().getId(),
                    "phien_ban_id",
                    card.getPhienBan().getId(),
                    "so_luong_thay_doi",
                    card.getSoLuongThayDoi()),
            "bien_dong_ton",
            delta(0, 0, 0),
            "lich_su_id",
            event.getId()));
    if (action.equals("GUI_THIET_BI_CU")) response.put("lan_gui_lich_su_id", event.getId());
    if (action.equals("NHAN_HANG_BU")) response.put("lich_su_nhan_id", event.getId());
    if (action.equals("NHAN_HANG_BU") || card != null)
      response.put(
          "serials",
          serials.stream()
              .map(
                  s ->
                      fields(
                          "id",
                          s.getId(),
                          "so_serial",
                          s.getSoSerial(),
                          "trang_thai",
                          s.getTrangThai(),
                          "don_hang_id",
                          s.getDonHang() == null ? null : s.getDonHang().getId()))
              .toList());
    if (List.of("GUI_THIET_BI_CU", "DON_VI_NHAN_THIET_BI_CU", "NHAN_THIET_BI_CU")
        .contains(action)) {
      response.put("thiet_bi_cu_id", original.getId());
      response.put(
          "trang_thai_serial_cu",
          original.getSoSerial() == null ? null : original.getSoSerial().getTrangThai());
    }
    response.putAll(extra);
    return mutations.complete(replay, 200, message, response);
  }

  private Map<String, Object> register(
      PhieuBaoHanh ticket,
      Map<String, Object> input,
      List<LichSuBaoHanh> events,
      Map<Long, Map<String, Object>> obligations,
      OffsetDateTime at) {
    var versions = plans.versions(events);
    if (versions.isEmpty()) throw conflict("giao_dich_xuat_the_kho_id");
    var plan = versions.lastEntry().getValue();
    if (!Boolean.TRUE.equals(plan.get("da_duyet"))
        || !Boolean.TRUE.equals(plan.get("khach_dong_y"))
        || Boolean.TRUE.equals(plan.get("da_huy"))
        || plan.get("phe_duyet") == null
        || plan.get("quyet_dinh") == null) throw conflict("giao_dich_xuat_the_kho_id");
    var consent = history.object(plan.get("quyet_dinh"));
    var consentAt = history.time(consent.get("thoi_diem"));
    if (consentAt == null || at.isBefore(consentAt)) throw conflict("thoi_diem");
    var state = resources.state(ticket, plan, events);
    Long issueId = (Long) input.get("giao_dich_xuat_the_kho_id");
    boolean shop = "TON_KHO_CUA_HANG".equals(plan.get("nguon"));
    int required = (Integer) input.get("so_luong_can_bu");
    if (shop) {
      if (issueId == null || required != 1) throw WarrantySupplierSettlementValidation.invalid();
      var issue = repository.issue(issueId);
      if (issue.getPhieuBaoHanh() == null
          || !ticket.getId().equals(issue.getPhieuBaoHanh().getId())
          || issue.getLoaiGiaoDich() != LoaiGiaoDichKho.XUAT_DOI_BAO_HANH
          || !Integer.valueOf(-1).equals(issue.getSoLuongThayDoi())
          || state.issue() == null
          || !issueId.equals(state.issue().getId())
          || state.replacement() == null
          || Boolean.TRUE.equals(plan.get("da_hoan_xuat")))
        throw conflict("giao_dich_xuat_the_kho_id");
    } else if (!"DON_VI_BAO_HANH".equals(plan.get("nguon"))
        || issueId != null
        || required != 0
        || state.replacement() == null) throw conflict("giao_dich_xuat_the_kho_id");
    for (var existing : obligations.values())
      if (issueId != null
          ? issueId.equals(history.id(existing.get("giao_dich_xuat_the_kho_id")))
          : history
              .id(plan.get("phien_ban"))
              .equals(history.id(existing.get("phien_ban_phuong_an")))) throw resolved();
    Long supplier = (Long) input.get("nha_cung_cap_id");
    items.supplier(supplier);
    var custody = oldCustody(events, ticket.getThietBi().getId());
    boolean delivered =
        custody != null
            && "DON_VI_BAO_HANH".equals(custody.get("loai"))
            && supplier.equals(history.id(custody.get("nha_cung_cap_id")));
    return fields(
        "phien_ban_du_lieu",
        1,
        "nghia_vu_lich_su_id",
        null,
        "nha_cung_cap_id",
        supplier,
        "giao_dich_xuat_the_kho_id",
        issueId,
        "phien_ban_phuong_an",
        history.id(plan.get("phien_ban")),
        "phien_ban_id",
        history.id(plan.get("phien_ban_thay_the_id")),
        "thiet_bi_cu_id",
        ticket.getThietBi().getId(),
        "loai_nghia_vu",
        shop ? "BU_HANG" : "GUI_THIET_BI_CU",
        "da_xac_nhan",
        true,
        "can_cu",
        input.get("can_cu"),
        "chung_tu_urls",
        input.get("chung_tu_urls"),
        "so_luong_can_bu",
        required,
        "so_luong_da_bu",
        0,
        "so_luong_con_bu",
        required,
        "so_luong_quy_doi_sang_tien",
        0,
        "so_luong_ket_thuc_theo_quyet_dinh",
        0,
        "so_luong_huy_do_hoan_xuat",
        0,
        "so_tien_nghia_vu",
        BigDecimal.ZERO,
        "so_tien_da_nhan",
        BigDecimal.ZERO,
        "so_tien_con_doi_soat",
        BigDecimal.ZERO,
        "nghia_vu_gui_thiet_bi_cu_con_mo",
        !delivered,
        "don_vi_da_nhan_thiet_bi_cu",
        delivered,
        "thoi_diem_cap_nhat",
        at.toString(),
        "da_giai_quyet",
        false);
  }

  private Map<String, Object> source(List<LichSuBaoHanh> events, Long id) {
    return history.payload(
        events.stream()
            .filter(e -> id.equals(e.getId()))
            .findFirst()
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.NOT_FOUND, "lich_su_id", "SUPPLIER_SOURCE_NOT_FOUND")));
  }

  private Map<String, Object> oldCustody(List<LichSuBaoHanh> events, Long device) {
    var old = history.latestSection(events, "noi_dang_giu_thiet_bi_cu");
    if (old != null) return device.equals(history.id(old.get("thiet_bi_id"))) ? old : null;
    var current = history.latestSection(events, "noi_dang_giu");
    return current != null && device.equals(history.id(current.get("thiet_bi_id")))
        ? current
        : null;
  }

  private void requireCustody(Map<String, Object> custody, String type, Long supplier) {
    if (custody == null
        || !type.equals(custody.get("loai"))
        || supplier != null && !supplier.equals(history.id(custody.get("nha_cung_cap_id"))))
      throw conflict("thiet_bi_cu_id");
  }

  private List<String> codes(Map<String, Object> input, PhienBanSanPham variant) {
    List<String> values = history.array(input.get("serials")).stream().map(history::text).toList();
    if (Boolean.TRUE.equals(variant.getCoQuanLySerial())
        ? values.size() != (Integer) input.get("so_luong")
        : !values.isEmpty()) throw WarrantySupplierSettlementValidation.invalid();
    return values;
  }

  private static void requireOutstanding(Map<String, Object> value, long requested) {
    long left = quantity(value.get("so_luong_con_bu"));
    if (left == 0) throw resolved();
    if (requested > left) throw conflict("so_luong");
  }

  private static void validateStock(TonKho stock) {
    if (stock.getTonThucTe() == null
        || stock.getTonCoTheBan() == null
        || stock.getHangLoi() == null
        || stock.getSoLuongGiuChoBaoHanh() == null
        || stock.getTonThucTe() < 0
        || stock.getTonCoTheBan() < 0
        || stock.getHangLoi() < 0
        || stock.getSoLuongGiuChoBaoHanh() < 0
        || (long) stock.getTonCoTheBan() + stock.getHangLoi() + stock.getSoLuongGiuChoBaoHanh()
            > stock.getTonThucTe()) throw invalid();
  }

  private static Map<String, Object> delta(int physical, int sellable, int faulty) {
    return fields("ton_thuc_te", physical, "ton_co_the_ban", sellable, "hang_loi", faulty);
  }

  static WarrantyReadException conflict(String field) {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_CONFLICT, field, "SUPPLIER_SETTLEMENT_CONFLICT");
  }

  static WarrantyReadException resolved() {
    return WarrantyReadException.of(
        ErrorCode.SUPPLIER_SETTLEMENT_ALREADY_RESOLVED,
        "nghia_vu_lich_su_id",
        "SUPPLIER_SETTLEMENT_ALREADY_RESOLVED");
  }

  private static WarrantyReadException ownership() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_SUPPLIER_OWNERSHIP_UNVERIFIED,
        "quyen_so_huu",
        "SUPPLIER_OWNERSHIP_UNVERIFIED");
  }
}
