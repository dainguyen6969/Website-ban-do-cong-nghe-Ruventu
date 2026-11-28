package com.example.dantruventu.Services.printing;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.LichSuXuLyDonHangRepository;
import com.example.dantruventu.Repository.printing.OrderIssueEvidenceRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class OrderIssuePrintSource {
  private final DonHangRepository orders;
  private final ChiTietDonHangRepository lines;
  private final TheKhoRepository ledgers;
  private final LichSuXuLyDonHangRepository histories;
  private final SoSerialSanPhamRepository serials;
  private final SoQuyThuChiRepository cash;
  private final OrderIssueEvidenceRepository evidence;

  private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");

  private record Exporter(String name, LocalDateTime time, String source) {}

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public PrintDocument load(Long id) {
    if (id == null || id <= 0) throw new AppException(ErrorCode.INVALID_PRINT_REQUEST);
    DonHang order =
        orders.findById(id).orElseThrow(() -> new AppException(ErrorCode.PRINT_RECORD_NOT_FOUND));
    if (blank(order.getMaDonHang())
        || order.getLoaiDonHang() == null
        || order.getTrangThaiXuatKho() == null
        || order.getTrangThaiXuatKho() == TrangThaiXuatKho.CHUA_XUAT_KHO) {
      throw conflict("Đơn hàng chưa có nghiệp vụ xuất kho được xác nhận.");
    }
    List<TheKho> movements =
        ledgers.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(id, LoaiGiaoDichKho.XUAT_BAN);
    List<ChiTietDonHang> saleLines = lines.findByDonHang_IdOrderByIdAsc(id);
    if (movements.isEmpty() || saleLines.isEmpty())
      throw conflict("Thiếu thẻ kho xuất bán hoặc dòng đơn gốc.");
    Exporter exporter = exporter(order);

    Map<Long, Long> issued = new LinkedHashMap<>();
    Map<Long, PhienBanSanPham> variants = new LinkedHashMap<>();
    Set<String> movementKeys = new HashSet<>();
    for (TheKho movement : movements) {
      if (movement.getId() == null
          || !id.equals(movement.getMaChungTuGoc())
          || movement.getLoaiGiaoDich() != LoaiGiaoDichKho.XUAT_BAN
          || movement.getSoLuongThayDoi() == null
          || movement.getSoLuongThayDoi() >= 0
          || movement.getNgayTao() == null
          || movement.getKhoHang() == null
          || movement.getKhoHang().getId() == null
          || blank(movement.getKhoHang().getTenKho())
          || movement.getPhieuBaoHanh() != null
          || movement.getPhieuTraHang() != null) {
        throw conflict("Thẻ kho xuất bán thiếu hoặc mâu thuẫn dữ liệu gốc.");
      }
      PhienBanSanPham variant = requireVariant(movement.getPhienBan());
      if (variant.getSanPham().getLoaiSanPham() != LoaiSanPham.DON
          || !movementKeys.add(movement.getKhoHang().getId() + ":" + variant.getId())) {
        throw conflict("Thẻ kho không xác định duy nhất lượng linh kiện thực xuất.");
      }
      issued.merge(variant.getId(), -(long) movement.getSoLuongThayDoi(), Long::sum);
      variants.put(variant.getId(), variant);
    }

    boolean hasCombo = false;
    Map<Long, Long> simpleQuantities = new HashMap<>();
    List<List<String>> orderRows = new ArrayList<>();
    for (ChiTietDonHang line : saleLines) {
      PhienBanSanPham variant = requireVariant(line.getPhienBan());
      if (line.getId() == null
          || line.getSoLuong() == null
          || line.getSoLuong() <= 0
          || line.getLaQuaTang() == null)
        throw conflict("Dòng đơn gốc thiếu số lượng hoặc phân loại quà tặng.");
      boolean combo = variant.getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC;
      if (variant.getSanPham().getLoaiSanPham() == null)
        throw conflict("Dòng đơn gốc thiếu loại sản phẩm.");
      hasCombo |= combo;
      if (!combo) simpleQuantities.merge(variant.getId(), (long) line.getSoLuong(), Long::sum);
      orderRows.add(
          List.of(
              String.valueOf(line.getId()),
              variant.getSanPham().getMaSanPham(),
              variant.getSanPham().getTenSanPham(),
              variant.getTenPhienBan(),
              String.valueOf(line.getSoLuong()),
              Boolean.TRUE.equals(line.getLaQuaTang())
                  ? "Quà tặng"
                  : combo ? "Bộ PC / combo" : "Hàng bán"));
    }
    for (var required : simpleQuantities.entrySet()) {
      if (issued.getOrDefault(required.getKey(), 0L) < required.getValue()) {
        throw conflict("Lượng thực xuất thiếu so với dòng đơn gốc.");
      }
    }
    if (!hasCombo && !issued.equals(simpleQuantities))
      throw conflict("Lượng thực xuất không khớp dòng đơn gốc.");

    Map<Long, List<SoSerialSanPham>> byVariant = new HashMap<>();
    Set<Long> serialIds = new HashSet<>();
    Set<String> serialCodes = new HashSet<>();
    Set<Long> replacementSerialIds = new HashSet<>(evidence.findReplacementSerialIds(id));
    for (SoSerialSanPham serial : serials.findByDonHang_IdOrderByIdAsc(id)) {
      // Serial bàn giao đổi bảo hành có thể liên kết đơn cũ, nhưng không thuộc lần xuất bán gốc.
      if (replacementSerialIds.contains(serial.getId())) continue;
      if (serial.getId() == null
          || !serialIds.add(serial.getId())
          || blank(serial.getSoSerial())
          || !serialCodes.add(serial.getSoSerial())
          || serial.getPhienBan() == null
          || !issued.containsKey(serial.getPhienBan().getId())
          || serial.getDonHang() == null
          || !id.equals(serial.getDonHang().getId())) {
        throw conflict("Serial liên kết với đơn không khớp hàng thực xuất.");
      }
      byVariant
          .computeIfAbsent(serial.getPhienBan().getId(), ignored -> new ArrayList<>())
          .add(serial);
    }
    for (var entry : variants.entrySet()) {
      List<SoSerialSanPham> assigned = byVariant.getOrDefault(entry.getKey(), List.of());
      boolean managed =
          Boolean.TRUE.equals(entry.getValue().getCoQuanLySerial())
              || !assigned.isEmpty()
              || serials.countByPhienBanId(entry.getKey()) > 0;
      if (entry.getValue().getCoQuanLySerial() == null
          || (managed && assigned.size() != issued.get(entry.getKey()))) {
        // Serial đã bị gỡ khi hoàn kho không thể suy lại từ tồn hoặc trạng thái hiện tại.
        throw conflict("Thiếu danh sách serial thực xuất gốc; cần đối chiếu lịch sử trước khi in.");
      }
      long warehouseCount =
          movements.stream()
              .filter(m -> entry.getKey().equals(m.getPhienBan().getId()))
              .map(m -> m.getKhoHang().getId())
              .distinct()
              .count();
      if (managed && warehouseCount != 1) throw conflict("Thiếu liên kết serial với kho xuất gốc.");
    }

    List<List<String>> physicalRows = new ArrayList<>();
    for (TheKho movement : movements) {
      PhienBanSanPham variant = movement.getPhienBan();
      String codes =
          String.join(
              "\n",
              byVariant.getOrDefault(variant.getId(), List.of()).stream()
                  .map(SoSerialSanPham::getSoSerial)
                  .toList());
      physicalRows.add(
          List.of(
              String.valueOf(movement.getId()),
              movement.getKhoHang().getTenKho(),
              variant.getSanPham().getMaSanPham(),
              variant.getSanPham().getTenSanPham() + "\n" + variant.getTenPhienBan(),
              String.valueOf(-(long) movement.getSoLuongThayDoi()),
              codes.isEmpty() ? "Không quản lý serial" : codes,
              DATE.format(movement.getNgayTao())));
    }
    List<String> notes = new ArrayList<>();
    notes.add(
        "Phiếu xác nhận lượng xuất bán gốc theo thẻ kho; không trừ các lần nhập trả hoặc hoàn kho phát sinh sau đó.");
    notes.add(
        "Tên sản phẩm, phiên bản và kho là tên tra cứu hiện tại; số lượng và ngày xuất lấy từ thẻ kho gốc.");
    notes.add("Người thực hiện được đối chiếu từ " + exporter.source() + ".");
    if (hasCombo)
      notes.add(
          "Linh kiện của bộ PC/combo được liệt kê theo thẻ kho thực xuất; không dùng cấu hình combo hiện tại để suy lại số lượng.");
    if (order.getTrangThaiXuatKho() == TrangThaiXuatKho.DA_HOAN_KHO)
      notes.add("Đơn đã hoàn kho. Đây là bản in nghiệp vụ xuất kho gốc.");
    return new PrintDocument(
        "PHIẾU XUẤT KHO",
        "PX-" + order.getMaDonHang(),
        List.of(
            new PrintDocument.Section(
                "THÔNG TIN XUẤT KHO",
                List.of("Nội dung", "Thông tin"),
                List.of(
                    List.of("Đơn nguồn", order.getMaDonHang()),
                    List.of(
                        "Kênh bán",
                        order.getLoaiDonHang() == LoaiDonHang.TAI_QUAY ? "Tại quầy" : "Trực tuyến"),
                    List.of("Người xuất", exporter.name()),
                    List.of("Thời điểm xác nhận xuất", DATE.format(exporter.time())))),
            new PrintDocument.Section(
                "HÀNG TRÊN ĐƠN GỐC",
                List.of("Dòng", "Mã sản phẩm", "Sản phẩm", "Phiên bản", "Số lượng", "Phân loại"),
                orderRows),
            new PrintDocument.Section(
                "HÀNG / LINH KIỆN THỰC XUẤT",
                List.of(
                    "Thẻ kho",
                    "Kho xuất",
                    "Mã sản phẩm",
                    "Hàng thực xuất",
                    "Số lượng",
                    "Serial thực xuất",
                    "Ngày xuất"),
                physicalRows)),
        List.copyOf(notes),
        List.of("NGƯỜI LẬP PHIẾU", "THỦ KHO", "NGƯỜI NHẬN"),
        false);
  }

  private Exporter exporter(DonHang order) {
    List<LichSuXuLyDonHang> exports =
        histories.findByDonHang_IdOrderByNgayThucHienAscIdAsc(order.getId()).stream()
            .filter(h -> "XUAT_KHO".equals(h.getHanhDong()))
            .toList();
    if (exports.size() == 1) {
      LichSuXuLyDonHang event = exports.get(0);
      if (event.getNgayThucHien() == null
          || event.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO)
        throw conflict("Lịch sử xác nhận xuất kho không hợp lệ.");
      return new Exporter(
          actor(event.getNguoiThucHien()), event.getNgayThucHien(), "lịch sử xác nhận xuất kho");
    }
    if (!exports.isEmpty() || order.getLoaiDonHang() != LoaiDonHang.TAI_QUAY)
      throw conflict("Thiếu hoặc trùng lịch sử người xác nhận xuất kho.");
    SoQuyThuChi receipt =
        cash.findByMaPhieu("THU-POS-" + order.getId())
            .orElseThrow(
                () ->
                    conflict("Thiếu chứng từ gốc xác định người thực hiện bán và xuất tại quầy."));
    if (receipt.getLoaiPhieu() != LoaiPhieuThuChi.THU
        || receipt.getNguonTao() != NguonTaoPhieuThuChi.TU_DONG
        || !order.getMaDonHang().equals(receipt.getMaChungTuThamChieu())
        || receipt.getCreatedAt() == null)
      throw conflict("Chứng từ bán tại quầy không khớp đơn xuất.");
    return new Exporter(
        actor(receipt.getNguoiTao()),
        receipt.getCreatedAt(),
        "chứng từ tự động của giao dịch bán tại quầy");
  }

  private PhienBanSanPham requireVariant(PhienBanSanPham variant) {
    if (variant == null
        || variant.getId() == null
        || blank(variant.getTenPhienBan())
        || variant.getSanPham() == null
        || blank(variant.getSanPham().getTenSanPham())
        || blank(variant.getSanPham().getMaSanPham()))
      throw conflict("Thiếu nhận dạng hàng hóa trên chứng từ gốc.");
    return variant;
  }

  private String actor(NguoiDung actor) {
    if (actor == null || actor.getId() == null || blank(actor.getHoTen()))
      throw conflict("Thiếu người thực hiện xuất kho trong chứng từ gốc.");
    return actor.getHoTen();
  }

  private boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.PRINT_HISTORY_CONFLICT, message);
  }
}
