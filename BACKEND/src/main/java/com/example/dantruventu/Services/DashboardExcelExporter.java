package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.dashboard.AdminDashboardResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.temporal.TemporalAccessor;
import java.util.Collection;
import java.util.Map;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

@Component
public class DashboardExcelExporter {

  public byte[] export(
      AdminDashboardResponse.Summary summary,
      AdminDashboardResponse.Tasks tasks,
      AdminDashboardResponse.BusinessChart chart,
      AdminDashboardResponse.TopProducts products,
      AdminDashboardResponse.Inventory inventory,
      AdminDashboardResponse.SlowMovingProducts slow,
      AdminDashboardResponse.Purchases purchases,
      AdminDashboardResponse.Customers customers,
      AdminDashboardResponse.Cashflow cashflow,
      AdminDashboardResponse.AfterSales afterSales,
      AdminDashboardResponse.Promotions promotions,
      int limit) {
    try (XSSFWorkbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      Styles styles = styles(workbook);
      summarySheet(workbook, styles, summary);
      tasksSheet(workbook, styles, tasks, limit);
      businessSheet(workbook, styles, chart);
      productsSheet(workbook, styles, products, slow, limit);
      inventorySheet(workbook, styles, inventory, limit);
      purchasesSheet(workbook, styles, purchases);
      customersSheet(workbook, styles, customers);
      cashflowSheet(workbook, styles, cashflow);
      afterSalesSheet(workbook, styles, afterSales);
      promotionsSheet(workbook, styles, promotions);
      workbook.write(output);
      return output.toByteArray();
    } catch (IOException exception) {
      throw new IllegalStateException("Không thể tạo file Dashboard", exception);
    }
  }

  public byte[] exportSnapshot(Map<String, Object> snapshots) {

    try (XSSFWorkbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {

      Styles styles = styles(workbook);

      for (var entry : snapshots.entrySet()) {
        Sheet target =
            sheet(
                workbook,
                entry.getKey(),
                styles,
                entry.getKey().toUpperCase(java.util.Locale.ROOT),
                2);

        int row = header(target, 2, styles, "Chỉ tiêu / dữ liệu", "Giá trị");

        snapshotRows(target, row, "", entry.getValue(), styles);

        finish(target, 2);
      }

      workbook.write(output);
      return output.toByteArray();

    } catch (IOException exception) {
      throw new IllegalStateException("Không tạo được báo cáo Dashboard", exception);
    }
  }

  private int snapshotRows(Sheet sheet, int row, String name, Object value, Styles styles) {

    if (row >= 1_048_570) {
      throw new IllegalStateException("Báo cáo vượt giới hạn dòng XLSX");
    }

    if (value instanceof Map<?, ?> fields) {
      if (!name.isBlank()) {
        row = section(sheet, row, snapshotLabel(name), styles);
      }

      for (var field : fields.entrySet()) {
        row = snapshotRows(sheet, row, field.getKey().toString(), field.getValue(), styles);
      }

      return row;
    }

    if (value instanceof Collection<?> items) {
      row = section(sheet, row, snapshotLabel(name), styles);

      if (items.isEmpty()) {
        return info(sheet, row, "Dữ liệu", "Không phát sinh", styles);
      }

      int index = 1;

      for (Object item : items) {
        row = snapshotRows(sheet, row, "Dòng " + index++, item, styles);
      }

      return row;
    }

    Object displayed =
        value instanceof Number && ("id".equals(name) || name.endsWith("_id"))
            ? value.toString()
            : value;

    return info(sheet, row, snapshotLabel(name), displayed, styles);
  }

  private String snapshotLabel(String key) {
    return switch (key) {
      case "cap_nhat_luc" -> "Cập nhật lúc";
      case "bo_loc" -> "Bộ lọc";
      case "tu_ngay" -> "Từ ngày";
      case "den_ngay" -> "Đến ngày";
      case "kenh_ban" -> "Kênh bán";
      case "ky_truoc" -> "Kỳ trước";
      case "ky_hien_tai" -> "Kỳ hiện tại";
      case "kinh_doanh" -> "Kinh doanh";
      case "hien_tai" -> "Hiện tại";
      case "gia_tri" -> "Giá trị";
      case "ty_le_thay_doi" -> "Tỷ lệ thay đổi (%)";
      case "doanh_thu_thuan" -> "Doanh thu thuần trước VAT";
      case "doanh_thu_ban_hang" -> "Tiền hàng trước VAT";
      case "tong_giam_gia" -> "Giảm giá đã chốt";
      case "gia_tri_hang_tra" -> "Hàng nhận trả trước VAT";
      case "gia_tri_trung_binh_don" -> "Giá trị trung bình đơn";
      case "gia_von_uoc_tinh" -> "Giá vốn ước tính theo giá nhập hiện tại";
      case "loi_nhuan_gop_uoc_tinh" -> "Lợi nhuận gộp ước tính";
      case "so_don" -> "Số đơn";
      case "so_luong_ban" -> "Số lượng hàng mua";
      case "so_luong_da_nhan_tra" -> "Số lượng hàng mua đã nhận trả";
      case "so_luong_qua_da_giao" -> "Số lượng quà đã giao";
      case "thuc_thu" -> "Thực thu toàn cửa hàng";
      case "co_cau_kenh" -> "Cơ cấu kênh bán";
      case "tong_thu" -> "Tổng thu";
      case "tong_chi" -> "Tổng chi";
      case "chenh_lech" -> "Chênh lệch thu chi";
      case "trong_ky" -> "Trong kỳ";
      case "so_du_quy_hien_tai", "so_du_quy" -> "Số dư quỹ hiện tại";
      case "bao_hanh" -> "Trạng thái bảo hành";
      case "tra_hang" -> "Trạng thái trả hàng";
      case "tai_chinh_bao_hanh" -> "Nghĩa vụ tài chính bảo hành";
      case "phan_tich_bao_hanh_tra_hang" -> "Phần thu chi hậu mãi nằm trong tổng";
      case "chat_luong_du_lieu" -> "Chất lượng dữ liệu";
      case "canh_bao" -> "Cảnh báo";
      case "message" -> "Nội dung cảnh báo";
      case "code" -> "Mã cảnh báo";
      case "items" -> "Danh sách";
      case "ban_chay" -> "Nhóm sản phẩm đứng đầu theo giới hạn";
      case "ton_lau" -> "Nhóm tồn lâu theo giới hạn";
      case "ten_san_pham" -> "Tên sản phẩm";
      case "ten_phien_ban" -> "Tên phiên bản";
      case "ton_thuc_te" -> "Tồn thực tế";
      case "ton_co_the_ban" -> "Tồn có thể bán";
      case "so_bo_co_the_lap" -> "Số bộ có thể lắp";
      case "so_luong_giu_cho_bao_hanh" -> "Giữ cho bảo hành";
      case "tong_hang_loi" -> "Tổng hàng lỗi";
      case "moc_thoi_gian_kinh_doanh" -> "Mốc thời gian kinh doanh";
      case "moc_thoi_gian_so_quy" -> "Mốc thời gian sổ quỹ";
      case "moc_thoi_gian_thong_ke_ky" -> "Mốc thời gian ưu đãi";
      case "phuong_phap_doanh_thu" -> "Phương pháp doanh thu";
      default -> key.replace('_', ' ');
    };
  }

  private void summarySheet(Workbook workbook, Styles styles, AdminDashboardResponse.Summary data) {
    Sheet sheet = sheet(workbook, "Tổng quan", styles, "TỔNG QUAN RUVENTU", 4);
    int row = 2;
    row = info(sheet, row, "Thời điểm xuất", data.capNhatLuc(), styles);
    row = info(sheet, row, "Từ ngày", data.boLoc().tuNgay(), styles);
    row = info(sheet, row, "Đến ngày", data.boLoc().denNgay(), styles);
    row = info(sheet, row, "Kênh bán", data.boLoc().kenhBan(), styles);
    row = info(sheet, row, "Kỳ chưa kết thúc", data.boLoc().kyChuaKetThuc(), styles);
    row = info(sheet, row, "Kỳ trước từ", data.kyTruoc().tuNgay(), styles);
    row = info(sheet, row, "Kỳ trước đến", data.kyTruoc().denNgay(), styles);
    row++;
    row = section(sheet, row, "KPI", styles);
    row = metric(sheet, row, "Doanh thu thuần", data.kpi().doanhThuThuan(), styles);
    row = metric(sheet, row, "Số đơn", data.kpi().soDon(), styles);
    row = metric(sheet, row, "Số lượng bán", data.kpi().soLuongBan(), styles);
    row = metric(sheet, row, "Thực thu", data.kpi().thucThu(), styles);
    row++;
    row = section(sheet, row, "Kinh doanh", styles);
    row = info(sheet, row, "Doanh thu bán hàng", data.kinhDoanh().doanhThuBanHang(), styles);
    row = info(sheet, row, "Tổng giảm giá", data.kinhDoanh().tongGiamGia(), styles);
    row = info(sheet, row, "Giá trị hàng trả", data.kinhDoanh().giaTriHangTra(), styles);
    row = info(sheet, row, "Giá trị trung bình đơn", data.kinhDoanh().giaTriTrungBinhDon(), styles);
    row = info(sheet, row, "Giá vốn ước tính", data.kinhDoanh().giaVonUocTinh(), styles);
    row = info(sheet, row, "Lợi nhuận gộp ước tính", data.kinhDoanh().loiNhuanGopUocTinh(), styles);
    row = info(sheet, row, "Số dư quỹ hiện tại", data.hienTai().soDuQuy(), styles);
    row =
        info(sheet, row, "Nhân viên đang hoạt động", data.hienTai().nhanVienDangHoatDong(), styles);
    row++;
    row = section(sheet, row, "Cơ cấu kênh", styles);
    row = header(sheet, row, styles, "Kênh", "Doanh thu thuần", "Số đơn", "Tỷ trọng (%)");
    for (AdminDashboardResponse.ChannelMix item : data.coCauKenh()) {
      dataRow(
          sheet,
          row++,
          styles,
          item.kenhBan(),
          item.doanhThuThuan(),
          item.soDon(),
          item.tyTrongDoanhThu());
    }
    note(
        sheet,
        row + 1,
        "Lợi nhuận dùng giá nhập hiện tại, chỉ là ước tính MVP; "
            + "hàng trả được gắn với ngày tạo đơn gốc.",
        styles,
        4);
    finish(sheet, 4);
  }

  private void tasksSheet(
      Workbook workbook, Styles styles, AdminDashboardResponse.Tasks data, int limit) {
    Sheet sheet = sheet(workbook, "Việc cần xử lý", styles, "VIỆC CẦN XỬ LÝ", 6);
    int row = 2;
    row = info(sheet, row, "Phạm vi", data.phamVi(), styles);
    row = info(sheet, row, "Kênh bán", data.kenhBan(), styles);
    row = info(sheet, row, "Ngưỡng chờ (phút)", data.nguongChoPhut(), styles);
    row = info(sheet, row, "Số đơn cần xử lý (DISTINCT)", data.soDonCanXuLy(), styles);
    row = info(sheet, row, "Số đơn chờ lâu", data.soDonChoLau(), styles);
    row++;
    row = section(sheet, row, "Đơn hàng", styles);
    for (Map.Entry<String, Long> entry : data.donHang().entrySet()) {
      row = info(sheet, row, entry.getKey(), entry.getValue(), styles);
    }
    row = section(sheet, row, "Giao hàng", styles);
    for (Map.Entry<String, Long> entry : data.giaoHang().entrySet()) {
      row = info(sheet, row, entry.getKey(), entry.getValue(), styles);
    }
    row = section(sheet, row, "Trả hàng", styles);
    row = info(sheet, row, "Chờ tiếp nhận", data.traHang().choTiepNhan(), styles);
    row = info(sheet, row, "Chờ hoàn tiền", data.traHang().choHoanTien(), styles);
    row = info(sheet, row, "Tổng phiếu cần xử lý", data.traHang().tongPhieuCanXuLy(), styles);
    row++;
    row = section(sheet, row, "Top " + limit + " đơn ưu tiên", styles);
    row =
        header(
            sheet, row, styles, "ID", "Mã đơn", "Trạng thái", "Lý do", "Ngày tạo", "Số phút chờ");
    for (AdminDashboardResponse.PriorityOrder item : data.canUuTien()) {
      dataRow(
          sheet,
          row++,
          styles,
          item.donHangId(),
          item.maDonHang(),
          item.trangThaiDonHang(),
          item.lyDoUuTien(),
          item.ngayTao(),
          item.soPhutTuKhiTao());
    }
    finish(sheet, 6);
  }

  private void businessSheet(
      Workbook workbook, Styles styles, AdminDashboardResponse.BusinessChart data) {
    Sheet sheet = sheet(workbook, "Kinh doanh", styles, "BIỂU ĐỒ KINH DOANH", 7);
    int row = 2;
    row = info(sheet, row, "Nhóm theo", data.nhomTheo(), styles);
    row = businessTable(sheet, row + 1, "Kỳ hiện tại", data.kyHienTai(), styles);
    businessTable(sheet, row + 1, "Kỳ trước", data.kyTruoc(), styles);
    finish(sheet, 7);
  }

  private int businessTable(
      Sheet sheet,
      int row,
      String title,
      java.util.List<AdminDashboardResponse.BusinessPoint> items,
      Styles styles) {
    row = section(sheet, row, title, styles);
    row =
        header(
            sheet,
            row,
            styles,
            "Từ ngày",
            "Đến ngày",
            "Doanh thu thuần",
            "Số đơn",
            "Số lượng bán",
            "Lợi nhuận gộp ước tính");
    for (AdminDashboardResponse.BusinessPoint item : items) {
      dataRow(
          sheet,
          row++,
          styles,
          item.tuNgay(),
          item.denNgay(),
          item.doanhThuThuan(),
          item.soDon(),
          item.soLuongBan(),
          item.loiNhuanGopUocTinh());
    }
    return row;
  }

  private void productsSheet(
      Workbook workbook,
      Styles styles,
      AdminDashboardResponse.TopProducts products,
      AdminDashboardResponse.SlowMovingProducts slow,
      int limit) {
    Sheet sheet = sheet(workbook, "Sản phẩm", styles, "SẢN PHẨM", 12);
    int row = 2;
    row = info(sheet, row, "Xếp hạng theo", products.xepHangTheo(), styles);
    row = info(sheet, row, "Tổng phiên bản có doanh số", products.tongSo(), styles);
    row = section(sheet, row + 1, "Top " + limit + " sản phẩm", styles);
    row =
        header(
            sheet,
            row,
            styles,
            "Hạng",
            "Sản phẩm",
            "Phiên bản",
            "Mã vạch",
            "Loại",
            "SL bán",
            "SL nhận trả",
            "Doanh thu thuần",
            "Tồn thực tế",
            "Tồn có thể bán",
            "Số bộ có thể lắp",
            "Cảnh báo");
    for (AdminDashboardResponse.TopProductItem item : products.items()) {
      dataRow(
          sheet,
          row++,
          styles,
          item.hang(),
          item.tenSanPham(),
          item.tenPhienBan(),
          item.maVach(),
          item.loaiSanPham(),
          item.soLuongBan(),
          item.soLuongDaNhanTra(),
          item.doanhThuThuan(),
          item.tonThucTe(),
          item.tonCoTheBan(),
          item.soBoCoTheLap(),
          item.canhBao());
    }
    row = section(sheet, row + 1, "Top " + limit + " tồn lâu/chưa bán", styles);
    row = info(sheet, row, "Ngưỡng số ngày", slow.soNgayKhongBan(), styles);
    row = info(sheet, row, "Tổng phiên bản phù hợp", slow.tongSo(), styles);
    row =
        header(
            sheet,
            row,
            styles,
            "ID phiên bản",
            "Sản phẩm",
            "Phiên bản",
            "Tồn thực tế",
            "Lần xuất bán gần nhất",
            "Số ngày không bán",
            "Phân loại");
    for (AdminDashboardResponse.SlowMovingItem item : slow.items()) {
      dataRow(
          sheet,
          row++,
          styles,
          item.phienBanId(),
          item.tenSanPham(),
          item.tenPhienBan(),
          item.tonThucTe(),
          item.lanXuatBanGanNhat(),
          item.soNgayKhongBan(),
          item.phanLoai());
    }
    finish(sheet, 12);
  }

  private void inventorySheet(
      Workbook workbook, Styles styles, AdminDashboardResponse.Inventory data, int limit) {
    Sheet sheet = sheet(workbook, "Tồn kho", styles, "TỒN KHO HIỆN TẠI", 7);
    int row = 2;
    row = info(sheet, row, "Kho hàng ID", data.khoHangId(), styles);
    row = info(sheet, row, "Tổng tồn thực tế", data.tongTonThucTe(), styles);
    row = info(sheet, row, "Tổng tồn có thể bán", data.tongTonCoTheBan(), styles);
    row = info(sheet, row, "SKU hết hàng", data.soSkuHetHang(), styles);
    row = info(sheet, row, "SKU dưới tối thiểu", data.soSkuDuoiToiThieu(), styles);
    row =
        info(
            sheet,
            row,
            "Giá trị tồn theo giá nhập hiện tại",
            data.giaTriTonTheoGiaNhapHienTai(),
            styles);
    row = info(sheet, row, "Sản phẩm đang kinh doanh", data.soSanPhamDangKinhDoanh(), styles);
    row = info(sheet, row, "Phiên bản đang kinh doanh", data.soPhienBanDangKinhDoanh(), styles);
    row = section(sheet, row + 1, "Top " + limit + " cảnh báo", styles);
    row =
        header(
            sheet,
            row,
            styles,
            "ID phiên bản",
            "Sản phẩm",
            "Phiên bản",
            "Tồn thực tế",
            "Tồn có thể bán",
            "Mức tối thiểu",
            "Cảnh báo");
    for (AdminDashboardResponse.InventoryWarning item : data.canhBao().items()) {
      dataRow(
          sheet,
          row++,
          styles,
          item.phienBanId(),
          item.tenSanPham(),
          item.tenPhienBan(),
          item.tonThucTe(),
          item.tonCoTheBan(),
          item.mucTonToiThieu(),
          item.canhBao());
    }
    finish(sheet, 7);
  }

  private void purchasesSheet(
      Workbook workbook, Styles styles, AdminDashboardResponse.Purchases data) {
    Sheet sheet = sheet(workbook, "Nhập hàng", styles, "NHẬP HÀNG VÀ NHÀ CUNG CẤP", 3);
    int row = 2;
    row = info(sheet, row, "Chờ duyệt", data.choDuyet(), styles);
    row = info(sheet, row, "Chờ nhập kho", data.choNhapKho(), styles);
    row = info(sheet, row, "Nhập chưa đủ", data.nhapChuaDu(), styles);
    row = info(sheet, row, "Đơn chưa trả", data.donChuaTra(), styles);
    row = info(sheet, row, "Đơn trả một phần", data.donTraMotPhan(), styles);
    row = info(sheet, row, "Còn phải trả NCC", data.conPhaiTraNcc(), styles);
    info(sheet, row, "Lý do chưa tính công nợ", data.lyDoChuaTinhCongNo(), styles);
    finish(sheet, 3);
  }

  private void customersSheet(
      Workbook workbook, Styles styles, AdminDashboardResponse.Customers data) {
    Sheet sheet = sheet(workbook, "Khách hàng", styles, "KHÁCH HÀNG", 4);
    int row = 2;
    row = info(sheet, row, "Tổng khách hàng hiện tại", data.tongKhachHangHienTai(), styles);
    row = info(sheet, row, "Khách mới trong kỳ", data.khachMoiTrongKy(), styles);
    row = info(sheet, row, "Phạm vi khách mới", data.phamViKhachMoi(), styles);
    row = info(sheet, row, "Khách có mua trong kỳ", data.khachCoMuaTrongKy(), styles);
    row = info(sheet, row, "Khách quay lại", data.khachQuayLai(), styles);
    row = info(sheet, row, "Số đơn khách lẻ", data.soDonKhachLe(), styles);
    row = section(sheet, row + 1, "Khách giá trị cao nhất", styles);
    if (data.khachGiaTriCaoNhat() == null) {
      info(sheet, row, "Kết quả", "Không có dữ liệu", styles);
    } else {
      row = info(sheet, row, "Khách hàng ID", data.khachGiaTriCaoNhat().khachHangId(), styles);
      row = info(sheet, row, "Họ tên", data.khachGiaTriCaoNhat().hoTen(), styles);
      row = info(sheet, row, "Số đơn", data.khachGiaTriCaoNhat().soDon(), styles);
      info(sheet, row, "Giá trị mua thuần", data.khachGiaTriCaoNhat().giaTriMuaThuan(), styles);
    }
    finish(sheet, 4);
  }

  private void cashflowSheet(
      Workbook workbook, Styles styles, AdminDashboardResponse.Cashflow data) {
    Sheet sheet = sheet(workbook, "Sổ quỹ", styles, "SỔ QUỸ VÀ THANH TOÁN", 5);
    int row = 2;
    row = info(sheet, row, "Phạm vi sổ quỹ", data.phamViSoQuy(), styles);
    row = info(sheet, row, "Số dư quỹ hiện tại", data.soDuQuyHienTai(), styles);
    row = info(sheet, row, "Tổng thu trong kỳ", data.trongKy().tongThu(), styles);
    row = info(sheet, row, "Tổng chi trong kỳ", data.trongKy().tongChi(), styles);
    row = info(sheet, row, "Chênh lệch", data.trongKy().chenhLech(), styles);
    row = section(sheet, row + 1, "Thu theo phương thức", styles);
    row = header(sheet, row, styles, "Phương thức", "Số tiền");
    for (AdminDashboardResponse.PaymentMethodAmount item : data.thuTheoPhuongThuc()) {
      dataRow(sheet, row++, styles, item.phuongThuc(), item.soTien());
    }
    row = section(sheet, row + 1, "Biểu đồ dòng tiền", styles);
    row = header(sheet, row, styles, "Từ ngày", "Đến ngày", "Tổng thu", "Tổng chi");
    for (AdminDashboardResponse.CashPoint item : data.bieuDo()) {
      dataRow(sheet, row++, styles, item.tuNgay(), item.denNgay(), item.tongThu(), item.tongChi());
    }
    row = section(sheet, row + 1, "Đơn hàng hiện tại", styles);
    row = info(sheet, row, "Kênh bán", data.donHangHienTai().kenhBan(), styles);
    row =
        info(
            sheet,
            row,
            "Giá trị chưa thanh toán",
            data.donHangHienTai().giaTriChuaThanhToan(),
            styles);
    row = info(sheet, row, "COD đang vận chuyển", data.donHangHienTai().codDangVanChuyen(), styles);
    row = info(sheet, row, "COD chờ đối soát", data.donHangHienTai().codChoDoiSoat(), styles);
    info(sheet, row, "Lý do COD null", data.donHangHienTai().lyDoCodNull(), styles);
    finish(sheet, 5);
  }

  private void afterSalesSheet(
      Workbook workbook, Styles styles, AdminDashboardResponse.AfterSales data) {
    Sheet sheet = sheet(workbook, "Bảo hành và trả hàng", styles, "BẢO HÀNH VÀ TRẢ HÀNG", 3);
    int row = 2;
    row = info(sheet, row, "Kênh bán", data.kenhBan(), styles);
    row = section(sheet, row + 1, "Bảo hành", styles);
    for (Map.Entry<String, Long> entry : data.baoHanh().entrySet()) {
      row = info(sheet, row, entry.getKey(), entry.getValue(), styles);
    }
    row = section(sheet, row + 1, "Trả hàng", styles);
    row = info(sheet, row, "CHO_TIEP_NHAN", data.traHang().choTiepNhan(), styles);
    row = info(sheet, row, "DA_NHAN_HANG", data.traHang().daNhanHang(), styles);
    row = info(sheet, row, "DA_HOAN_TIEN", data.traHang().daHoanTien(), styles);
    row = info(sheet, row, "Chờ hoàn tiền", data.traHang().choHoanTien(), styles);
    info(sheet, row, "Giá trị chờ hoàn tiền", data.traHang().giaTriChoHoanTien(), styles);
    finish(sheet, 3);
  }

  private void promotionsSheet(
      Workbook workbook, Styles styles, AdminDashboardResponse.Promotions data) {
    Sheet sheet = sheet(workbook, "Khuyến mại", styles, "KHUYẾN MẠI", 3);
    int row = 2;
    row = info(sheet, row, "Ngưỡng sắp đến (ngày)", data.nguongSapDenNgay(), styles);
    row = info(sheet, row, "Đang trong thời gian áp dụng", data.dangTrongThoiGianApDung(), styles);
    row = info(sheet, row, "Còn lượt áp dụng", data.conLuotApDung(), styles);
    row = info(sheet, row, "Sắp bắt đầu", data.sapBatDau(), styles);
    row = info(sheet, row, "Sắp kết thúc", data.sapKetThuc(), styles);
    row = info(sheet, row, "Tổng lượt đã dùng lũy kế", data.tongLuotDaDungLuyKe(), styles);
    row = info(sheet, row, "Số đơn sử dụng trong kỳ", data.soDonSuDungTrongKy(), styles);
    row =
        info(
            sheet,
            row,
            "Giá trị giảm theo chương trình",
            data.giaTriGiamTheoChuongTrinhTrongKy(),
            styles);
    info(sheet, row, "Lý do chưa hỗ trợ", data.lyDoChuaHoTro(), styles);
    finish(sheet, 3);
  }

  private int metric(
      Sheet sheet, int row, String label, AdminDashboardResponse.Metric metric, Styles styles) {
    Row target = sheet.createRow(row);
    value(target.createCell(0), label, styles.label());
    value(target.createCell(1), metric.giaTri(), styles.body());
    value(target.createCell(2), metric.kyTruoc(), styles.body());
    value(target.createCell(3), metric.tyLeThayDoi(), styles.body());
    return row + 1;
  }

  private Sheet sheet(Workbook workbook, String name, Styles styles, String title, int columns) {
    Sheet sheet = workbook.createSheet(name);
    Row titleRow = sheet.createRow(0);
    Cell titleCell = titleRow.createCell(0);
    titleCell.setCellValue(title);
    titleCell.setCellStyle(styles.title());
    sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, Math.max(0, columns - 1)));
    return sheet;
  }

  private int section(Sheet sheet, int rowIndex, String text, Styles styles) {
    Row row = sheet.createRow(rowIndex);
    value(row.createCell(0), text, styles.section());
    return rowIndex + 1;
  }

  private int info(Sheet sheet, int rowIndex, String label, Object value, Styles styles) {
    Row row = sheet.createRow(rowIndex);
    value(row.createCell(0), label, styles.label());
    value(row.createCell(1), value, styles.body());
    return rowIndex + 1;
  }

  private int header(Sheet sheet, int rowIndex, Styles styles, String... labels) {
    Row row = sheet.createRow(rowIndex);
    for (int index = 0; index < labels.length; index++) {
      value(row.createCell(index), labels[index], styles.header());
    }
    return rowIndex + 1;
  }

  private void dataRow(Sheet sheet, int rowIndex, Styles styles, Object... values) {
    Row row = sheet.createRow(rowIndex);
    for (int index = 0; index < values.length; index++) {
      value(row.createCell(index), values[index], styles.body());
    }
  }

  private void note(Sheet sheet, int rowIndex, String text, Styles styles, int mergedColumns) {
    Row row = sheet.createRow(rowIndex);
    value(row.createCell(0), text, styles.note());
    sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, 0, mergedColumns - 1));
  }

  private void value(Cell cell, Object value, CellStyle style) {
    cell.setCellStyle(style);
    if (value == null) {
      cell.setBlank();
    } else if (value instanceof BigDecimal number) {
      cell.setCellValue(number.doubleValue());
    } else if (value instanceof Number number) {
      cell.setCellValue(number.doubleValue());
    } else if (value instanceof Boolean flag) {
      cell.setCellValue(flag ? "Có" : "Không");
    } else if (value instanceof TemporalAccessor) {
      cell.setCellValue(value.toString());
    } else {
      cell.setCellValue(value.toString());
    }
  }

  private void finish(Sheet sheet, int columns) {
    sheet.createFreezePane(0, 1);
    for (int index = 0; index < columns; index++) {
      sheet.autoSizeColumn(index);
      sheet.setColumnWidth(index, Math.min(sheet.getColumnWidth(index) + 768, 18_000));
    }
  }

  private Styles styles(Workbook workbook) {
    Font titleFont = workbook.createFont();
    titleFont.setBold(true);
    titleFont.setFontHeightInPoints((short) 16);
    CellStyle title = workbook.createCellStyle();
    title.setFont(titleFont);
    title.setAlignment(HorizontalAlignment.CENTER);

    Font bold = workbook.createFont();
    bold.setBold(true);
    CellStyle label = workbook.createCellStyle();
    label.setFont(bold);

    CellStyle section = workbook.createCellStyle();
    section.setFont(bold);
    section.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
    section.setFillPattern(FillPatternType.SOLID_FOREGROUND);

    Font headerFont = workbook.createFont();
    headerFont.setBold(true);
    headerFont.setColor(IndexedColors.WHITE.getIndex());
    CellStyle header = workbook.createCellStyle();
    header.setFont(headerFont);
    header.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
    header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    header.setAlignment(HorizontalAlignment.CENTER);
    borders(header);

    CellStyle body = workbook.createCellStyle();
    body.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));
    borders(body);

    CellStyle note = workbook.createCellStyle();
    note.setWrapText(true);
    Font italic = workbook.createFont();
    italic.setItalic(true);
    note.setFont(italic);
    return new Styles(title, label, section, header, body, note);
  }

  private void borders(CellStyle style) {
    style.setBorderTop(BorderStyle.THIN);
    style.setBorderRight(BorderStyle.THIN);
    style.setBorderBottom(BorderStyle.THIN);
    style.setBorderLeft(BorderStyle.THIN);
  }

  private record Styles(
      CellStyle title,
      CellStyle label,
      CellStyle section,
      CellStyle header,
      CellStyle body,
      CellStyle note) {}
}
