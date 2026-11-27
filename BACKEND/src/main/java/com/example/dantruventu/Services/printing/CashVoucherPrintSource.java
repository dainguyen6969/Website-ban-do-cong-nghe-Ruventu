package com.example.dantruventu.Services.printing;

import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CashVoucherPrintSource {
  private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
  private final SoQuyThuChiRepository repository;

  public PrintDocument load(Long id, LoaiPhieuThuChi type) {
    SoQuyThuChi voucher =
        repository
            .findByIdAndLoaiPhieu(id, type)
            .orElseThrow(() -> new AppException(ErrorCode.PRINT_RECORD_NOT_FOUND));
    boolean receipt = type == LoaiPhieuThuChi.THU;
    boolean cancelled = voucher.getTrangThai() == TrangThaiPhieuThuChi.HUY;
    if (voucher.getSoTien() == null
        || voucher.getSoTien().signum() <= 0
        || (!cancelled && voucher.getNgayGhiNhan() == null)
        || blank(voucher.getMaPhieu())
        || blank(voucher.getTenNguoiNopNhan())
        || blank(voucher.getPhuongThucThanhToan())
        || voucher.getTrangThai() == null
        || voucher.getNguonTao() == null
        || voucher.getLoaiThuChi() == null) {
      throw new AppException(ErrorCode.PRINT_HISTORY_CONFLICT);
    }
    NumberFormat money = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
    money.setMinimumFractionDigits(0);
    money.setMaximumFractionDigits(2);
    String creator =
        voucher.getNguoiTao() == null ? "Hệ thống" : text(voucher.getNguoiTao().getHoTen());
    List<List<String>> details =
        List.of(
            List.of("Mã phiếu", text(voucher.getMaPhieu())),
            List.of(
                receipt ? "Ngày thu" : "Ngày chi",
                voucher.getNgayGhiNhan() == null
                    ? "Chưa có dữ liệu ngày ghi nhận trong phiếu gốc"
                    : voucher.getNgayGhiNhan().format(DATE)),
            List.of(
                receipt ? "Người nộp tiền" : "Người nhận tiền", text(voucher.getTenNguoiNopNhan())),
            List.of("Số tiền", money.format(voucher.getSoTien()) + " VNĐ"),
            List.of("Phương thức thanh toán", payment(voucher.getPhuongThucThanhToan())),
            List.of(
                "Loại thu/chi",
                voucher.getLoaiThuChi() == null ? "-" : text(voucher.getLoaiThuChi().getTenLoai())),
            List.of(receipt ? "Nội dung thu" : "Lý do chi", text(voucher.getMoTa())),
            List.of("Chứng từ tham chiếu", text(voucher.getMaChungTuThamChieu())),
            List.of("Người lập", creator),
            List.of(
                "Nguồn lập",
                switch (voucher.getNguonTao()) {
                  case THU_CONG -> "Thủ công";
                  case TU_DONG -> "Tự động";
                }),
            List.of(
                "Trạng thái",
                voucher.getTrangThai() == TrangThaiPhieuThuChi.HUY ? "ĐÃ HỦY" : "Đã ghi nhận"));
    return new PrintDocument(
        receipt ? "PHIẾU THU" : "PHIẾU CHI",
        text(voucher.getMaPhieu()),
        List.of(new PrintDocument.Section("THÔNG TIN PHIẾU", List.of(), details)),
        cancelled
            ? List.of(
                "Phiếu phản ánh khoản tiền đã được lưu. In lại không phát sinh giao dịch thu/chi mới.",
                "Phiếu đã hủy được giữ nguyên số tiền gốc để tra cứu, không xác nhận một khoản thu/chi còn hiệu lực.")
            : List.of(
                "Phiếu phản ánh khoản tiền đã được lưu. In lại không phát sinh giao dịch thu/chi mới."),
        List.of("NGƯỜI LẬP PHIẾU", receipt ? "NGƯỜI NỘP TIỀN" : "NGƯỜI NHẬN TIỀN", "THỦ QUỸ"),
        cancelled);
  }

  private String text(String value) {
    return value == null || value.isBlank() ? "-" : value;
  }

  private boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private String payment(String value) {
    if (value == null) return "-";
    return switch (value) {
      case "TIEN_MAT" -> "Tiền mặt";
      case "CHUYEN_KHOAN" -> "Chuyển khoản";
      case "THE" -> "Thẻ";
      default -> value;
    };
  }
}
