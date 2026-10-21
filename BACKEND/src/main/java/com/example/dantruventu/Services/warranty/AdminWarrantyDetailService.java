package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyDetailResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyDetailResponse.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.WarrantyReadException;
import com.example.dantruventu.Repository.warranty.WarrantyDetailRepository;
import com.example.dantruventu.Repository.warranty.WarrantyHistoryRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminWarrantyDetailService {
  private final WarrantyDetailRepository repository;
  private final WarrantyHistoryRepository historyRepository;
  private final WarrantyHistorySupport historySupport;
  private final WarrantyDeviceResolver deviceResolver;

  public AdminWarrantyDetailResponse getDetail(
      String rawId, String historyPage, String historyLimit) {
    Long id = WarrantyReadValidation.id(rawId, ErrorCode.INVALID_WARRANTY_DETAIL);
    int page = WarrantyReadValidation.page(historyPage, 0, ErrorCode.INVALID_WARRANTY_DETAIL);
    int limit = WarrantyReadValidation.pageSize(historyLimit, 1, ErrorCode.INVALID_WARRANTY_DETAIL);
    WarrantyReadValidation.validateOffset(page, limit, ErrorCode.INVALID_WARRANTY_DETAIL);
    PhieuBaoHanh ticket =
        repository
            .findTicket(id)
            .orElseThrow(
                () ->
                    WarrantyReadException.notFound(
                        ErrorCode.WARRANTY_NOT_FOUND, "path.id", "WARRANTY_NOT_FOUND"));
    validateTicket(ticket);

    // Metadata must not disappear when the caller changes the independently paginated timeline.
    List<LichSuBaoHanh> events = historyRepository.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    var historyPageResult =
        historyRepository.findByPhieuBaoHanh_Id(
            id,
            PageRequest.of(
                page, limit, Sort.by(Sort.Order.desc("ngayTao"), Sort.Order.desc("id"))));
    List<ChiTietPhiBaoHanh> fees = repository.findFees(id);
    List<HoaDonBaoHanh> invoices = repository.findInvoices(id);
    List<SoQuyThuChi> cash = repository.findPostedMoney(id);
    List<Invoice> invoiceViews =
        invoices.stream().map(invoice -> WarrantyFinanceCalculator.invoice(invoice, cash)).toList();
    List<Invoice> active =
        invoiceViews.stream()
            .filter(invoice -> invoice.trangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC)
            .toList();
    if (active.size() > 1) throw new AppException(ErrorCode.INVALID_WARRANTY_FINANCIAL_DATA);
    Invoice activeInvoice = active.isEmpty() ? null : active.getFirst();
    List<Invoice> cancelled =
        invoiceViews.stream()
            .filter(invoice -> invoice.trangThai() == TrangThaiHoaDonBaoHanh.HUY)
            .toList();
    Set<Long> invoiceIds = new HashSet<>();
    for (var invoice : invoices) {
      if (!id.equals(invoice.getPhieuBaoHanh().getId()) || !invoiceIds.add(invoice.getId()))
        throw invalid();
    }
    List<MoneyTransaction> money = money(id, invoiceIds, cash);
    SupplierCost supplierCost = supplierCost(ticket, cash);

    var deviceState = deviceResolver.resolve(ticket.getThietBi());
    Map<String, Object> intake = historySupport.latestSection(events, "tiep_nhan");
    Map<String, Object> deviceMetadata = deviceMetadata(events, ticket.getThietBi(), true);
    Map<String, Object> custody = location(historySupport.latestSection(events, "noi_dang_giu"));
    Map<String, Object> oldCustody =
        location(historySupport.latestSection(events, "noi_dang_giu_thiet_bi_cu"));
    Map<String, Object> exchange =
        exchange(historySupport.latestSection(events, "phuong_an_doi"), ticket);
    Map<String, Object> settlement =
        settlement(historySupport.latestSection(events, "doi_soat_nha_cung_cap"));
    List<Map<String, Object>> quotes = quotes(ticket, fees, events);
    Device currentDevice =
        deviceState.thietBiHienHanh() == null
            ? null
            : device(
                deviceState.thietBiHienHanh(),
                true,
                deviceMetadata(events, deviceState.thietBiHienHanh(), deviceState.hienHanh()));
    return new AdminWarrantyDetailResponse(
        id,
        ticket.getMaPhieu(),
        ticket.getTrangThaiXuLy(),
        ticket.getKetQuaXuLy(),
        new Order(
            ticket.getDonHang().getId(),
            ticket.getDonHang().getMaDonHang(),
            ticket.getThietBi().getChiTietDonHang().getId()),
        new Contact(
            ticket.getKhachHang() == null ? null : ticket.getKhachHang().getId(),
            ticket.getTenNguoiLienHe(),
            ticket.getSdtNguoiLienHe()),
        device(ticket.getThietBi(), deviceState.hienHanh(), deviceMetadata),
        new Intake(
            ticket.getLyDoBaoHanh(),
            ticket.getTinhTrangTiepNhan(),
            accessories(value(intake, "phu_kien")),
            strings(value(intake, "anh_urls"))),
        conclusions(events),
        custody,
        quotes,
        activeInvoice,
        supplierCost,
        money,
        exchange,
        settlement,
        handovers(events),
        new History(
            historyPageResult.getContent().stream()
                .map(
                    event ->
                        new HistoryItem(
                            event.getId(),
                            event.getLoaiSuKien(),
                            event.getNguoiThucHien() == null
                                ? null
                                : event.getNguoiThucHien().getId(),
                            WarrantyReadValidation.time(event.getNgayTao()),
                            event.getNoiDung()))
                .toList(),
            WarrantyReadValidation.pagination(page, limit, historyPageResult.getTotalElements())),
        allowedActions(ticket, custody, exchange, settlement, activeInvoice, invoiceViews, quotes),
        WarrantyReadValidation.time(ticket.getNgayTiepNhan()),
        WarrantyReadValidation.time(ticket.getNgayCapNhat()),
        cancelled,
        currentDevice,
        oldCustody);
  }

  private void validateTicket(PhieuBaoHanh ticket) {
    if (ticket.getDonHang() == null
        || ticket.getDonHang().getId() == null
        || ticket.getThietBi() == null
        || ticket.getThietBi().getId() == null
        || ticket.getThietBi().getChiTietDonHang() == null
        || ticket.getThietBi().getChiTietDonHang().getDonHang() == null
        || ticket.getThietBi().getPhienBan() == null
        || ticket.getThietBi().getPhienBan().getId() == null
        || !ticket
            .getDonHang()
            .getId()
            .equals(ticket.getThietBi().getChiTietDonHang().getDonHang().getId())) throw invalid();
    var serial = ticket.getThietBi().getSoSerial();
    if (ticket.getSoSerial() != null
        && (serial == null || !serial.getId().equals(ticket.getSoSerial().getId())))
      throw invalid();
  }

  private Device device(ThietBiBaoHanh device, boolean current, Map<String, Object> metadata) {
    if (metadata != null
        && metadata.get("id") != null
        && !device.getId().equals(historySupport.id(metadata.get("id")))) throw invalid();
    SoSerialSanPham serial = device.getSoSerial();
    if (serial != null && !serial.getPhienBan().getId().equals(device.getPhienBan().getId()))
      throw invalid();
    // A stored expiry is authoritative; never calculate from today's product warranty policy.
    var expiry = serial == null ? device.getHanBaoHanh() : serial.getHanBaoHanh();
    OffsetDateTime savedExpiry = historySupport.time(value(metadata, "han_bao_hanh"));
    return new Device(
        device.getId(),
        device.getMaTheoDoi(),
        device.getPhienBan().getId(),
        serial == null ? null : serial.getId(),
        serial == null ? null : serial.getSoSerial(),
        current,
        expiry == null ? savedExpiry : WarrantyReadValidation.time(expiry),
        historySupport.text(value(metadata, "can_cu_tinh_han")));
  }

  private Map<String, Object> deviceMetadata(
      List<LichSuBaoHanh> events, ThietBiBaoHanh current, boolean original) {
    Map<String, Object> latest = null;
    for (var event : events) {
      Map<String, Object> metadata =
          historySupport.object(historySupport.payload(event).get("thiet_bi"));
      if (metadata != null
          && ((original && metadata.get("id") == null)
              || current.getId().equals(historySupport.id(metadata.get("id"))))) latest = metadata;
      Map<String, Object> currentMetadata =
          historySupport.object(historySupport.payload(event).get("thiet_bi_hien_hanh"));
      if (currentMetadata != null
          && current.getId().equals(historySupport.id(currentMetadata.get("id"))))
        latest = currentMetadata;
    }
    return latest;
  }

  private List<MoneyTransaction> money(
      Long ticketId, Set<Long> invoiceIds, List<SoQuyThuChi> cash) {
    List<MoneyTransaction> result = new ArrayList<>();
    Set<Long> seen = new HashSet<>();
    for (var voucher : cash) {
      if (voucher.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN) continue;
      WarrantyFinanceCalculator.validateMoney(voucher);
      if (!seen.add(voucher.getId())) throw invalid();
      String type;
      if (voucher.getHoaDonBaoHanh() != null) {
        if (!invoiceIds.contains(voucher.getHoaDonBaoHanh().getId())
            || (voucher.getPhieuBaoHanh() != null
                && !ticketId.equals(voucher.getPhieuBaoHanh().getId()))) throw invalid();
        type = voucher.getLoaiPhieu() == LoaiPhieuThuChi.THU ? "THU_KHACH" : "HOAN_KHACH";
      } else {
        if (voucher.getPhieuBaoHanh() == null
            || !ticketId.equals(voucher.getPhieuBaoHanh().getId())
            || voucher.getNhomNguoiNopNhan() != NhomNguoiNopNhanEnum.NHA_CUNG_CAP
            || voucher.getNhaCungCap() == null) throw invalid();
        type = voucher.getLoaiPhieu() == LoaiPhieuThuChi.CHI ? "CHI_DON_VI" : "NHAN_HOAN_DON_VI";
      }
      result.add(new MoneyTransaction(voucher.getId(), type, voucher.getSoTien(), voucher.getId()));
    }
    return result;
  }

  private SupplierCost supplierCost(PhieuBaoHanh ticket, List<SoQuyThuChi> cash) {
    BigDecimal paid = BigDecimal.ZERO;
    BigDecimal receivedRefund = BigDecimal.ZERO;
    for (var voucher : cash) {
      if (voucher.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN) continue;
      if (voucher.getHoaDonBaoHanh() != null) continue;
      if (voucher.getLoaiPhieu() == LoaiPhieuThuChi.CHI) paid = paid.add(voucher.getSoTien());
      else receivedRefund = receivedRefund.add(voucher.getSoTien());
    }
    if (receivedRefund.compareTo(paid) > 0) throw invalid();
    BigDecimal confirmed = ticket.getChiPhiNccXacNhan();
    if (confirmed != null && confirmed.signum() < 0) throw invalid();
    BigDecimal netPaid = paid.subtract(receivedRefund);
    return new SupplierCost(
        confirmed,
        paid,
        receivedRefund,
        confirmed == null ? null : confirmed.subtract(netPaid).max(BigDecimal.ZERO),
        confirmed == null ? null : netPaid.subtract(confirmed).max(BigDecimal.ZERO));
  }

  private List<Map<String, Object>> quotes(
      PhieuBaoHanh ticket, List<ChiTietPhiBaoHanh> fees, List<LichSuBaoHanh> events) {
    Map<Integer, Map<String, Object>> metadataByVersion = new TreeMap<>();
    for (var event : events) {
      Map<String, Object> metadata =
          historySupport.object(historySupport.payload(event).get("bao_gia"));
      if (metadata == null) continue;
      Integer version = positiveInteger(metadata.get("phien_ban"));
      if (version == null) throw invalid();
      Map<String, Object> previous = metadataByVersion.get(version);
      Map<String, Object> merged =
          previous == null ? new LinkedHashMap<>() : new LinkedHashMap<>(previous);
      // Decisions are immutable; replacement is a separate link, never a rewritten decision.
      var previousDecision = historySupport.object(value(previous, "quyet_dinh"));
      var decision = historySupport.object(metadata.get("quyet_dinh"));
      if (previousDecision != null && decision != null && !previousDecision.equals(decision))
        throw invalid();
      merged.putAll(metadata);
      if (previousDecision != null && decision == null) merged.put("quyet_dinh", previousDecision);
      metadataByVersion.put(version, merged);
    }
    Map<Integer, List<ChiTietPhiBaoHanh>> feeByVersion = new TreeMap<>();
    for (var fee : fees) {
      if (fee.getId() == null
          || fee.getPhieuBaoHanh() == null
          || !ticket.getId().equals(fee.getPhieuBaoHanh().getId())
          || fee.getPhienBanBaoGia() == null
          || fee.getPhienBanBaoGia() <= 0
          || fee.getSoLuong() == null
          || fee.getSoLuong() <= 0
          || fee.getDonGiaKhach() == null
          || fee.getDonGiaKhach().signum() < 0
          || fee.getThanhTienKhach() == null
          || fee.getThanhTienKhach().signum() < 0
          || fee.getThanhTienKhach()
                  .compareTo(fee.getDonGiaKhach().multiply(BigDecimal.valueOf(fee.getSoLuong())))
              != 0
          || (fee.getChiPhiNccDuKien() != null && fee.getChiPhiNccDuKien().signum() < 0))
        throw invalid();
      feeByVersion.computeIfAbsent(fee.getPhienBanBaoGia(), ignored -> new ArrayList<>()).add(fee);
    }
    Set<Integer> versions = new TreeSet<>(metadataByVersion.keySet());
    versions.addAll(feeByVersion.keySet());
    List<Map<String, Object>> result = new ArrayList<>();
    for (Integer version : versions) {
      Map<String, Object> meta = metadataByVersion.get(version);
      Map<Long, Map<String, Object>> feeMetadata = new HashMap<>();
      for (Object raw : historySupport.array(value(meta, "hang_muc"))) {
        var item = historySupport.object(raw);
        Long feeId = historySupport.id(value(item, "id"));
        if (feeId == null || feeMetadata.put(feeId, item) != null) throw invalid();
      }
      List<Map<String, Object>> items = new ArrayList<>();
      BigDecimal total = BigDecimal.ZERO;
      for (var fee : feeByVersion.getOrDefault(version, List.of())) {
        Map<String, Object> feeMeta = feeMetadata.remove(fee.getId());
        items.add(
            fields(
                "id",
                fee.getId(),
                "ma_hang_muc",
                historySupport.text(value(feeMeta, "ma_hang_muc")),
                "noi_dung",
                fee.getNoiDung(),
                "so_luong",
                fee.getSoLuong(),
                "don_gia_khach",
                fee.getDonGiaKhach(),
                "thanh_tien_khach",
                fee.getThanhTienKhach(),
                "chi_phi_ncc_du_kien",
                fee.getChiPhiNccDuKien(),
                "dieu_kien_bao_hanh",
                fee.getDieuKienBaoHanh(),
                "ben_chiu_phi",
                historySupport.text(value(feeMeta, "ben_chiu_phi")),
                "van_phat_sinh_khi_khong_sua",
                bool(value(feeMeta, "van_phat_sinh_khi_khong_sua"))));
        total = total.add(fee.getThanhTienKhach());
      }
      if (!feeMetadata.isEmpty()) throw invalid();
      BigDecimal savedTotal = amount(value(meta, "tong_tien_khach"));
      if (savedTotal != null && savedTotal.compareTo(total) != 0) throw invalid();
      String status = historySupport.text(value(meta, "trang_thai"));
      if (status == null
          && Objects.equals(version, ticket.getPhienBanBaoGia())
          && ticket.getTrangThaiBaoGia() != null) status = ticket.getTrangThaiBaoGia().name();
      if (status != null) {
        try {
          TrangThaiBaoGiaBaoHanh.valueOf(status);
        } catch (IllegalArgumentException error) {
          throw invalid();
        }
      }
      Map<String, Object> decision = decision(historySupport.object(value(meta, "quyet_dinh")));
      if (decision != null && decision.get("quyet_dinh") != null) {
        if (status != null && !status.equals(decision.get("quyet_dinh"))) throw invalid();
        status = decision.get("quyet_dinh").toString();
      }
      var deposit = historySupport.object(value(meta, "dieu_kien_dat_coc"));
      Integer replaces = positiveInteger(value(meta, "thay_the_phien_ban"));
      if (version.equals(replaces)) throw invalid();
      result.add(
          fields(
              "phien_ban",
              version,
              "trang_thai",
              status,
              "thay_the_phien_ban",
              replaces,
              "hang_muc",
              items,
              "tong_tien_khach",
              total,
              "thoi_gian_du_kien",
              historySupport.text(value(meta, "thoi_gian_du_kien")),
              "han_phan_hoi",
              historySupport.time(value(meta, "han_phan_hoi")),
              "dieu_kien_dat_coc",
              deposit == null
                  ? null
                  : fields("so_tien_toi_thieu", amount(deposit.get("so_tien_toi_thieu"))),
              "dieu_kien_thanh_toan",
              historySupport.text(value(meta, "dieu_kien_thanh_toan")),
              "quyet_dinh",
              decision));
    }
    return result;
  }

  private Map<String, Object> decision(Map<String, Object> value) {
    if (value == null) return null;
    String choice = historySupport.text(value.get("quyet_dinh"));
    if (choice != null && !Set.of("DONG_Y", "TU_CHOI").contains(choice)) throw invalid();
    return fields(
        "quyet_dinh",
        choice,
        "thoi_diem",
        historySupport.time(value.get("thoi_diem")),
        "kenh",
        historySupport.text(value.get("kenh")),
        "bang_chung_urls",
        strings(value.get("bang_chung_urls")));
  }

  private List<Map<String, Object>> conclusions(List<LichSuBaoHanh> events) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (var event : events) {
      var conclusion = historySupport.object(historySupport.payload(event).get("ket_luan"));
      if (conclusion == null) continue;
      List<Map<String, Object>> items = new ArrayList<>();
      for (Object raw : historySupport.array(conclusion.get("hang_muc"))) {
        var item = historySupport.object(raw);
        items.add(
            fields(
                "ma_hang_muc",
                historySupport.text(value(item, "ma_hang_muc")),
                "dieu_kien_bao_hanh",
                historySupport.text(value(item, "dieu_kien_bao_hanh")),
                "ly_do",
                historySupport.text(value(item, "ly_do")),
                "can_cu",
                historySupport.text(value(item, "can_cu")),
                "ben_chiu_phi",
                historySupport.text(value(item, "ben_chiu_phi"))));
      }
      result.add(
          fields(
              "lich_su_id",
              event.getId(),
              "noi_dung",
              historySupport.text(conclusion.get("noi_dung")),
              "hang_muc",
              items));
    }
    return result;
  }

  private List<Map<String, Object>> handovers(List<LichSuBaoHanh> events) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (var event : events) {
      var handover = historySupport.object(historySupport.payload(event).get("giao_nhan"));
      if (handover == null) continue;
      // This is a persisted delivery event, not a made-up history entry for the current status.
      String type = historySupport.text(handover.get("su_kien"));
      OffsetDateTime at = historySupport.time(handover.get("ngay"));
      result.add(
          fields(
              "lich_su_id",
              event.getId(),
              "su_kien",
              type == null ? event.getLoaiSuKien() : type,
              "thiet_bi_id",
              historySupport.id(handover.get("thiet_bi_id")),
              "ngay",
              at == null ? WarrantyReadValidation.time(event.getNgayTao()) : at));
    }
    return result;
  }

  private Map<String, Object> location(Map<String, Object> value) {
    if (value == null) return null;
    return fields(
        "loai",
        historySupport.text(value.get("loai")),
        "nha_cung_cap_id",
        historySupport.id(value.get("nha_cung_cap_id")),
        "ten",
        historySupport.text(value.get("ten")),
        "thiet_bi_id",
        historySupport.id(value.get("thiet_bi_id")));
  }

  private Map<String, Object> exchange(Map<String, Object> value, PhieuBaoHanh ticket) {
    if (value == null) return null;
    Long oldId = historySupport.id(value.get("thiet_bi_cu_id"));
    Long replacementId = historySupport.id(value.get("thiet_bi_thay_the_id"));
    if ((oldId != null && !oldId.equals(ticket.getThietBi().getId()))
        || (replacementId != null
            && (ticket.getThietBiThayThe() == null
                || !replacementId.equals(ticket.getThietBiThayThe().getId())))) throw invalid();
    return fields(
        "phien_ban",
        positiveInteger(value.get("phien_ban")),
        "da_duyet",
        bool(value.get("da_duyet")),
        "khach_dong_y",
        bool(value.get("khach_dong_y")),
        "nguon",
        historySupport.text(value.get("nguon")),
        "thiet_bi_cu_id",
        oldId,
        "thiet_bi_thay_the_id",
        replacementId,
        "han_bao_hanh_ap_dung",
        historySupport.time(value.get("han_bao_hanh_ap_dung")),
        "da_ban_giao",
        bool(value.get("da_ban_giao")));
  }

  private Map<String, Object> settlement(Map<String, Object> value) {
    if (value == null) return null; // Approved: unsupported/unrecorded reconciliation is unknown.
    Integer required = nonNegativeInteger(value.get("so_luong_can_bu"));
    Integer supplied = nonNegativeInteger(value.get("so_luong_da_bu"));
    Integer remaining = nonNegativeInteger(value.get("so_luong_con_bu"));
    if (required != null
        && supplied != null
        && remaining != null
        && required - supplied != remaining) throw invalid();
    BigDecimal remainingMoney = amount(value.get("so_tien_con_doi_soat"));
    Boolean resolved = bool(value.get("da_giai_quyet"));
    if (Boolean.TRUE.equals(resolved)
        && ((remaining != null && remaining > 0)
            || (remainingMoney != null && remainingMoney.signum() > 0))) throw invalid();
    return fields(
        "nghia_vu_lich_su_id",
        historySupport.id(value.get("nghia_vu_lich_su_id")),
        "so_luong_can_bu",
        required,
        "so_luong_da_bu",
        supplied,
        "so_luong_con_bu",
        remaining,
        "so_tien_con_doi_soat",
        remainingMoney,
        "da_giai_quyet",
        resolved);
  }

  private List<String> allowedActions(
      PhieuBaoHanh ticket,
      Map<String, Object> custody,
      Map<String, Object> exchange,
      Map<String, Object> settlement,
      Invoice invoice,
      List<Invoice> invoices,
      List<Map<String, Object>> quotes) {
    List<String> result = new ArrayList<>();
    boolean finished = ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.HOAN_TAT;
    String location = historySupport.text(value(custody, "loai"));
    if (!finished && "DON_VI_BAO_HANH".equals(location)) {
      result.add("CAP_NHAT_TIEN_DO");
      result.add("YEU_CAU_DUNG");
      result.add("NHAN_LAI");
    }
    boolean heldAtShop = "CUA_HANG".equals(location);
    if (!finished
        && heldAtShop
        && (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.CHO_TRA_KHACH
            || ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.DA_NHAN_LAI)) {
      boolean settled = invoice == null || invoice.conPhaiThu().signum() == 0;
      // A fee row is not evidence of consent, and absence of an invoice is not proof of free work.
      Set<Integer> cancelledVersions = new HashSet<>();
      for (var item : invoices)
        if (item.trangThai() == TrangThaiHoaDonBaoHanh.HUY)
          cancelledVersions.add(item.phienBanBaoGia());
      boolean noPositiveFees =
          (invoice == null || invoice.tongTien().signum() == 0)
              && quotes.stream()
                  .noneMatch(
                      quote ->
                          quote.get("tong_tien_khach") instanceof BigDecimal total
                              && total.signum() > 0);
      boolean recordedConsent =
          invoice != null
              && quotes.stream()
                  .anyMatch(
                      quote -> {
                        if (!Objects.equals(quote.get("phien_ban"), invoice.phienBanBaoGia()))
                          return false;
                        var decision = historySupport.object(quote.get("quyet_dinh"));
                        return decision != null
                            && "DONG_Y".equals(decision.get("quyet_dinh"))
                            && decision.get("thoi_diem") != null
                            && decision.get("kenh") instanceof String channel
                            && !channel.isBlank();
                      });
      boolean allPositiveFeesCancelled =
          invoice == null
              && !cancelledVersions.isEmpty()
              && quotes.stream()
                  .filter(
                      quote ->
                          quote.get("tong_tien_khach") instanceof BigDecimal total
                              && total.signum() > 0)
                  .allMatch(quote -> cancelledVersions.contains(quote.get("phien_ban")));
      boolean feeGuardsKnown = noPositiveFees || recordedConsent || allPositiveFeesCancelled;
      boolean replacementReady =
          ticket.getThietBiThayThe() == null
              || (exchange != null
                  && Boolean.TRUE.equals(exchange.get("da_duyet"))
                  && Boolean.TRUE.equals(exchange.get("khach_dong_y"))
                  && ticket.getThietBiThayThe().getId().equals(exchange.get("thiet_bi_thay_the_id"))
                  && exchange.get("han_bao_hanh_ap_dung") != null);
      Long heldDevice = historySupport.id(value(custody, "thiet_bi_id"));
      Long deviceToHandOver =
          ticket.getThietBiThayThe() == null
              ? ticket.getThietBi().getId()
              : ticket.getThietBiThayThe().getId();
      if (ticket.getTrangThaiXuLy() == TrangThaiBaoHanh.CHO_TRA_KHACH
          && settled
          && feeGuardsKnown
          && replacementReady
          && deviceToHandOver.equals(heldDevice)) result.add("HANDOVER");
      result.add("KIEM_TRA_TIEP");
    }
    if (invoices.stream().anyMatch(item -> item.conPhaiHoan().signum() > 0))
      result.add("HOAN_KHACH");
    if (settlement != null
        && Boolean.FALSE.equals(settlement.get("da_giai_quyet"))
        && ((settlement.get("so_luong_con_bu") instanceof Integer quantity && quantity > 0)
            || (settlement.get("so_tien_con_doi_soat") instanceof BigDecimal remaining
                && remaining.signum() > 0))) result.add("SUPPLIER_SETTLEMENT");
    // Advisory guards only: each later mutation endpoint must authorize and validate again.
    // Never return permission strings copied from unvalidated JSON supplied by a historic writer.
    return result;
  }

  private List<Map<String, Object>> accessories(Object value) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Object raw : historySupport.array(value)) {
      var item = historySupport.object(raw);
      result.add(
          fields(
              "ten",
              historySupport.text(value(item, "ten")),
              "so_luong",
              positiveInteger(value(item, "so_luong"))));
    }
    return result;
  }

  private List<String> strings(Object value) {
    return historySupport.array(value).stream().map(historySupport::text).toList();
  }

  private Boolean bool(Object value) {
    if (value == null) return null;
    if (!(value instanceof Boolean result)) throw invalid();
    return result;
  }

  private Integer positiveInteger(Object value) {
    Long number = historySupport.id(value);
    if (number == null) return null;
    if (number > Integer.MAX_VALUE) throw invalid();
    return number.intValue();
  }

  private Integer nonNegativeInteger(Object value) {
    BigDecimal number = amount(value);
    if (number == null) return null;
    try {
      return number.intValueExact();
    } catch (ArithmeticException error) {
      throw invalid();
    }
  }

  private BigDecimal amount(Object value) {
    if (value == null) return null;
    if (!(value instanceof Number)) throw invalid();
    try {
      BigDecimal amount = new BigDecimal(value.toString());
      if (amount.signum() < 0) throw invalid();
      return amount;
    } catch (NumberFormatException error) {
      throw invalid();
    }
  }

  private static Object value(Map<String, Object> source, String key) {
    return source == null ? null : source.get(key);
  }

  private static Map<String, Object> fields(Object... values) {
    Map<String, Object> result = new LinkedHashMap<>();
    for (int index = 0; index < values.length; index += 2)
      result.put((String) values[index], values[index + 1]);
    return result;
  }

  private static AppException invalid() {
    return new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
  }
}
