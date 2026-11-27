package com.example.dantruventu.Services.printing;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.printing.SalesSlipReadRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class SalesSlipPrintSource {
  private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
  private static final String NOT_STORED = "Chưa lưu phân bổ";
  private final DonHangRepository orders;
  private final ChiTietDonHangRepository lines;
  private final SalesSlipReadRepository related;

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public PrintDocument load(Long id) {
    if (id == null || id <= 0) throw new AppException(ErrorCode.INVALID_PRINT_REQUEST);
    DonHang order =
        orders.findById(id).orElseThrow(() -> new AppException(ErrorCode.PRINT_RECORD_NOT_FOUND));
    if (blank(order.getMaDonHang())
        || order.getLoaiDonHang() == null
        || order.getNgayTao() == null
        || order.getTrangThaiDonHang() == null
        || order.getTrangThaiThanhToan() == null
        || blank(order.getPhuongThucThanhToan())) throw conflict();
    BigDecimal subtotal = moneyValue(order.getTongTienHang());
    BigDecimal discount = moneyValue(order.getTienChietKhau());
    BigDecimal shipping = moneyValue(order.getPhiGiaoHang());
    BigDecimal total = moneyValue(order.getTongThanhToan());
    if (discount.compareTo(subtotal) > 0) throw conflict();
    // Chỉ đối chiếu từ các tổng đã chốt, không đọc thuế suất hoặc giá bán hiện tại.
    BigDecimal vat = total.subtract(subtotal).add(discount).subtract(shipping);
    if (vat.signum() < 0) throw conflict();

    List<ChiTietDonHang> orderLines = lines.findByDonHang_IdOrderByIdAsc(id);
    if (orderLines.isEmpty()) throw conflict();
    List<List<String>> itemRows = new ArrayList<>();
    List<List<String>> allocationRows = new ArrayList<>();
    BigDecimal sumAmount = BigDecimal.ZERO;
    BigDecimal sumDiscount = BigDecimal.ZERO;
    BigDecimal sumPaid = BigDecimal.ZERO;
    boolean completeDiscount = true;
    boolean completePaid = true;
    Set<Long> lineIds = new HashSet<>();
    for (ChiTietDonHang line : orderLines) {
      PhienBanSanPham variant = line.getPhienBan();
      if (line.getId() == null
          || !lineIds.add(line.getId())
          || line.getDonHang() == null
          || !id.equals(line.getDonHang().getId())
          || line.getSoLuong() == null
          || line.getSoLuong() <= 0
          || line.getLaQuaTang() == null
          || variant == null
          || variant.getId() == null
          || blank(variant.getTenPhienBan())
          || variant.getSanPham() == null
          || variant.getSanPham().getId() == null
          || blank(variant.getSanPham().getMaSanPham())
          || blank(variant.getSanPham().getTenSanPham())) throw conflict();
      BigDecimal unit = moneyValue(line.getDonGia());
      BigDecimal amount = moneyValue(line.getThanhTien());
      if (unit.multiply(BigDecimal.valueOf(line.getSoLuong())).compareTo(amount) != 0)
        throw conflict();
      BigDecimal lineDiscount =
          line.getTienChietKhau() == null ? null : moneyValue(line.getTienChietKhau());
      BigDecimal linePaid =
          line.getThanhToanDong() == null ? null : moneyValue(line.getThanhToanDong());
      if (lineDiscount != null && lineDiscount.compareTo(amount) > 0) throw conflict();
      if (linePaid != null
          && lineDiscount != null
          && linePaid.compareTo(amount.subtract(lineDiscount)) < 0) throw conflict();
      sumAmount = sumAmount.add(amount);
      completeDiscount &= lineDiscount != null;
      completePaid &= linePaid != null;
      if (lineDiscount != null) sumDiscount = sumDiscount.add(lineDiscount);
      if (linePaid != null) sumPaid = sumPaid.add(linePaid);
      itemRows.add(
          List.of(
              String.valueOf(line.getId()),
              variant.getSanPham().getTenSanPham(),
              String.valueOf(line.getSoLuong()),
              money(unit),
              money(amount),
              Boolean.TRUE.equals(line.getLaQuaTang()) ? "Quà tặng" : "Hàng bán"));
      allocationRows.add(
          List.of(
              String.valueOf(line.getId()),
              lineDiscount == null ? NOT_STORED : money(lineDiscount),
              linePaid == null ? NOT_STORED : money(linePaid)));
    }
    if (sumAmount.compareTo(subtotal) != 0
        || sumDiscount.compareTo(discount) > 0
        || sumPaid.compareTo(total.subtract(shipping)) > 0
        || (completeDiscount && sumDiscount.compareTo(discount) != 0)
        || (completePaid && sumPaid.add(shipping).compareTo(total) != 0)) throw conflict();
    validatePartialAllocations(orderLines, discount, vat);

    boolean cancelled = order.getTrangThaiDonHang() == TrangThaiDonHang.HUY_HANG;
    boolean completed = order.getTrangThaiDonHang() == TrangThaiDonHang.HOAN_THANH;
    List<PrintDocument.Section> sections = new ArrayList<>();
    sections.add(
        new PrintDocument.Section(
            "THÔNG TIN ĐƠN BÁN",
            List.of("Nội dung", "Thông tin"),
            List.of(
                row("Mã đơn", order.getMaDonHang()),
                row("Ngày lập đơn", DATE.format(order.getNgayTao())),
                row(
                    "Kênh bán",
                    order.getLoaiDonHang() == LoaiDonHang.TAI_QUAY ? "Tại quầy" : "Trực tuyến"),
                row(
                    "Loại bản in",
                    cancelled
                        ? "ĐÃ HỦY"
                        : completed ? "Đơn đã hoàn tất" : "TẠM TÍNH - Đơn chưa hoàn tất"),
                row("Trạng thái đơn", status(order.getTrangThaiDonHang())),
                row(
                    "Trạng thái thanh toán trên đơn",
                    order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN
                        ? "Đã thanh toán"
                        : "Chưa thanh toán"),
                row("Phương thức thanh toán đã lưu", payment(order.getPhuongThucThanhToan())),
                row("Mã giao dịch đã lưu", optional(order.getMaGiaoDichThanhToan())),
                row("Ghi chú trên đơn", optional(order.getGhiChu())))));
    sections.add(
        new PrintDocument.Section(
            "KHÁCH HÀNG VÀ LIÊN HỆ",
            List.of("Nội dung", "Thông tin"),
            List.of(
                row("Người nhận đã lưu trên đơn", optional(order.getTenNguoiNhan())),
                row("Số điện thoại đã lưu trên đơn", optional(order.getSdtNguoiNhan())),
                row("Địa chỉ đã lưu trên đơn", optional(order.getDiaChiGiaoHang())),
                row(
                    "Tài khoản khách hàng",
                    account(order.getKhachHang(), "Đơn không gắn tài khoản khách hàng")),
                row(
                    "Nhân viên phụ trách",
                    account(order.getNhanVien(), "Chưa lưu nhân viên phụ trách")))));
    sections.add(
        new PrintDocument.Section(
            "CHI TIẾT HÀNG TRÊN ĐƠN GỐC",
            List.of("Dòng gốc", "Sản phẩm", "SL", "Đơn giá gốc", "Tiền hàng", "Loại dòng"),
            itemRows));
    sections.add(
        new PrintDocument.Section(
            "PHÂN BỔ ĐÃ LƯU THEO DÒNG",
            List.of("Dòng gốc", "Giảm giá dòng", "Thanh toán dòng"),
            allocationRows));
    sections.add(
        new PrintDocument.Section(
            "TỔNG TIỀN ĐƠN GỐC",
            List.of("Nội dung", "Số tiền"),
            List.of(
                row("Tổng tiền hàng trước giảm và VAT", money(subtotal)),
                row("Chiết khấu đã lưu", money(discount)),
                row("VAT đối chiếu từ tổng đã lưu", money(vat)),
                row("Phí giao hàng đã lưu", money(shipping)),
                row("Tổng thanh toán gốc", money(total)))));
    addReturnsAndMoney(order, sections);
    return new PrintDocument(
        completed || cancelled ? "PHIẾU BÁN HÀNG" : "PHIẾU BÁN HÀNG - TẠM TÍNH",
        order.getMaDonHang(),
        sections,
        List.of(),
        List.of("NGƯỜI LẬP PHIẾU", "KHÁCH HÀNG"),
        cancelled);
  }

  private void validatePartialAllocations(
      List<ChiTietDonHang> orderLines, BigDecimal discount, BigDecimal vat) {
    BigDecimal knownPaymentMinimum = BigDecimal.ZERO;
    BigDecimal knownPaymentMaximum = BigDecimal.ZERO;
    BigDecimal unknownPaymentMinimum = BigDecimal.ZERO;
    BigDecimal unknownPaymentMaximum = BigDecimal.ZERO;
    BigDecimal knownPaymentDifference = BigDecimal.ZERO;
    // Kiểm tra có thể phân bổ nhất quán các phần còn thiếu; không tự điền hoặc lưu phân bổ mới.
    for (ChiTietDonHang line : orderLines) {
      BigDecimal amount = line.getThanhTien();
      BigDecimal paid = line.getThanhToanDong();
      BigDecimal savedDiscount = line.getTienChietKhau();
      BigDecimal minimum =
          savedDiscount != null
              ? savedDiscount
              : paid == null ? BigDecimal.ZERO : amount.subtract(paid).max(BigDecimal.ZERO);
      BigDecimal maximum = savedDiscount != null ? savedDiscount : amount;
      if (minimum.compareTo(maximum) > 0) throw conflict();
      if (paid == null) {
        unknownPaymentMinimum = unknownPaymentMinimum.add(minimum);
        unknownPaymentMaximum = unknownPaymentMaximum.add(maximum);
      } else {
        knownPaymentMinimum = knownPaymentMinimum.add(minimum);
        knownPaymentMaximum = knownPaymentMaximum.add(maximum);
        knownPaymentDifference = knownPaymentDifference.add(paid.subtract(amount));
      }
    }
    BigDecimal minimum = knownPaymentMinimum.max(discount.subtract(unknownPaymentMaximum));
    BigDecimal maximum =
        knownPaymentMaximum
            .min(discount.subtract(unknownPaymentMinimum))
            .min(vat.subtract(knownPaymentDifference));
    if (minimum.compareTo(maximum) > 0) throw conflict();
  }

  private void addReturnsAndMoney(DonHang order, List<PrintDocument.Section> sections) {
    Long orderId = order.getId();
    List<PhieuTraHang> returns = related.findReturns(orderId);
    List<SoQuyThuChi> vouchers = related.findMoney(orderId, order.getMaDonHang());
    Map<Long, PhieuTraHang> byId = new HashMap<>();
    Map<String, PhieuTraHang> byCode = new HashMap<>();
    List<List<String>> returnRows = new ArrayList<>();
    for (PhieuTraHang returned : returns) {
      if (returned.getId() == null
          || byId.putIfAbsent(returned.getId(), returned) != null
          || blank(returned.getMaTraHang())
          || byCode.putIfAbsent(returned.getMaTraHang(), returned) != null
          || returned.getDonHang() == null
          || !orderId.equals(returned.getDonHang().getId())
          || returned.getTrangThaiTraHang() == null
          || returned.getNgayTao() == null) throw conflict();
      BigDecimal refund = moneyValue(returned.getTongTienHoan());
      returnRows.add(
          List.of(
              returned.getMaTraHang(),
              DATE.format(returned.getNgayTao()),
              returnStatus(returned.getTrangThaiTraHang()),
              money(refund),
              optional(returned.getLyDoTra())));
    }
    if (!returnRows.isEmpty())
      sections.add(
          new PrintDocument.Section(
              "PHIẾU TRẢ HÀNG LIÊN QUAN",
              List.of("Mã phiếu trả", "Ngày lập", "Trạng thái", "Tiền hoàn trên phiếu", "Lý do"),
              returnRows));
    if (vouchers.isEmpty()) return;
    List<List<String>> cashRows = new ArrayList<>();
    Set<Long> cashIds = new HashSet<>();
    for (SoQuyThuChi voucher : vouchers) {
      PhieuTraHang returned =
          voucher.getPhieuTraHang() == null
              ? byCode.get(voucher.getMaChungTuThamChieu())
              : byId.get(voucher.getPhieuTraHang().getId());
      boolean refersOrder = order.getMaDonHang().equals(voucher.getMaChungTuThamChieu());
      if ((returned == null && (!refersOrder || voucher.getPhieuTraHang() != null))
          || voucher.getId() == null
          || !cashIds.add(voucher.getId())
          || blank(voucher.getMaPhieu())
          || voucher.getLoaiPhieu() == null
          || voucher.getTrangThai() == null
          || voucher.getNgayGhiNhan() == null
          || blank(voucher.getPhuongThucThanhToan())
          || (voucher.getPhieuTraHang() != null
              && voucher.getMaChungTuThamChieu() != null
              && !refersOrder
              && (returned == null
                  || !returned.getMaTraHang().equals(voucher.getMaChungTuThamChieu()))))
        throw conflict();
      BigDecimal amount = moneyValue(voucher.getSoTien());
      if (amount.signum() <= 0) throw conflict();
      cashRows.add(
          List.of(
              voucher.getMaPhieu(),
              returned == null ? order.getMaDonHang() : returned.getMaTraHang(),
              voucher.getLoaiPhieu() == LoaiPhieuThuChi.CHI ? "Chi" : "Thu",
              DATE.format(voucher.getNgayGhiNhan()),
              money(amount),
              payment(voucher.getPhuongThucThanhToan()),
              voucher.getTrangThai() == TrangThaiPhieuThuChi.HUY ? "ĐÃ HỦY" : "Đã ghi nhận"));
    }
    sections.add(
        new PrintDocument.Section(
            "THU / CHI LIÊN QUAN ĐƠN VÀ PHIẾU TRẢ",
            List.of(
                "Mã thu / chi",
                "Chứng từ liên kết",
                "Loại",
                "Ngày ghi nhận",
                "Số tiền",
                "Phương thức",
                "Trạng thái"),
            cashRows));
  }

  private String account(NguoiDung user, String missing) {
    if (user == null) return missing;
    if (user.getId() == null || blank(user.getHoTen())) throw conflict();
    return user.getHoTen();
  }

  private BigDecimal moneyValue(BigDecimal value) {
    if (value == null || value.signum() < 0) throw conflict();
    try {
      return value.setScale(2, RoundingMode.UNNECESSARY);
    } catch (ArithmeticException exception) {
      throw conflict();
    }
  }

  private String money(BigDecimal value) {
    NumberFormat formatter = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
    formatter.setMaximumFractionDigits(2);
    return formatter.format(value) + " đ";
  }

  private String status(TrangThaiDonHang status) {
    return switch (status) {
      case CHO_DUYET -> "Chờ duyệt";
      case CHO_THANH_TOAN -> "Chờ thanh toán";
      case CHO_DONG_GOI -> "Chờ đóng gói";
      case CHO_LAY_HANG -> "Chờ lấy hàng";
      case DANG_GIAO_HANG -> "Đang giao hàng";
      case HOAN_THANH -> "Hoàn thành";
      case HUY_HANG -> "Đã hủy";
    };
  }

  private String returnStatus(TrangThaiTraHang status) {
    return switch (status) {
      case CHO_TIEP_NHAN -> "Chờ tiếp nhận";
      case DA_NHAN_HANG -> "Đã nhận hàng";
      case DA_HOAN_TIEN -> "Đã hoàn tiền theo trạng thái phiếu";
      case HOAN_TAT -> "Hoàn tất";
      case CHO_TRA_KHACH -> "Chờ trả khách";
      case TU_CHOI -> "Từ chối";
      case HUY -> "Đã hủy";
    };
  }

  private String payment(String method) {
    return switch (method) {
      case "TIEN_MAT" -> "Tiền mặt";
      case "CHUYEN_KHOAN" -> "Chuyển khoản";
      case "THE" -> "Thẻ";
      case "COD" -> "Thu hộ khi giao hàng";
      default -> method;
    };
  }

  private List<String> row(String key, String value) {
    return List.of(key, value);
  }

  private boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private String optional(String value) {
    return blank(value) ? "Chưa lưu" : value;
  }

  private AppException conflict() {
    return new AppException(ErrorCode.PRINT_SALES_SLIP_CONFLICT);
  }
}
