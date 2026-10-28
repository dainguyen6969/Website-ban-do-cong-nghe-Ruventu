package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.invalidHistory;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyReplacementItemsResponse;
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
public class WarrantyReplacementItemsTransactions {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyReplacementRepository replacements;
  private final WarrantyReplacementItemsRepository repository;
  private final WarrantyReplacementResources resources;
  private final WarrantyReplacementTransactions plans;
  private final WarrantyMutationSupport mutations;
  private final WarrantyDetailRepository details;
  private final ObjectMapper mapper;
  private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyReplacementItemsResponse> apply(
      Long id, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-ITEM-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/" + id + "/replacement-items",
            input,
            AdminWarrantyReplacementItemsResponse.class,
            WarrantyReplacementItemsValidation.INVALID);
    if (replay.previous() != null) return replay.previous();
    var origin = workflow.ticketOrigin(id);
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    var ticket = workflow.lockTicket(id);
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT
        || ticket.getKetQuaXuLy() == KetQuaXuLyBaoHanh.DOI_SAN_PHAM
        || events.stream().anyMatch(e -> "HANDOVER".equals(e.getLoaiSuKien()))) throw handedOver();
    if (ticket.getThietBi() == null
        || ticket.getDonHang() == null
        || !origin.orderId().equals(ticket.getDonHang().getId())
        || !origin.lineId().equals(ticket.getThietBi().getChiTietDonHang().getId()))
      throw invalidHistory();
    var original = locks.lockDevice(ticket.getThietBi().getId());
    if (original.getChiTietTraHang() != null) throw conflict("thiet_bi_id");
    if (original.getSoSerial() != null
        && locks.lockSerial(original.getSoSerial().getId()).getTrangThai()
            != TrangThaiSerial.DANG_BAO_HANH) throw conflict("thiet_bi_id");
    var versions = plans.versions(events);
    if (versions.isEmpty()) throw versionMissing();
    var plan = new LinkedHashMap<>(versions.lastEntry().getValue());
    Long version = history.id(plan.get("phien_ban"));
    if (Boolean.TRUE.equals(plan.get("da_ban_giao"))) throw handedOver();
    if (!original.getId().equals(history.id(plan.get("thiet_bi_cu_id")))) throw invalidHistory();
    if (input.get("phien_ban_phuong_an") != null
        && !versions.containsKey(((Long) input.get("phien_ban_phuong_an")).intValue()))
      throw versionMissing();
    if (input.get("phien_ban_phuong_an") != null
        && !version.equals(input.get("phien_ban_phuong_an"))) throw conflict("phien_ban_phuong_an");
    String action = input.get("hanh_dong").toString(), source = history.text(plan.get("nguon"));
    boolean recovery =
        action.equals("HOAN_XUAT_HANG_DOI") || action.equals("TRA_HANG_CAP_RIENG_DON_VI");
    OffsetDateTime at =
        input.get("thoi_diem") == null
            ? OffsetDateTime.now(VN)
            : (OffsetDateTime) input.get("thoi_diem");
    if (!Set.of("TON_KHO_CUA_HANG", "DON_VI_BAO_HANH").contains(Objects.toString(source, "")))
      throw invalidHistory();
    if (recovery) {
      if (!Boolean.TRUE.equals(plan.get("da_huy"))) throw conflict("hanh_dong");
    } else requireApproved(ticket, events, plan, at);
    validateTime(ticket, events, at, plan);
    var state = resources.state(ticket, plan, events);
    var settlementSnapshots = new WarrantySupplierSettlementSnapshots(history);
    var settlements = settlementSnapshots.load(events);
    if (action.equals("HOAN_XUAT_HANG_DOI")) {
      for (var settlement : settlements.values()) {
        if (state.issue() == null
            || !state
                .issue()
                .getId()
                .equals(history.id(settlement.get("giao_dich_xuat_the_kho_id")))) continue;
        settlementSnapshots.reconcileMoney(settlement, events, details.findPostedMoney(id));
        if (WarrantySupplierSettlementSnapshots.quantity(settlement.get("so_luong_da_bu")) > 0
            || WarrantyQuoteSnapshots.amount(settlement.get("so_tien_nghia_vu")).signum() > 0)
          throw WarrantySupplierSettlementTransactions.conflict("giao_dich_xuat_the_kho_id");
      }
    }
    var before = ticket.getTrangThaiXuLy();
    var payload =
        fields(
            "thoi_diem",
            at.toString(),
            "hanh_dong_hang_doi",
            action,
            "phuong_an_doi",
            plan,
            "san_sang_tra",
            null);
    var extra = new LinkedHashMap<String, Object>();
    var delta = delta(0, 0, 0, 0);
    TheKho card = null;
    SoSerialSanPham serial = null;
    ThietBiBaoHanh device = state.replacement();
    List<Map<String, Object>> differences = new ArrayList<>();
    String message;
    switch (action) {
      case "GIU_CHO_HANG_CUA_HANG" -> {
        requireSource(source, "TON_KHO_CUA_HANG");
        if (state.hasResources() || Boolean.TRUE.equals(plan.get("da_hoan_xuat")))
          throw conflict("phien_ban_phuong_an");
        var variant = replacements.activeVariant(history.id(plan.get("phien_ban_thay_the_id")));
        var stock = repository.stockForVariant(variant.getId());
        validateStock(stock);
        validateOwners(stock, null, null, null);
        if (stock.getTonCoTheBan() < 1) throw stockUnavailable();
        Long serialId = (Long) input.get("so_serial_id");
        if (Boolean.TRUE.equals(variant.getCoQuanLySerial())) {
          if (serialId == null) throw WarrantyReplacementItemsValidation.invalid();
          serial = repository.selectedSerial(serialId);
          if (serial.getPhienBan() == null
              || !variant.getId().equals(serial.getPhienBan().getId())
              || serial.getTrangThai() != TrangThaiSerial.TRONG_KHO
              || serial.getDonHang() != null
              || serial.getNgayKichHoat() != null
              || serial.getHanBaoHanh() != null
              || repository.serialHasPendingDevice(serialId)
              || replacements.serialHeldByAnotherPlan(serialId, id, version))
            throw stockUnavailable();
        } else if (serialId != null || !variant.getId().equals(input.get("phien_ban_id")))
          throw WarrantyReplacementItemsValidation.invalid();
        stock.setTonCoTheBan(stock.getTonCoTheBan() - 1);
        stock.setSoLuongGiuChoBaoHanh(Math.addExact(stock.getSoLuongGiuChoBaoHanh(), 1));
        if (serial != null) serial.setTrangThai(TrangThaiSerial.GIU_CHO_BAO_HANH);
        var hold =
            fields(
                "phien_ban_phuong_an",
                version,
                "ton_kho_id",
                stock.getId(),
                "kho_hang_id",
                stock.getKhoHang().getId(),
                "phien_ban_id",
                variant.getId(),
                "so_luong",
                1,
                "so_serial_id",
                serialId,
                "dang_giu",
                true);
        payload.put("giu_cho_hang_doi", hold);
        plan.put("da_giu_cho", true);
        delta = delta(0, -1, 0, 1);
        extra.put("ton_sau", stockValues(stock));
        if (serial == null)
          extra.putAll(fields("phien_ban_id", variant.getId(), "so_luong_giu_cho", 1));
        message =
            serial == null
                ? "Giữ hàng không serial cho phương án đã duyệt"
                : "Giữ serial cửa hàng cho phương án đã duyệt";
      }
      case "XUAT_HANG_DOI" -> {
        requireSource(source, "TON_KHO_CUA_HANG");
        if (!state.held() || state.issue() != null || device != null)
          throw conflict("giu_cho_lich_su_id");
        var hold = new LinkedHashMap<>(state.hold());
        if (!input.get("giu_cho_lich_su_id").equals(history.id(hold.get("giu_cho_lich_su_id"))))
          throw conflict("giu_cho_lich_su_id");
        var variant = replacements.activeVariant(history.id(plan.get("phien_ban_thay_the_id")));
        var stock = replacements.stock(history.id(hold.get("ton_kho_id")));
        validateStock(stock);
        validateHold(stock, hold, variant.getId());
        validateOwners(stock, id, version, history.id(hold.get("so_serial_id")));
        Long serialId = history.id(hold.get("so_serial_id"));
        if (Boolean.TRUE.equals(variant.getCoQuanLySerial()) != (serialId != null))
          throw invalidHistory();
        if (serialId != null) {
          serial = repository.selectedSerial(serialId);
          requireHeldSerial(serial, variant.getId());
        } else if (input.get("dau_hieu_nhan_dang") == null)
          throw WarrantyReplacementItemsValidation.invalid();
        stock.setTonThucTe(stock.getTonThucTe() - 1);
        stock.setSoLuongGiuChoBaoHanh(stock.getSoLuongGiuChoBaoHanh() - 1);
        card =
            repository.ledger(
                ticket, stock, LoaiGiaoDichKho.XUAT_DOI_BAO_HANH, -1, at.toLocalDateTime());
        device =
            repository.createDevice(
                ticket, variant, serial, (String) input.get("dau_hieu_nhan_dang"));
        ticket.setThietBiThayThe(device);
        hold.put("dang_giu", false);
        payload.put("giu_cho_hang_doi", hold);
        var issued =
            fields(
                "phien_ban_phuong_an",
                version,
                "giao_dich_xuat_the_kho_id",
                card.getId(),
                "giu_cho_lich_su_id",
                input.get("giu_cho_lich_su_id"),
                "thiet_bi_id",
                device.getId(),
                "ton_kho_id",
                stock.getId(),
                "kho_hang_id",
                stock.getKhoHang().getId(),
                "phien_ban_id",
                variant.getId(),
                "so_serial_id",
                serialId,
                "dau_hieu_nhan_dang",
                device.getDauHieuNhanDang());
        payload.put("xuat_hang_doi", issued);
        plan.putAll(
            fields(
                "da_giu_cho",
                false,
                "da_xuat",
                true,
                "giao_dich_xuat_the_kho_id",
                card.getId(),
                "thiet_bi_thay_the_id",
                device.getId()));
        ticket.setTrangThaiXuLy(TrangThaiBaoHanh.CHO_DOI_SAN_PHAM);
        custody(payload, ticket, events, device, at, "CUA_HANG");
        delta = delta(-1, 0, 0, -1);
        extra.putAll(
            fields(
                "giu_cho_lich_su_id",
                input.get("giu_cho_lich_su_id"),
                "ton_sau",
                stockValues(stock)));
        if (serial == null)
          extra.putAll(
              fields(
                  "ma_theo_doi",
                  device.getMaTheoDoi(),
                  "dau_hieu_nhan_dang",
                  device.getDauHieuNhanDang()));
        message =
            serial == null
                ? "Xuất hàng không serial cho phương án đổi"
                : "Xuất hàng đổi từ nguồn cửa hàng";
      }
      case "NHAN_HANG_DON_VI" -> {
        requireSource(source, "DON_VI_BAO_HANH");
        if (state.hasResources()) throw conflict("phien_ban_phuong_an");
        repository.supplier((Long) input.get("nha_cung_cap_id"));
        var actual = repository.receivedVariant((Long) input.get("phien_ban_thuc_nhan_id"));
        String rawSerial = (String) input.get("so_serial_thuc_nhan"),
            identification = (String) input.get("dau_hieu_nhan_dang");
        boolean matching = actual.getId().equals(history.id(plan.get("phien_ban_thay_the_id")));
        if (matching && Boolean.TRUE.equals(actual.getCoQuanLySerial()) && rawSerial == null
            || matching
                && !Boolean.TRUE.equals(actual.getCoQuanLySerial())
                && (rawSerial != null || identification == null))
          throw WarrantyReplacementItemsValidation.invalid();
        if (rawSerial == null && identification == null)
          throw WarrantyReplacementItemsValidation.invalid();
        if (rawSerial != null && repository.serialExists(rawSerial))
          throw conflict("so_serial_thuc_nhan");
        // Không nhận lại cùng một lần giao nhận bằng khóa khác để che việc ghi trùng.
        for (var event : events) {
          var receipt = history.object(history.payload(event).get("nhan_hang_don_vi"));
          if (receipt != null
              && version.equals(history.id(receipt.get("phien_ban_phuong_an")))
              && Objects.equals(receipt.get("so_serial_thuc_nhan"), rawSerial)
              && Objects.equals(receipt.get("dau_hieu_nhan_dang"), identification))
            throw conflict("so_serial_thuc_nhan");
        }
        differences.addAll(differences(input));
        if (differences.stream()
            .anyMatch(d -> Set.of("SAI_PHIEN_BAN", "SAI_THIET_BI").contains(d.get("loai"))))
          matching = false;
        if (!matching)
          addDifference(
              differences,
              "SAI_PHIEN_BAN",
              "Phiên bản thực nhận không đúng phương án đã được duyệt");
        if (!accessories(plan.get("phu_kien")).equals(accessories(input.get("phu_kien"))))
          addDifference(
              differences, "THIEU_PHU_KIEN", "Phụ kiện thực nhận chưa khớp phương án đã duyệt");
        if (!Objects.equals(history.text(plan.get("tinh_trang_hang")), input.get("tinh_trang")))
          addDifference(
              differences,
              "KHAC_TINH_TRANG",
              "Tình trạng thực nhận cần được đối chiếu lại với phương án");
        if (matching) {
          if (rawSerial != null) serial = repository.createSerial(actual, rawSerial);
          device = repository.createDevice(ticket, actual, serial, identification);
          ticket.setThietBiThayThe(device);
          plan.putAll(
              fields(
                  "thiet_bi_thay_the_id",
                  device.getId(),
                  "nha_cung_cap_id",
                  input.get("nha_cung_cap_id")));
          ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DA_NHAN_LAI);
          custody(payload, ticket, events, device, at, "CUA_HANG");
        } else ticket.setTrangThaiXuLy(TrangThaiBaoHanh.CHO_DOI_SAN_PHAM);
        var receipt = new LinkedHashMap<>(input);
        receipt.remove("hanh_dong");
        receipt.putAll(
            fields(
                "thiet_bi_id",
                device == null ? null : device.getId(),
                "da_cap_cho_phuong_an",
                matching));
        payload.put("nhan_hang_don_vi", receipt);
        payload.put(
            "giao_nhan",
            fields("thiet_bi_id", device == null ? null : device.getId(), "sai_lech", differences));
        extra.putAll(
            fields(
                "da_nhan_lai_thiet_bi_cu",
                false,
                "hang_thuc_nhan",
                fields(
                    "thiet_bi_id",
                    device == null ? null : device.getId(),
                    "phien_ban_id",
                    actual.getId(),
                    "so_serial",
                    rawSerial,
                    "tinh_trang",
                    input.get("tinh_trang"),
                    "phu_kien",
                    input.get("phu_kien")),
                "sai_lech",
                differences));
        payload.put(
            "vat_thuc_nhan",
            fields("noi_luu", "CUA_HANG", "hang_thuc_nhan", extra.get("hang_thuc_nhan")));
        if (device != null && serial == null) {
          extra.put("ma_theo_doi", device.getMaTheoDoi());
          var actualView = new LinkedHashMap<>(history.object(extra.get("hang_thuc_nhan")));
          actualView.putAll(
              fields("ma_theo_doi", device.getMaTheoDoi(), "dau_hieu_nhan_dang", identification));
          extra.put("hang_thuc_nhan", actualView);
          payload.put("vat_thuc_nhan", fields("noi_luu", "CUA_HANG", "hang_thuc_nhan", actualView));
        }
        message =
            !matching
                ? "Ghi thực nhận sai phiên bản, chưa cấp cho phương án"
                : !differences.isEmpty()
                    ? "Ghi thực nhận hàng đơn vị cấp, còn sai lệch cần xử lý"
                    : serial == null
                        ? "Nhận hàng không serial do đơn vị cấp riêng"
                        : "Nhận sản phẩm do đơn vị bảo hành cấp riêng";
      }
      case "HOAN_XUAT_HANG_DOI" -> {
        requireSource(source, "TON_KHO_CUA_HANG");
        if (Boolean.TRUE.equals(plan.get("da_hoan_xuat")))
          throw conflict("giao_dich_xuat_the_kho_id");
        if (state.issue() == null)
          throw WarrantyReadException.notFound(
              ErrorCode.NOT_FOUND, "giao_dich_xuat_the_kho_id", "REPLACEMENT_ISSUE_NOT_FOUND");
        if (!state.issue().getId().equals(input.get("giao_dich_xuat_the_kho_id"))
            || device == null
            || Boolean.TRUE.equals(plan.get("da_hoan_xuat")))
          throw conflict("giao_dich_xuat_the_kho_id");
        locks.lockDevice(device.getId());
        if (device.getSoSerial() != null) {
          serial = repository.selectedSerial(device.getSoSerial().getId());
          requireHeldSerial(serial, device.getPhienBan().getId());
        }
        if (serial != null && input.get("so_serial_thuc_nhan") == null
            || serial == null && input.get("dau_hieu_nhan_dang") == null
            || serial == null && input.get("so_serial_thuc_nhan") != null)
          throw WarrantyReplacementItemsValidation.invalid();
        boolean matches =
            serial != null
                ? serial.getSoSerial().equals(input.get("so_serial_thuc_nhan"))
                : Objects.equals(device.getDauHieuNhanDang(), input.get("dau_hieu_nhan_dang"));
        if (!matches) {
          addDifference(
              differences, "SAI_THIET_BI", "Thiết bị thực nhận không phải thiết bị đã xuất đổi");
          var receipt = new LinkedHashMap<>(input);
          receipt.put("thiet_bi_id", null);
          payload.put("nhan_hoan_xuat", receipt);
          payload.put("giao_nhan", fields("thiet_bi_id", null, "sai_lech", differences));
          extra.putAll(
              fields(
                  "hang_thuc_nhan",
                  fields(
                      "thiet_bi_id",
                      null,
                      "so_serial",
                      input.get("so_serial_thuc_nhan"),
                      "dau_hieu_nhan_dang",
                      input.get("dau_hieu_nhan_dang"),
                      "so_luong",
                      1),
                  "da_hoan_xuat",
                  false,
                  "sai_lech",
                  differences));
          payload.put(
              "vat_thuc_nhan",
              fields("noi_luu", "CUA_HANG", "hang_thuc_nhan", extra.get("hang_thuc_nhan")));
          message = "Ghi thực nhận sai thiết bị, chưa hoàn xuất tồn";
        } else {
          var hold = state.hold();
          if (hold == null) throw invalidHistory();
          var stock = replacements.stock(history.id(hold.get("ton_kho_id")));
          validateStock(stock);
          validateHold(stock, hold, device.getPhienBan().getId());
          if (!stock.getKhoHang().getId().equals(state.issue().getKhoHang().getId()))
            throw invalidHistory();
          int good = (Integer) input.get("so_luong_ban_lai"),
              bad = (Integer) input.get("so_luong_can_xu_ly");
          stock.setTonThucTe(Math.addExact(stock.getTonThucTe(), 1));
          stock.setTonCoTheBan(Math.addExact(stock.getTonCoTheBan(), good));
          stock.setHangLoi(Math.addExact(stock.getHangLoi(), bad));
          if (serial != null)
            serial.setTrangThai(good == 1 ? TrangThaiSerial.TRONG_KHO : TrangThaiSerial.LOI);
          card =
              repository.ledger(
                  ticket, stock, LoaiGiaoDichKho.HOAN_XUAT_DOI_BAO_HANH, 1, at.toLocalDateTime());
          plan.putAll(
              fields(
                  "da_hoan_xuat",
                  true,
                  "dang_ap_dung_cho_phuong_an",
                  false,
                  "thiet_bi_da_thu_hoi_id",
                  device.getId()));
          for (var settlement : settlements.values()) {
            if (!state
                .issue()
                .getId()
                .equals(history.id(settlement.get("giao_dich_xuat_the_kho_id")))) continue;
            settlement.put(
                "so_luong_huy_do_hoan_xuat",
                WarrantySupplierSettlementSnapshots.quantity(
                        settlement.get("so_luong_huy_do_hoan_xuat"))
                    + WarrantySupplierSettlementSnapshots.quantity(
                        settlement.get("so_luong_con_bu")));
            settlement.put("nghia_vu_gui_thiet_bi_cu_con_mo", false);
            settlement.put("huy_do_hoan_xuat", true);
            settlement.put("thoi_diem_cap_nhat", at.toString());
            WarrantySupplierSettlementSnapshots.refresh(settlement);
            payload.put("doi_soat_nha_cung_cap", settlement);
          }
          payload.put(
              "hoan_xuat_hang_doi",
              fields(
                  "giao_dich_xuat_the_kho_id",
                  state.issue().getId(),
                  "the_kho_id",
                  card.getId(),
                  "thiet_bi_id",
                  device.getId(),
                  "phien_ban_phuong_an",
                  version,
                  "phan_loai",
                  input));
          ticket.setThietBiThayThe(null);
          restoreOriginalCustody(payload, ticket, events);
          delta = delta(1, good, bad, 0);
          extra.putAll(
              fields(
                  "da_hoan_xuat",
                  true,
                  "dang_ap_dung_cho_phuong_an",
                  false,
                  "phan_loai",
                  fields("so_luong_ban_lai", good, "so_luong_can_xu_ly", bad),
                  "ton_sau",
                  stockValues(stock)));
          message =
              bad == 1
                  ? "Hoàn xuất hàng đổi vào nhóm cần xử lý"
                  : "Hoàn xuất đúng hàng đổi đã thực nhận và kiểm tra";
        }
      }
      case "TRA_HANG_CAP_RIENG_DON_VI" -> {
        requireSource(source, "DON_VI_BAO_HANH");
        if (device == null
            || !device.getId().equals(input.get("thiet_bi_id"))
            || Boolean.TRUE.equals(plan.get("da_tra_nguon"))) throw conflict("thiet_bi_id");
        if (!input.get("nha_cung_cap_id").equals(history.id(plan.get("nha_cung_cap_id"))))
          throw conflict("nha_cung_cap_id");
        repository.supplierForReturn((Long) input.get("nha_cung_cap_id"));
        locks.lockDevice(device.getId());
        var location = history.latestSection(events, "noi_dang_giu");
        if (location == null
            || !device.getId().equals(history.id(location.get("thiet_bi_id")))
            || !"CUA_HANG".equals(location.get("loai"))) throw conflict("thiet_bi_id");
        if (device.getSoSerial() != null) {
          serial = repository.selectedSerial(device.getSoSerial().getId());
          requireHeldSerial(serial, device.getPhienBan().getId());
        }
        plan.putAll(
            fields(
                "da_tra_nguon",
                true,
                "dang_ap_dung_cho_phuong_an",
                false,
                "thiet_bi_da_thu_hoi_id",
                device.getId()));
        payload.put("tra_hang_cap_rieng", new LinkedHashMap<>(input));
        custody(payload, ticket, events, device, at, "DANG_VAN_CHUYEN");
        // Lưu riêng hành trình hàng cấp đã rút; luồng đang mở tiếp tục theo thiết bị gốc.
        payload.put(
            "noi_dang_giu_replacement",
            fields(
                "loai",
                "DANG_VAN_CHUYEN",
                "nha_cung_cap_id",
                input.get("nha_cung_cap_id"),
                "thiet_bi_id",
                device.getId()));
        extra.put(
            "noi_dang_giu_replacement",
            fields("loai", "DANG_VAN_CHUYEN", "nha_cung_cap_id", input.get("nha_cung_cap_id")));
        payload.put(
            "giao_nhan",
            fields(
                "su_kien",
                action,
                "thiet_bi_id",
                device.getId(),
                "ngay",
                at.toString(),
                "nha_cung_cap_id",
                input.get("nha_cung_cap_id"),
                "noi_den",
                "DON_VI_BAO_HANH"));
        restoreOriginalCustody(payload, ticket, events);
        ticket.setThietBiThayThe(null);
        extra.putAll(
            fields(
                "da_tra_nguon", true, "dang_ap_dung_cho_phuong_an", false, "da_hoan_xuat", false));
        message = "Trả hàng cấp riêng về đơn vị, không nhập tồn bán";
      }
      default -> throw WarrantyReplacementItemsValidation.invalid();
    }
    ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA);
    if (recovery) ticket.setTrangThaiXuLy(plans.originalState(ticket, events));
    payload.put(
        "trang_thai",
        fields(
            "su_kien",
            action,
            "thoi_diem",
            at.toString(),
            "trang_thai_truoc",
            before.name(),
            "trang_thai_sau",
            ticket.getTrangThaiXuLy().name(),
            "ket_qua_sau",
            "CHUA_CO_KET_QUA"));
    if (device != null) payload.put("thiet_bi_cap_doi_id", device.getId());
    payload.put("chung_tu_urls", input.get("chung_tu_urls"));
    var event =
        workflow.append(ticket, actorId, action, message, mapper.writeValueAsString(payload));
    if (event == null || event.getId() == null) throw invalidHistory();
    if (action.equals("GIU_CHO_HANG_CUA_HANG")) {
      // object() trả bản sao; cập nhật bản chụp mới, không sửa lịch sử cũ.
      var hold = new LinkedHashMap<>(history.object(payload.get("giu_cho_hang_doi")));
      hold.put("giu_cho_lich_su_id", event.getId());
      payload.put("giu_cho_hang_doi", hold);
      extra.put("giu_cho_lich_su_id", event.getId());
    }
    if (action.equals("NHAN_HANG_DON_VI") || action.equals("HOAN_XUAT_HANG_DOI") && card == null)
      extra.put("lich_su_nhan_id", event.getId());
    if (action.equals("TRA_HANG_CAP_RIENG_DON_VI")) extra.put("lich_su_id", event.getId());
    int index = 0;
    for (var difference : differences) {
      difference.put("id", Math.addExact(Math.multiplyExact(event.getId(), 1000L), ++index));
      difference.put("da_xu_ly", false);
      difference.put("thiet_bi_id", device == null ? null : device.getId());
    }
    if (!differences.isEmpty())
      extra.put(
          "canh_bao",
          List.of("Hàng thực nhận có sai lệch; chưa đủ điều kiện bàn giao hoặc hoàn tồn"));
    event.setDuLieuChiTiet(mapper.writeValueAsString(payload));
    repository.flush();
    var data = new AdminWarrantyReplacementItemsResponse();
    data.putAll(
        fields(
            "phieu_bao_hanh_id",
            id,
            "hanh_dong",
            action,
            "nguon",
            source,
            "thiet_bi_thay_the_id",
            device == null ? null : device.getId(),
            "so_serial_id",
            serial == null ? null : serial.getId(),
            "trang_thai_serial",
            serial == null ? null : serial.getTrangThai(),
            "trang_thai_xu_ly",
            ticket.getTrangThaiXuLy(),
            "ket_qua_xu_ly",
            ticket.getKetQuaXuLy(),
            "the_kho",
            card == null ? null : cardValues(card),
            "da_ban_giao",
            false,
            "co_the_ban_giao",
            false,
            "bien_dong_ton",
            delta));
    if (card != null && action.equals("HOAN_XUAT_HANG_DOI"))
      ((Map<String, Object>) data.get("the_kho"))
          .put("giao_dich_xuat_the_kho_id", input.get("giao_dich_xuat_the_kho_id"));
    data.putAll(extra);
    return mutations.complete(replay, 200, message, data);
  }

  private void requireApproved(
      PhieuBaoHanh ticket,
      List<LichSuBaoHanh> events,
      Map<String, Object> plan,
      OffsetDateTime at) {
    var approval = history.object(plan.get("phe_duyet"));
    var consent = history.object(plan.get("quyet_dinh"));
    if (Boolean.TRUE.equals(plan.get("da_huy"))
        || !Boolean.TRUE.equals(plan.get("da_duyet"))
        || !Boolean.TRUE.equals(plan.get("khach_dong_y"))
        || approval == null
        || history.id(approval.get("nguoi_phe_duyet_id")) == null
        || history.text(approval.get("can_cu")) == null
        || history.id(plan.get("lich_su_phe_duyet_id")) == null
        || consent == null
        || !"DONG_Y".equals(consent.get("quyet_dinh"))
        || history.time(consent.get("thoi_diem")) == null
        || history.time(consent.get("thoi_diem")).isAfter(at)
        || history.array(consent.get("bang_chung_urls")).isEmpty())
      throw conflict("phien_ban_phuong_an");
    plans.validatePolicy(ticket, events, plan);
    plans.requireQuoteConsent(ticket, events, plan, at);
    Long quoteVersion = history.id(plan.get("bao_gia_phien_ban"));
    if (quoteVersion != null) {
      var quote =
          WarrantyQuoteSnapshots.load(history, ticket, events, details.findFees(ticket.getId()))
              .get(quoteVersion.intValue());
      var deposit = history.object(quote.get("dieu_kien_dat_coc"));
      if (deposit != null
          && WarrantyQuoteSnapshots.amount(deposit.get("so_tien_toi_thieu")).signum() > 0) {
        var invoices =
            details.findInvoices(ticket.getId()).stream()
                .filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC)
                .toList();
        if (invoices.size() != 1) throw conflict("phien_ban_phuong_an");
        var paid =
            WarrantyFinanceCalculator.invoice(
                invoices.getFirst(), details.findPostedMoney(ticket.getId()));
        var minimum =
            WarrantyQuoteSnapshots.amount(deposit.get("so_tien_toi_thieu"))
                .min(invoices.getFirst().getTongTien());
        if (paid.daThu().subtract(paid.daHoan()).compareTo(minimum) < 0)
          throw conflict("phien_ban_phuong_an");
      }
    }
  }

  private void validateTime(
      PhieuBaoHanh ticket,
      List<LichSuBaoHanh> events,
      OffsetDateTime at,
      Map<String, Object> plan) {
    if (ticket.getNgayTiepNhan() == null
        || at.isBefore(WarrantyReadValidation.time(ticket.getNgayTiepNhan())))
      throw conflict("thoi_diem");
    var cutoff = history.time(plan.get("thoi_diem_lap"));
    for (var event : events) {
      var data = history.payload(event);
      if (data.containsKey("hanh_dong_hang_doi") || data.containsKey("hanh_dong_phuong_an")) {
        var time = history.time(data.get("thoi_diem"));
        if (time != null && (cutoff == null || time.isAfter(cutoff))) cutoff = time;
      }
    }
    if (cutoff != null && at.isBefore(cutoff)) throw conflict("thoi_diem");
  }

  private void validateStock(TonKho stock) {
    if (stock == null
        || stock.getTonThucTe() == null
        || stock.getTonCoTheBan() == null
        || stock.getHangLoi() == null
        || stock.getSoLuongGiuChoBaoHanh() == null
        || stock.getTonThucTe() < 0
        || stock.getTonCoTheBan() < 0
        || stock.getHangLoi() < 0
        || stock.getSoLuongGiuChoBaoHanh() < 0
        || (long) stock.getTonCoTheBan() + stock.getHangLoi() + stock.getSoLuongGiuChoBaoHanh()
            > stock.getTonThucTe()) throw invalidHistory();
  }

  private void validateHold(TonKho stock, Map<String, Object> hold, Long variant) {
    if (!stock.getId().equals(history.id(hold.get("ton_kho_id")))
        || !stock.getKhoHang().getId().equals(history.id(hold.get("kho_hang_id")))
        || !stock.getPhienBan().getId().equals(variant)
        || !variant.equals(history.id(hold.get("phien_ban_id")))
        || !Long.valueOf(1).equals(history.id(hold.get("so_luong")))) throw invalidHistory();
  }

  private void validateOwners(TonKho stock, Long ticket, Long version, Long serial) {
    var owners = replacements.activeHolds(stock.getId());
    long count = 0, own = 0;
    Set<Long> seen = new HashSet<>();
    for (var owner : owners) {
      if (owner.quantity() != 1
          || owner.ticketId() == null
          || owner.version() == null
          || owner.serialId() != null && !seen.add(owner.serialId())) throw invalidHistory();
      count++;
      if (Objects.equals(owner.ticketId(), ticket) && Objects.equals(owner.version(), version)) {
        if (!Objects.equals(owner.serialId(), serial)) throw invalidHistory();
        own++;
      }
    }
    if (count != stock.getSoLuongGiuChoBaoHanh() || ticket != null && own != 1)
      throw invalidHistory();
  }

  private void requireHeldSerial(SoSerialSanPham serial, Long variant) {
    if (serial.getPhienBan() == null
        || !variant.equals(serial.getPhienBan().getId())
        || serial.getTrangThai() != TrangThaiSerial.GIU_CHO_BAO_HANH
        || serial.getDonHang() != null
        || serial.getNgayKichHoat() != null
        || serial.getHanBaoHanh() != null) throw conflict("so_serial_id");
  }

  private void custody(
      Map<String, Object> payload,
      PhieuBaoHanh ticket,
      List<LichSuBaoHanh> events,
      ThietBiBaoHanh device,
      OffsetDateTime at,
      String location) {
    Map<String, Object> original = null;
    for (var event : events)
      for (String key : List.of("noi_dang_giu", "noi_dang_giu_thiet_bi_cu")) {
        var value = history.object(history.payload(event).get(key));
        if (value != null
            && ticket.getThietBi().getId().equals(history.id(value.get("thiet_bi_id"))))
          original = value;
      }
    if (original == null) throw invalidHistory();
    payload.put("noi_dang_giu_thiet_bi_cu", original);
    payload.put(
        "noi_dang_giu",
        fields("loai", location, "thiet_bi_id", device.getId(), "thoi_diem", at.toString()));
  }

  private void restoreOriginalCustody(
      Map<String, Object> payload, PhieuBaoHanh ticket, List<LichSuBaoHanh> events) {
    for (var event : events)
      for (String key : List.of("noi_dang_giu", "noi_dang_giu_thiet_bi_cu")) {
        var value = history.object(history.payload(event).get(key));
        if (value != null
            && ticket.getThietBi().getId().equals(history.id(value.get("thiet_bi_id"))))
          payload.put("noi_dang_giu", value);
      }
  }

  private Map<String, Long> accessories(Object value) {
    Map<String, Long> result = new TreeMap<>();
    for (var raw : history.array(value)) {
      var item = history.object(raw);
      if (item == null
          || history.text(item.get("ten")) == null
          || history.id(item.get("so_luong")) == null) throw invalidHistory();
      result.merge(
          history.text(item.get("ten")).toLowerCase(Locale.ROOT).strip(),
          history.id(item.get("so_luong")),
          Math::addExact);
    }
    return result;
  }

  private List<Map<String, Object>> differences(Map<String, Object> input) {
    var result = new ArrayList<Map<String, Object>>();
    for (var raw : history.array(input.get("sai_lech")))
      result.add(new LinkedHashMap<>(history.object(raw)));
    return result;
  }

  private static void addDifference(
      List<Map<String, Object>> differences, String type, String content) {
    if (differences.stream().noneMatch(d -> type.equals(d.get("loai"))))
      differences.add(fields("loai", type, "noi_dung", content));
  }

  private static Map<String, Object> delta(int physical, int sellable, int damaged, int held) {
    return fields(
        "ton_thuc_te",
        physical,
        "ton_co_the_ban",
        sellable,
        "hang_loi",
        damaged,
        "so_luong_giu_cho_bao_hanh",
        held);
  }

  private static Map<String, Object> stockValues(TonKho stock) {
    return delta(
        stock.getTonThucTe(),
        stock.getTonCoTheBan(),
        stock.getHangLoi(),
        stock.getSoLuongGiuChoBaoHanh());
  }

  private static Map<String, Object> cardValues(TheKho card) {
    return fields(
        "id",
        card.getId(),
        "loai_giao_dich",
        card.getLoaiGiaoDich(),
        "kho_hang_id",
        card.getKhoHang().getId(),
        "phien_ban_id",
        card.getPhienBan().getId(),
        "so_luong_thay_doi",
        card.getSoLuongThayDoi());
  }

  private static void requireSource(String actual, String expected) {
    if (!expected.equals(actual)) throw conflict("hanh_dong");
  }

  static WarrantyReadException conflict(String field) {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT, field, "REPLACEMENT_ITEMS_CONFLICT");
  }

  private static WarrantyReadException stockUnavailable() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_REPLACEMENT_STOCK_UNAVAILABLE,
        "so_serial_id",
        "REPLACEMENT_STOCK_UNAVAILABLE");
  }

  private static WarrantyReadException handedOver() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_REPLACEMENT_ITEMS_HANDED_OVER,
        "giao_dich_xuat_the_kho_id",
        "REPLACEMENT_ALREADY_HANDED_OVER");
  }

  private static WarrantyReadException versionMissing() {
    return WarrantyReadException.notFound(
        ErrorCode.NOT_FOUND, "phien_ban_phuong_an", "REPLACEMENT_VERSION_NOT_FOUND");
  }
}
