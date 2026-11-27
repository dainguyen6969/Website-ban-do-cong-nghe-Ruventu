package com.example.dantruventu.Services.printing;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDongGoi;
import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.LichSuXuLyDonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.warehouse.ThanhPhanComboRepository;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DeliveryPrintSource {
  private final PhieuGiaoHangRepository deliveryRepository;
  private final ChiTietDonHangRepository lineRepository;
  private final ThanhPhanComboRepository componentRepository;
  private final LichSuXuLyDonHangRepository historyRepository;
  private final OrderIssuePrintSource issueSource;

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public PrintDocument load(Long id) {
    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_PRINT_REQUEST);
    }
    PhieuGiaoHang delivery =
        deliveryRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.PRINT_RECORD_NOT_FOUND, "Không tìm thấy phiếu giao hàng"));
    TrangThaiGiaoHangEnum status = delivery.getTrangThaiGiaoHang();
    if (status == null) {
      throw conflict("Phiếu giao hàng thiếu trạng thái để xác định bản in");
    }

    boolean cancelled = status == TrangThaiGiaoHangEnum.HUY_GIAO_HANG;
    boolean handedOver = status != TrangThaiGiaoHangEnum.CHO_GIAO && !cancelled;

    DonHang order = delivery.getDonHang();
    DoiTacVanChuyen partner = delivery.getDoiTacVanChuyen();
    if (order == null || order.getId() == null || partner == null || partner.getId() == null) {
      throw conflict("Phiếu giao hàng thiếu đơn nguồn hoặc đối tác vận chuyển");
    }
    String number = required(delivery.getMaPhieuGiaoHang(), "mã phiếu giao hàng");
    String orderCode = required(order.getMaDonHang(), "mã đơn hàng");
    String recipient = required(order.getTenNguoiNhan(), "tên người nhận");
    String phone = required(order.getSdtNguoiNhan(), "số điện thoại người nhận");
    String address = required(order.getDiaChiGiaoHang(), "địa chỉ giao hàng");
    String partnerCode = required(partner.getMaDoiTac(), "mã đối tác vận chuyển");
    String partnerName = required(partner.getTenDoiTac(), "tên đối tác vận chuyển");
    BigDecimal cod = delivery.getTienThuHoCod();
    if (cod == null || cod.signum() < 0 || delivery.getNgayTao() == null) {
      throw conflict("Phiếu giao hàng thiếu hoặc sai COD, thời điểm lập phiếu");
    }

    List<List<String>> documentRows = new ArrayList<>();
    documentRows.add(row("Phiếu giao hàng", number));
    documentRows.add(row("Đơn hàng nguồn", orderCode));
    documentRows.add(row("Mã vận đơn", optional(delivery.getMaVanDon())));
    documentRows.add(row("Trạng thái phiếu", statusName(status)));
    documentRows.add(
        row("Loại bản in", cancelled ? "ĐÃ HỦY" : handedOver ? "ĐÃ BÀN GIAO" : "BẢN CHUẨN BỊ"));
    documentRows.add(
        row(
            "Ngày lập phiếu",
            delivery.getNgayTao().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))));

    List<List<String>> recipientRows =
        List.of(
            row("Người nhận", recipient),
            row("Số điện thoại", phone),
            row("Địa chỉ", address),
            row(
                "Đối tác vận chuyển (ID / mã / tên tra cứu hiện tại)",
                partner.getId() + " / " + partnerCode + " / " + partnerName),
            row("Liên hệ đối tác hiện tại", optional(partner.getSoDienThoai())));

    List<PrintDocument.Section> sections = new ArrayList<>();
    List<String> notes = new ArrayList<>();
    if (handedOver) {
      LichSuXuLyDonHang handover = requireHandover(delivery);
      documentRows.add(
          row(
              "Ngày bàn giao đối tác",
              handover.getNgayThucHien().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))));
      documentRows.add(
          row(
              "Người bàn giao (ID / tên tra cứu hiện tại)",
              handover.getNguoiThucHien().getId()
                  + " / "
                  + required(handover.getNguoiThucHien().getHoTen(), "tên người bàn giao")));
      // Phiếu xuất gốc chứng minh lượng hàng; không lấy lại cấu hình combo đang bán.
      PrintDocument originalIssue = issueSource.load(order.getId());
      for (PrintDocument.Section section : originalIssue.sections()) {
        if (section.title().equals("HÀNG TRÊN ĐƠN GỐC")
            || section.title().equals("HÀNG / LINH KIỆN THỰC XUẤT")) {
          sections.add(section);
        }
      }
      if (sections.size() != 2) {
        throw conflict("Thiếu dữ liệu hàng xuất gốc để in phiếu giao hàng đã bàn giao");
      }
      notes.add("Người nhận, địa chỉ, đối tác và COD dùng thông tin phiếu đã khóa khi bàn giao.");
      notes.add("Tên đối tác, người thao tác và sản phẩm là tên tra cứu hiện tại theo ID gốc.");
      notes.add("Hàng và số lượng dựa trên chứng từ xuất gốc, không trừ phần đã hoàn kho.");
    } else {
      sections.add(
          new PrintDocument.Section(
              "HÀNG DỰ KIẾN GIAO",
              List.of(
                  "STT",
                  "Mã sản phẩm",
                  "Sản phẩm / phiên bản",
                  "Số lượng",
                  "Loại hàng",
                  "Dòng nguồn"),
              preparedItems(order.getId())));
      notes.add("Danh sách bộ PC/combo trong bản chuẩn bị được tách theo thành phần hiện tại.");
    }
    List<List<String>> collectionRows =
        List.of(
            row(handedOver ? "COD yêu cầu thu hộ khi bàn giao" : "COD dự kiến", money(cod)),
            row("Ghi chú đơn hàng", optional(order.getGhiChu())));

    if (cancelled) {
      notes.add("ĐÃ HỦY - Phiếu này không có giá trị bàn giao hoặc yêu cầu thu tiền.");
      notes.add("Thông tin chuẩn bị lấy từ hồ sơ hiện tại, không xác nhận đã giao hàng.");
    } else if (!handedOver) {
      notes.add("BẢN CHUẨN BỊ - Chưa xác nhận đã bàn giao hàng cho đối tác vận chuyển.");
      notes.add("Hàng, người nhận, đối tác và COD là thông tin dự kiến tại thời điểm in.");
    }
    notes.add("COD là khoản yêu cầu đối tác thu hộ, không phải xác nhận cửa hàng đã thu tiền.");
    sections.add(
        0,
        new PrintDocument.Section(
            "THÔNG TIN PHIẾU", List.of("Nội dung", "Thông tin"), documentRows));
    sections.add(
        1,
        new PrintDocument.Section(
            "NGƯỜI NHẬN VÀ ĐỐI TÁC", List.of("Nội dung", "Thông tin"), recipientRows));
    sections.add(
        new PrintDocument.Section(
            "COD VÀ GHI CHÚ", List.of("Nội dung", "Thông tin"), collectionRows));

    return new PrintDocument(
        "PHIẾU GIAO HÀNG",
        number,
        sections,
        notes,
        List.of("NGƯỜI LẬP PHIẾU", "ĐƠN VỊ VẬN CHUYỂN", "NGƯỜI NHẬN"),
        cancelled);
  }

  private LichSuXuLyDonHang requireHandover(PhieuGiaoHang delivery) {
    DonHang order = delivery.getDonHang();
    if (order.getLoaiDonHang() != LoaiDonHang.ONLINE
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI) {
      throw conflict("Phiếu đã bàn giao không khớp loại đơn hoặc dữ liệu đóng gói");
    }
    boolean returned = delivery.getTrangThaiGiaoHang() == TrangThaiGiaoHangEnum.DA_HOAN_HANG;
    TrangThaiDonHang expected =
        returned
            ? TrangThaiDonHang.HUY_HANG
            : delivery.getTrangThaiGiaoHang() == TrangThaiGiaoHangEnum.GIAO_THANH_CONG
                ? TrangThaiDonHang.HOAN_THANH
                : TrangThaiDonHang.DANG_GIAO_HANG;
    boolean validIssueState =
        returned
            ? order.getTrangThaiXuatKho() == TrangThaiXuatKho.DA_HOAN_KHO
            : order.getTrangThaiXuatKho() == TrangThaiXuatKho.DA_XUAT_KHO
                || (delivery.getTrangThaiGiaoHang() == TrangThaiGiaoHangEnum.GIAO_THANH_CONG
                    && order.getTrangThaiXuatKho() == TrangThaiXuatKho.DA_HOAN_KHO);
    if (order.getTrangThaiDonHang() != expected || !validIssueState) {
      throw conflict("Trạng thái phiếu giao hàng mâu thuẫn với trạng thái đơn hoặc xuất kho");
    }
    BigDecimal total = order.getTongThanhToan();
    if (total == null
        || total.signum() < 0
        || (delivery.getTienThuHoCod().signum() > 0
            && delivery.getTienThuHoCod().compareTo(total) != 0)
        || (delivery.getTienThuHoCod().signum() == 0
            && total.signum() > 0
            && order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN)) {
      throw conflict("COD bàn giao mâu thuẫn với tổng tiền hoặc căn cứ thanh toán của đơn");
    }
    List<LichSuXuLyDonHang> events =
        historyRepository.findByDonHang_IdOrderByNgayThucHienAscIdAsc(order.getId()).stream()
            .filter(event -> "GIAO_VAN_DA_NHAN_HANG".equals(event.getHanhDong()))
            .filter(
                event ->
                    event.getMoTa() != null
                        && event.getMoTa().endsWith("; phiếu " + delivery.getMaPhieuGiaoHang()))
            .toList();
    if (events.size() != 1) {
      throw conflict("Thiếu hoặc trùng chứng cứ bàn giao thực tế của phiếu giao hàng");
    }
    LichSuXuLyDonHang event = events.get(0);
    if (event.getNgayThucHien() == null
        || event.getNgayThucHien().isBefore(delivery.getNgayTao())
        || event.getNguoiThucHien() == null
        || event.getNguoiThucHien().getId() == null
        || event.getTrangThaiDonHang() != TrangThaiDonHang.DANG_GIAO_HANG
        || event.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
        || event.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO) {
      throw conflict("Chứng cứ bàn giao thiếu người thực hiện, thời điểm hoặc trạng thái hợp lệ");
    }
    return event;
  }

  private List<List<String>> preparedItems(Long orderId) {
    List<ChiTietDonHang> lines = lineRepository.findByDonHang_IdOrderByIdAsc(orderId);
    if (lines.isEmpty()) {
      throw conflict("Đơn nguồn không có hàng để lập phiếu giao");
    }
    List<List<String>> rows = new ArrayList<>();
    for (ChiTietDonHang line : lines) {
      PhienBanSanPham variant = line.getPhienBan();
      if (line.getId() == null
          || variant == null
          || variant.getSanPham() == null
          || line.getSoLuong() == null
          || line.getSoLuong() <= 0
          || line.getLaQuaTang() == null) {
        throw conflict("Dòng hàng giao thiếu nhận dạng, số lượng hoặc thông tin quà tặng");
      }
      SanPham product = variant.getSanPham();
      String source = required(product.getTenSanPham(), "tên sản phẩm nguồn");
      if (product.getLoaiSanPham() == LoaiSanPham.DON) {
        addItem(rows, line, variant, line.getSoLuong(), source);
      } else if (product.getLoaiSanPham() == LoaiSanPham.BO_PC) {
        if (product.getId() == null) {
          throw conflict("Bộ PC/combo thiếu nhận dạng để tra thành phần");
        }
        List<ThanhPhanCombo> components =
            componentRepository.findByComboIds(List.of(product.getId()));
        if (components.isEmpty()) {
          throw conflict("Bộ PC/combo không có thành phần để chuẩn bị giao");
        }
        Set<Long> componentIds = new HashSet<>();
        for (ThanhPhanCombo component : components) {
          PhienBanSanPham part = component.getPhienBanThanhPhan();
          if (part == null
              || part.getId() == null
              || part.getSanPham() == null
              || part.getSanPham().getLoaiSanPham() != LoaiSanPham.DON
              || !componentIds.add(part.getId())
              || component.getSoLuong() == null
              || component.getSoLuong() <= 0) {
            throw conflict("Thành phần bộ PC/combo không hợp lệ để chuẩn bị giao");
          }
          long count = (long) line.getSoLuong() * component.getSoLuong();
          if (count > Integer.MAX_VALUE) {
            throw conflict("Số lượng thành phần vượt giới hạn hợp lệ");
          }
          addItem(rows, line, part, (int) count, source);
        }
      } else {
        throw conflict("Dòng hàng có loại sản phẩm không xác định");
      }
    }
    return rows;
  }

  private void addItem(
      List<List<String>> rows,
      ChiTietDonHang line,
      PhienBanSanPham variant,
      int count,
      String source) {
    String code = required(variant.getSanPham().getMaSanPham(), "mã sản phẩm");
    String name = required(variant.getSanPham().getTenSanPham(), "tên sản phẩm");
    String version = required(variant.getTenPhienBan(), "tên phiên bản");
    rows.add(
        List.of(
            Integer.toString(rows.size() + 1),
            code,
            name + " / " + version,
            Integer.toString(count),
            Boolean.TRUE.equals(line.getLaQuaTang()) ? "Quà tặng" : "Hàng bán",
            source + " (dòng " + line.getId() + ")"));
  }

  private static String money(BigDecimal amount) {
    return NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN")).format(amount) + " đ";
  }

  private static String statusName(TrangThaiGiaoHangEnum status) {
    return switch (status) {
      case CHO_GIAO -> "Chờ giao";
      case DA_NHAN_HANG -> "Đối tác đã nhận hàng";
      case DANG_GIAO -> "Đang giao";
      case GIAO_THANH_CONG -> "Giao thành công";
      case GIAO_THAT_BAI -> "Giao thất bại";
      case CHO_HOAN_HANG -> "Chờ hoàn hàng";
      case DA_HOAN_HANG -> "Đã hoàn hàng";
      case HUY_GIAO_HANG -> "ĐÃ HỦY";
    };
  }

  private static List<String> row(String name, String value) {
    return List.of(name, value);
  }

  private static String optional(String value) {
    return value == null || value.isBlank() ? "Chưa ghi nhận" : value.strip();
  }

  private static String required(String value, String name) {
    if (value == null || value.isBlank()) {
      throw conflict("Thiếu " + name + " để in phiếu giao hàng");
    }
    return value.strip();
  }

  private static AppException conflict(String message) {
    return new AppException(ErrorCode.PRINT_HISTORY_CONFLICT, message);
  }
}
