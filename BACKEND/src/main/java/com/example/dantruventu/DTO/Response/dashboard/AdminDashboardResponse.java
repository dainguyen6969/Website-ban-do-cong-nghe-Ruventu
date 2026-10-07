package com.example.dantruventu.DTO.Response.dashboard;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** Response contracts for UC-035. */
public final class AdminDashboardResponse {

  private AdminDashboardResponse() {}

  public record Filter(
      @JsonProperty("tu_ngay") LocalDate tuNgay,
      @JsonProperty("den_ngay") LocalDate denNgay,
      @JsonProperty("kenh_ban") String kenhBan,
      @JsonProperty("ky_chua_ket_thuc") boolean kyChuaKetThuc) {}

  public record Period(
      @JsonProperty("tu_ngay") LocalDate tuNgay, @JsonProperty("den_ngay") LocalDate denNgay) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Metric(
      @JsonProperty("gia_tri") BigDecimal giaTri,
      @JsonProperty("ky_truoc") BigDecimal kyTruoc,
      @JsonProperty("ty_le_thay_doi") BigDecimal tyLeThayDoi,
      @JsonProperty("pham_vi") String phamVi) {}

  public record Kpi(
      @JsonProperty("doanh_thu_thuan") Metric doanhThuThuan,
      @JsonProperty("so_don") Metric soDon,
      @JsonProperty("so_luong_ban") Metric soLuongBan,
      @JsonProperty("thuc_thu") Metric thucThu) {}

  public record Business(
      @JsonProperty("doanh_thu_ban_hang") BigDecimal doanhThuBanHang,
      @JsonProperty("tong_giam_gia") BigDecimal tongGiamGia,
      @JsonProperty("gia_tri_hang_tra") BigDecimal giaTriHangTra,
      @JsonProperty("gia_tri_trung_binh_don") BigDecimal giaTriTrungBinhDon,
      @JsonProperty("gia_von_uoc_tinh") BigDecimal giaVonUocTinh,
      @JsonProperty("loi_nhuan_gop_uoc_tinh") BigDecimal loiNhuanGopUocTinh) {}

  public record ChannelMix(
      @JsonProperty("kenh_ban") String kenhBan,
      @JsonProperty("doanh_thu_thuan") BigDecimal doanhThuThuan,
      @JsonProperty("so_don") long soDon,
      @JsonProperty("ty_trong_doanh_thu") BigDecimal tyTrongDoanhThu) {}

  public record CurrentSnapshot(
      @JsonProperty("so_du_quy") BigDecimal soDuQuy,
      @JsonProperty("nhan_vien_dang_hoat_dong") long nhanVienDangHoatDong) {}

  public record Summary(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("bo_loc") Filter boLoc,
      @JsonProperty("ky_truoc") Period kyTruoc,
      Kpi kpi,
      @JsonProperty("kinh_doanh") Business kinhDoanh,
      @JsonProperty("co_cau_kenh") List<ChannelMix> coCauKenh,
      @JsonProperty("hien_tai") CurrentSnapshot hienTai) {}

  public record ReturnTasks(
      @JsonProperty("cho_tiep_nhan") long choTiepNhan,
      @JsonProperty("cho_hoan_tien") long choHoanTien,
      @JsonProperty("tong_phieu_can_xu_ly") long tongPhieuCanXuLy) {}

  public record PriorityOrder(
      @JsonProperty("don_hang_id") Long donHangId,
      @JsonProperty("ma_don_hang") String maDonHang,
      @JsonProperty("trang_thai_don_hang") String trangThaiDonHang,
      @JsonProperty("ly_do_uu_tien") String lyDoUuTien,
      @JsonProperty("ngay_tao") OffsetDateTime ngayTao,
      @JsonProperty("so_phut_tu_khi_tao") long soPhutTuKhiTao) {}

  public record Tasks(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("pham_vi") String phamVi,
      @JsonProperty("kenh_ban") String kenhBan,
      @JsonProperty("nguong_cho_phut") int nguongChoPhut,
      @JsonProperty("don_hang") Map<String, Long> donHang,
      @JsonProperty("giao_hang") Map<String, Long> giaoHang,
      @JsonProperty("so_don_can_xu_ly") long soDonCanXuLy,
      @JsonProperty("so_don_cho_lau") long soDonChoLau,
      @JsonProperty("tra_hang") ReturnTasks traHang,
      @JsonProperty("can_uu_tien") List<PriorityOrder> canUuTien) {}

  public record BusinessPoint(
      @JsonProperty("tu_ngay") LocalDate tuNgay,
      @JsonProperty("den_ngay") LocalDate denNgay,
      @JsonProperty("doanh_thu_thuan") BigDecimal doanhThuThuan,
      @JsonProperty("so_don") long soDon,
      @JsonProperty("so_luong_ban") long soLuongBan,
      @JsonProperty("loi_nhuan_gop_uoc_tinh") BigDecimal loiNhuanGopUocTinh) {}

  public record BusinessChart(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("nhom_theo") String nhomTheo,
      @JsonProperty("ky_hien_tai") List<BusinessPoint> kyHienTai,
      @JsonProperty("ky_truoc") List<BusinessPoint> kyTruoc) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record TopProductItem(
      @JsonProperty("hang") int hang,
      @JsonProperty("san_pham_id") Long sanPhamId,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("ten_san_pham") String tenSanPham,
      @JsonProperty("ten_phien_ban") String tenPhienBan,
      @JsonProperty("ma_vach") String maVach,
      @JsonProperty("loai_san_pham") String loaiSanPham,
      @JsonProperty("so_luong_ban") long soLuongBan,
      @JsonProperty("so_luong_da_nhan_tra") long soLuongDaNhanTra,
      @JsonProperty("doanh_thu_thuan") BigDecimal doanhThuThuan,
      @JsonProperty("ton_thuc_te") Long tonThucTe,
      @JsonProperty("ton_co_the_ban") Long tonCoTheBan,
      @JsonProperty("so_bo_co_the_lap") Long soBoCoTheLap,
      @JsonProperty("canh_bao") String canhBao) {}

  public record TopProducts(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("xep_hang_theo") String xepHangTheo,
      @JsonProperty("tong_so") long tongSo,
      List<TopProductItem> items) {}

  public record InventoryWarning(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("ten_san_pham") String tenSanPham,
      @JsonProperty("ten_phien_ban") String tenPhienBan,
      @JsonProperty("ton_thuc_te") long tonThucTe,
      @JsonProperty("ton_co_the_ban") long tonCoTheBan,
      @JsonProperty("muc_ton_toi_thieu") Integer mucTonToiThieu,
      @JsonProperty("canh_bao") String canhBao) {}

  public record InventoryAlerts(
      @JsonProperty("tong_so") long tongSo, List<InventoryWarning> items) {}

  public record Inventory(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("pham_vi") String phamVi,
      @JsonProperty("kho_hang_id") Long khoHangId,
      @JsonProperty("tong_ton_thuc_te") long tongTonThucTe,
      @JsonProperty("tong_ton_co_the_ban") long tongTonCoTheBan,
      @JsonProperty("so_sku_het_hang") long soSkuHetHang,
      @JsonProperty("so_sku_duoi_toi_thieu") long soSkuDuoiToiThieu,
      @JsonProperty("gia_tri_ton_theo_gia_nhap_hien_tai") BigDecimal giaTriTonTheoGiaNhapHienTai,
      @JsonProperty("so_san_pham_dang_kinh_doanh") long soSanPhamDangKinhDoanh,
      @JsonProperty("so_phien_ban_dang_kinh_doanh") long soPhienBanDangKinhDoanh,
      @JsonProperty("canh_bao") InventoryAlerts canhBao) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record SlowMovingItem(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("ten_san_pham") String tenSanPham,
      @JsonProperty("ten_phien_ban") String tenPhienBan,
      @JsonProperty("ton_thuc_te") long tonThucTe,
      @JsonProperty("lan_xuat_ban_gan_nhat") OffsetDateTime lanXuatBanGanNhat,
      @JsonProperty("so_ngay_khong_ban") Long soNgayKhongBan,
      @JsonProperty("phan_loai") String phanLoai) {}

  public record SlowMovingProducts(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("pham_vi") String phamVi,
      @JsonProperty("so_ngay_khong_ban") int soNgayKhongBan,
      @JsonProperty("tong_so") long tongSo,
      List<SlowMovingItem> items) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Purchases(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("pham_vi") String phamVi,
      @JsonProperty("cho_duyet") long choDuyet,
      @JsonProperty("cho_nhap_kho") long choNhapKho,
      @JsonProperty("nhap_chua_du") long nhapChuaDu,
      @JsonProperty("don_chua_tra") long donChuaTra,
      @JsonProperty("don_tra_mot_phan") long donTraMotPhan,
      @JsonProperty("con_phai_tra_ncc") BigDecimal conPhaiTraNcc,
      @JsonProperty("ly_do_chua_tinh_cong_no") String lyDoChuaTinhCongNo) {}

  public record ValuableCustomer(
      @JsonProperty("khach_hang_id") Long khachHangId,
      @JsonProperty("ho_ten") String hoTen,
      @JsonProperty("so_don") long soDon,
      @JsonProperty("gia_tri_mua_thuan") BigDecimal giaTriMuaThuan) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Customers(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("tong_khach_hang_hien_tai") long tongKhachHangHienTai,
      @JsonProperty("khach_moi_trong_ky") long khachMoiTrongKy,
      @JsonProperty("pham_vi_khach_moi") String phamViKhachMoi,
      @JsonProperty("khach_co_mua_trong_ky") long khachCoMuaTrongKy,
      @JsonProperty("khach_quay_lai") long khachQuayLai,
      @JsonProperty("so_don_khach_le") long soDonKhachLe,
      @JsonProperty("khach_gia_tri_cao_nhat") ValuableCustomer khachGiaTriCaoNhat) {}

  public record CashPeriod(
      @JsonProperty("tong_thu") BigDecimal tongThu,
      @JsonProperty("tong_chi") BigDecimal tongChi,
      @JsonProperty("chenh_lech") BigDecimal chenhLech) {}

  public record PaymentMethodAmount(
      @JsonProperty("phuong_thuc") String phuongThuc,
      @JsonProperty("so_tien") BigDecimal soTien) {}

  public record CashPoint(
      @JsonProperty("tu_ngay") LocalDate tuNgay,
      @JsonProperty("den_ngay") LocalDate denNgay,
      @JsonProperty("tong_thu") BigDecimal tongThu,
      @JsonProperty("tong_chi") BigDecimal tongChi) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record UnpaidOrders(
      @JsonProperty("kenh_ban") String kenhBan,
      @JsonProperty("gia_tri_chua_thanh_toan") BigDecimal giaTriChuaThanhToan,
      @JsonProperty("cod_dang_van_chuyen") BigDecimal codDangVanChuyen,
      @JsonProperty("cod_cho_doi_soat") BigDecimal codChoDoiSoat,
      @JsonProperty("ly_do_cod_null") String lyDoCodNull) {}

  public record Cashflow(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("pham_vi_so_quy") String phamViSoQuy,
      @JsonProperty("so_du_quy_hien_tai") BigDecimal soDuQuyHienTai,
      @JsonProperty("trong_ky") CashPeriod trongKy,
      @JsonProperty("thu_theo_phuong_thuc") List<PaymentMethodAmount> thuTheoPhuongThuc,
      @JsonProperty("bieu_do") List<CashPoint> bieuDo,
      @JsonProperty("don_hang_hien_tai") UnpaidOrders donHangHienTai) {}

  public record ReturnOverview(
      @JsonProperty("CHO_TIEP_NHAN") long choTiepNhan,
      @JsonProperty("DA_NHAN_HANG") long daNhanHang,
      @JsonProperty("DA_HOAN_TIEN") long daHoanTien,
      @JsonProperty("cho_hoan_tien") long choHoanTien,
      @JsonProperty("gia_tri_cho_hoan_tien") BigDecimal giaTriChoHoanTien) {}

  public record AfterSales(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("pham_vi") String phamVi,
      @JsonProperty("kenh_ban") String kenhBan,
      @JsonProperty("bao_hanh") Map<String, Long> baoHanh,
      @JsonProperty("tra_hang") ReturnOverview traHang) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Promotions(
      @JsonProperty("cap_nhat_luc") OffsetDateTime capNhatLuc,
      @JsonProperty("pham_vi") String phamVi,
      @JsonProperty("nguong_sap_den_ngay") int nguongSapDenNgay,
      @JsonProperty("dang_trong_thoi_gian_ap_dung") long dangTrongThoiGianApDung,
      @JsonProperty("con_luot_ap_dung") long conLuotApDung,
      @JsonProperty("sap_bat_dau") long sapBatDau,
      @JsonProperty("sap_ket_thuc") long sapKetThuc,
      @JsonProperty("tong_luot_da_dung_luy_ke") long tongLuotDaDungLuyKe,
      @JsonProperty("so_don_su_dung_trong_ky") Long soDonSuDungTrongKy,
      @JsonProperty("gia_tri_giam_theo_chuong_trinh_trong_ky")
          BigDecimal giaTriGiamTheoChuongTrinhTrongKy,
      @JsonProperty("ly_do_chua_ho_tro") String lyDoChuaHoTro) {}
}
