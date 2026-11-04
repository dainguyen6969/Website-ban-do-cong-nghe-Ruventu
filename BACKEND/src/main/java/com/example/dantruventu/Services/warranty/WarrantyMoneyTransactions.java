package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.WarrantyEventWorkAuthorization.fields;
import static com.example.dantruventu.Services.warranty.WarrantyMoneySources.*;
import static com.example.dantruventu.Services.warranty.WarrantyQuoteSnapshots.invalidHistory;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyMoneyResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.*;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class WarrantyMoneyTransactions {
  private final WarrantyWorkflowRepository workflow;
  private final WarrantyIntakeRepository locks;
  private final WarrantyHistoryRepository histories;
  private final WarrantyHistorySupport history;
  private final WarrantyDetailRepository details;
  private final WarrantyEventRepository eventsRepository;
  private final WarrantyMoneyRepository repository;
  private final WarrantyMoneySources sources;
  private final CashbookService cashbook;
  private final WarrantyMutationSupport mutations;
  private final ObjectMapper mapper;

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ApiResponse<AdminWarrantyMoneyResponse> apply(
      Long id, Map<String, Object> input, String key, Long actorId) {
    var replay =
        mutations.begin(
            "BH-MONEY-",
            key,
            actorId,
            "POST:/api/v1/admin/warranties/" + id + "/money-transactions",
            input,
            AdminWarrantyMoneyResponse.class,
            WarrantyMoneyValidation.INVALID);
    if (replay.previous() != null) return replay.previous();
    var origin = workflow.ticketOrigin(id);
    locks.lockOrder(origin.orderId());
    locks.lockLine(origin.lineId());
    var ticket = workflow.lockTicket(id);
    if (ticket.getDonHang() == null
        || ticket.getThietBi() == null
        || ticket.getThietBi().getChiTietDonHang() == null
        || !origin.orderId().equals(ticket.getDonHang().getId())
        || !origin.lineId().equals(ticket.getThietBi().getChiTietDonHang().getId()))
      throw invalidHistory();
    var events = histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(id);
    var invoices = details.findInvoices(id);
    if (invoices.stream().filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC).count()
        > 1) throw invalidHistory();
    var vouchers = new ArrayList<>(details.findPostedMoney(id));
    String kind = input.get("loai").toString();
    String code =
        switch (kind) {
          case "THU_KHACH" -> "THU_BAO_HANH";
          case "HOAN_KHACH" -> "CHI_HOAN_BAO_HANH";
          case "CHI_DON_VI" -> "CHI_DON_VI_BAO_HANH";
          case "THU_HOAN_DON_VI" -> "THU_HOAN_DON_VI_BAO_HANH";
          case "THU_DOI_SOAT_DON_VI" -> "THU_DOI_SOAT_BAO_HANH";
          default -> throw WarrantyMoneyValidation.invalid();
        };
    boolean customer = kind.equals("THU_KHACH") || kind.equals("HOAN_KHACH");
    boolean outgoing = kind.equals("HOAN_KHACH") || kind.equals("CHI_DON_VI");
    BigDecimal value = (BigDecimal) input.get("so_tien");
    OffsetDateTime at = (OffsetDateTime) input.get("ngay_ghi_nhan");
    var links =
        fields(
            "hoa_don_bao_hanh_id",
            input.get("hoa_don_bao_hanh_id"),
            "chi_phi_lich_su_id",
            input.get("chi_phi_lich_su_id"),
            "giao_dich_chi_goc_id",
            input.get("giao_dich_chi_goc_id"),
            "nghia_vu_lich_su_id",
            input.get("nghia_vu_lich_su_id"));
    HoaDonBaoHanh selected = null;
    NhaCungCap supplier = null;
    Map<String, Object> costs = null, settlement = null;
    List<Map<String, Object>> allocation = null;
    if (customer) {
      Long invoiceId = (Long) input.get("hoa_don_bao_hanh_id");
      selected =
          invoices.stream()
              .filter(i -> invoiceId.equals(i.getId()))
              .findFirst()
              .orElseThrow(
                  () ->
                      WarrantyReadException.notFound(
                          ErrorCode.WARRANTY_INVOICE_NOT_FOUND,
                          "hoa_don_bao_hanh_id",
                          "WARRANTY_INVOICE_NOT_FOUND"));
      repository.lockInvoice(selected);
      if (selected.getPhieuBaoHanh() == null || !id.equals(selected.getPhieuBaoHanh().getId()))
        throw invalidHistory();
      if (kind.equals("THU_KHACH")) {
        if (selected.getTrangThai() != TrangThaiHoaDonBaoHanh.HIEU_LUC)
          throw WarrantyReadException.of(
              ErrorCode.WARRANTY_INVOICE_INACTIVE, "hoa_don_bao_hanh_id", "INVOICE_INACTIVE");
        requireConsent(ticket, selected, events, at);
      }
      var before = WarrantyFinanceCalculator.invoice(selected, vouchers);
      BigDecimal available = kind.equals("THU_KHACH") ? before.conPhaiThu() : before.conPhaiHoan();
      if (value.compareTo(available) > 0) throw exceeds();
      if (selected.getNgayTao() != null) notBefore(at, selected.getNgayTao());
    } else {
      Long supplierId = (Long) input.get("nha_cung_cap_id");
      supplier = eventsRepository.supplier(supplierId, false);
      if (kind.equals("THU_DOI_SOAT_DON_VI")) {
        Long source = (Long) input.get("nghia_vu_lich_su_id");
        settlement = sources.settlement(events, vouchers, source, supplierId);
        requireSourceTime(events, source, at);
        if (settlement.containsKey("phien_ban_du_lieu")) {
          var confirmedAt = history.time(settlement.get("thoi_diem_cap_nhat"));
          if (confirmedAt == null
              || at.isBefore(confirmedAt.truncatedTo(java.time.temporal.ChronoUnit.SECONDS)))
            throw stale();
        }
        if (value.compareTo((BigDecimal) settlement.get("so_tien_con_doi_soat")) > 0)
          throw exceeds();
        BigDecimal received =
            WarrantyQuoteSnapshots.amount(settlement.get("so_tien_da_nhan")).add(value);
        BigDecimal left =
            WarrantyQuoteSnapshots.amount(settlement.get("so_tien_nghia_vu")).subtract(received);
        settlement.put("so_tien_da_nhan", received);
        settlement.put("so_tien_con_doi_soat", left);
        if (settlement.containsKey("phien_ban_du_lieu")) {
          WarrantySupplierSettlementSnapshots.refresh(settlement);
          settlement.put("thoi_diem_cap_nhat", at.toString());
        } else {
          settlement.put(
              "da_giai_quyet",
              left.signum() == 0 && ((Number) settlement.get("so_luong_con_bu")).longValue() == 0);
        }
      } else {
        if (kind.equals("CHI_DON_VI"))
          sources.costSource(events, (Long) input.get("chi_phi_lich_su_id"), supplierId);
        else
          sources.originalPayment(
              vouchers, (Long) input.get("giao_dich_chi_goc_id"), supplierId, id);
        var before = sources.costs(ticket, events, vouchers, supplierId);
        if (kind.equals("CHI_DON_VI")) {
          Long source = (Long) input.get("chi_phi_lich_su_id");
          allocation =
              sources.distribute(sources.payable(before, events, source, supplierId), value);
          requireSourceTime(events, source, at);
        } else {
          Long originalId = (Long) input.get("giao_dich_chi_goc_id");
          allocation =
              sources.distribute(
                  sources.recoverable(before, vouchers, originalId, supplierId, id), value);
          var original =
              vouchers.stream().filter(v -> originalId.equals(v.getId())).findFirst().orElseThrow();
          if (original.getNgayGhiNhan() != null) notBefore(at, original.getNgayGhiNhan());
          // Căn cứ điều chỉnh chi phí phải có trước khoản nhận hoàn thực tế.
          for (Long source : new HashSet<>(before.latestIds().values()))
            requireSourceTime(events, source, at);
        }
        costs =
            new Costs(
                    before.confirmed(),
                    before.latestIds(),
                    before.netPaid(),
                    before.transactions(),
                    before.total(),
                    before.paid().add(outgoing ? value : BigDecimal.ZERO),
                    before.refunded().add(outgoing ? BigDecimal.ZERO : value))
                .summary();
      }
    }
    repository.lockReferenceRegistry(code);
    if (repository.referenceExists(input.get("ma_chung_tu_tham_chieu").toString()))
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_MONEY_REFERENCE_DUPLICATED,
          "ma_chung_tu_tham_chieu",
          "MONEY_REFERENCE_DUPLICATED");
    String prefix = outgoing ? "PC-BH-" : "PT-BH-";
    var voucher =
        cashbook.createAutomatic(
            CashbookService.AutomaticVoucher.builder()
                .khoaNghiepVu(prefix + UUID.randomUUID())
                .maLoaiThuChi(code)
                .loaiPhieu(outgoing ? LoaiPhieuThuChi.CHI : LoaiPhieuThuChi.THU)
                .nhomNguoiNopNhan(
                    customer ? NhomNguoiNopNhanEnum.KHACH_HANG : NhomNguoiNopNhanEnum.NHA_CUNG_CAP)
                .nguoiNopNhan(customer ? ticket.getKhachHang() : null)
                .nhaCungCap(supplier)
                .tenDoiTuongTuDo(input.get("ten_nguoi_nop_nhan").toString())
                .maChungTuThamChieu(input.get("ma_chung_tu_tham_chieu").toString())
                .soTien(value)
                .phuongThucThanhToan(input.get("phuong_thuc_thanh_toan").toString())
                .ngayGhiNhan(at)
                .moTa(description(kind))
                .tags("bao_hanh," + kind.toLowerCase(Locale.ROOT))
                .nguoiTao(repository.actor(actorId))
                .hoaDonBaoHanh(customer ? selected : null)
                .phieuBaoHanh(ticket)
                .build());

    if (voucher.getId() == null) throw invalidHistory();

    vouchers.add(voucher);

    var transaction =
        fields(
            "loai",
            kind,
            "phieu_thu_chi_id",
            voucher.getId(),
            "nha_cung_cap_id",
            supplier == null ? null : supplier.getId(),
            "lien_ket_nguon",
            links,
            "so_tien",
            value,
            "ma_chung_tu_tham_chieu",
            voucher.getMaChungTuThamChieu(),
            "chung_tu_urls",
            input.get("chung_tu_urls"));
    if (allocation != null) transaction.put("phan_bo_chi_phi", allocation);
    var payload = fields("thoi_diem", at.toString(), "giao_dich_tien", transaction);
    if (settlement != null) payload.put("doi_soat_nha_cung_cap", settlement);
    var audit =
        workflow.append(
            ticket,
            actorId,
            "GHI_NHAN_TIEN_BAO_HANH",
            description(kind),
            mapper.writeValueAsString(payload));
    if (audit == null || audit.getId() == null) throw invalidHistory();
    repository.flush();
    if (!customer)
      selected =
          invoices.stream()
              .filter(i -> i.getTrangThai() == TrangThaiHoaDonBaoHanh.HIEU_LUC)
              .findFirst()
              .orElse(null);
    var response = new AdminWarrantyMoneyResponse();
    response.putAll(
        fields(
            "loai",
            kind,
            "phieu_thu_chi",
            fields(
                "id",
                voucher.getId(),
                "ma_phieu",
                voucher.getMaPhieu(),
                "loai_phieu",
                voucher.getLoaiPhieu(),
                "so_tien",
                voucher.getSoTien(),
                "trang_thai",
                voucher.getTrangThai(),
                "nguon_tao",
                voucher.getNguonTao(),
                "hoa_don_bao_hanh_id",
                customer ? selected.getId() : null,
                "phieu_bao_hanh_id",
                id,
                "nha_cung_cap_id",
                supplier == null ? null : supplier.getId(),
                "nhom_nguoi_nop_nhan",
                voucher.getNhomNguoiNopNhan(),
                "ten_nguoi_nop_nhan",
                voucher.getTenNguoiNopNhan(),
                "phuong_thuc_thanh_toan",
                voucher.getPhuongThucThanhToan(),
                "ngay_ghi_nhan",
                WarrantyReadValidation.time(voucher.getNgayGhiNhan()),
                "ma_chung_tu_tham_chieu",
                voucher.getMaChungTuThamChieu(),
                "nguoi_tao_id",
                actorId,
                "chung_tu_urls",
                input.get("chung_tu_urls")),
            "hoa_don",
            selected == null ? null : WarrantyFinanceCalculator.invoice(selected, vouchers),
            "chi_phi_don_vi",
            costs,
            "doi_soat_ncc",
            settlement == null
                ? null
                : fields(
                    "nghia_vu_lich_su_id", settlement.get("nghia_vu_lich_su_id"),
                    "so_luong_con_bu", settlement.get("so_luong_con_bu"),
                    "so_tien_nghia_vu", settlement.get("so_tien_nghia_vu"),
                    "so_tien_da_nhan", settlement.get("so_tien_da_nhan"),
                    "so_tien_con_doi_soat", settlement.get("so_tien_con_doi_soat"),
                    "da_giai_quyet", settlement.get("da_giai_quyet")),
            "lien_ket_nguon",
            links));
    return mutations.complete(replay, 201, description(kind), response);
  }

  private void requireConsent(
      PhieuBaoHanh ticket, HoaDonBaoHanh invoice, List<LichSuBaoHanh> events, OffsetDateTime at) {
    var versions =
        WarrantyQuoteSnapshots.load(history, ticket, events, details.findFees(ticket.getId()));
    var quote = versions.get(invoice.getPhienBanBaoGia());
    if (quote == null) throw invalidHistory();
    WarrantyInvoiceAdjustments.validate(invoice, quote, events, history);
    var consent = history.object(quote.get("quyet_dinh"));
    if (!"DONG_Y".equals(quote.get("trang_thai"))
        || Boolean.TRUE.equals(quote.get("da_huy"))
        || consent == null
        || !"DONG_Y".equals(consent.get("quyet_dinh"))
        || history.time(consent.get("thoi_diem")) == null
        || history.text(consent.get("kenh")) == null
        || history.array(consent.get("bang_chung_urls")).isEmpty()) throw unapproved();
    var accepted = history.time(consent.get("thoi_diem"));
    var deadline = history.time(quote.get("han_phan_hoi"));
    if (deadline == null
        || accepted.isAfter(deadline)
        || at.isBefore(accepted.truncatedTo(java.time.temporal.ChronoUnit.SECONDS)))
      throw unapproved();
  }

  private static WarrantyReadException unapproved() {
    return WarrantyReadException.of(
        ErrorCode.WARRANTY_QUOTE_NOT_APPROVED, "hoa_don_bao_hanh_id", "QUOTE_NOT_APPROVED");
  }

  private void requireSourceTime(List<LichSuBaoHanh> events, Long source, OffsetDateTime at) {
    var event = events.stream().filter(e -> source.equals(e.getId())).findFirst().orElseThrow();
    if (event.getNgayTao() != null) notBefore(at, event.getNgayTao());
  }

  private void notBefore(OffsetDateTime at, LocalDateTime created) {
    if (at.isBefore(
        WarrantyReadValidation.time(created).truncatedTo(java.time.temporal.ChronoUnit.SECONDS)))
      throw stale();
  }

  private static String description(String kind) {
    return switch (kind) {
      case "THU_KHACH" -> "Ghi nhận thu tiền khách bảo hành thành công";
      case "HOAN_KHACH" -> "Ghi nhận hoàn tiền khách bảo hành thành công";
      case "CHI_DON_VI" -> "Ghi nhận chi tiền đơn vị bảo hành thành công";
      case "THU_HOAN_DON_VI" -> "Ghi nhận tiền đơn vị hoàn chi thành công";
      case "THU_DOI_SOAT_DON_VI" -> "Ghi nhận thu đối soát đơn vị bảo hành thành công";
      default -> throw WarrantyMoneyValidation.invalid();
    };
  }
}
