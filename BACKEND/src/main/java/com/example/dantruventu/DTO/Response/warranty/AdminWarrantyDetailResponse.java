package com.example.dantruventu.DTO.Response.warranty;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Enum.*;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** Read-only projection; nullable metadata is never manufactured from a ticket status. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record AdminWarrantyDetailResponse(
    Long id,
    @JsonProperty("ma_phieu") String maPhieu,
    @JsonProperty("trang_thai_xu_ly") TrangThaiBaoHanh trangThaiXuLy,
    @JsonProperty("ket_qua_xu_ly") KetQuaXuLyBaoHanh ketQuaXuLy,
    @JsonProperty("don_hang") Order donHang,
    @JsonProperty("nguoi_lien_he") Contact nguoiLienHe,
    @JsonProperty("thiet_bi") Device thietBi,
    @JsonProperty("tiep_nhan") Intake tiepNhan,
    @JsonProperty("ket_luan") List<Map<String, Object>> ketLuan,
    @JsonProperty("noi_dang_giu") Map<String, Object> noiDangGiu,
    @JsonProperty("bao_gia") List<Map<String, Object>> baoGia,
    @JsonProperty("hoa_don") Invoice hoaDon,
    @JsonProperty("chi_phi_don_vi") SupplierCost chiPhiDonVi,
    @JsonProperty("giao_dich_tien") List<MoneyTransaction> giaoDichTien,
    @JsonProperty("phuong_an_doi") Map<String, Object> phuongAnDoi,
    @JsonProperty("doi_soat_nha_cung_cap") Map<String, Object> doiSoatNhaCungCap,
    @JsonProperty("giao_nhan") List<Map<String, Object>> giaoNhan,
    @JsonProperty("lich_su") History lichSu,
    @JsonProperty("thao_tac_duoc_phep") List<String> thaoTacDuocPhep,
    @JsonProperty("ngay_tiep_nhan") OffsetDateTime ngayTiepNhan,
    @JsonProperty("ngay_cap_nhat") OffsetDateTime ngayCapNhat,
    @JsonProperty("hoa_don_da_huy") List<Invoice> hoaDonDaHuy,
    @JsonProperty("thiet_bi_hien_hanh") Device thietBiHienHanh,
    @JsonProperty("noi_dang_giu_thiet_bi_cu") Map<String, Object> noiDangGiuThietBiCu) {

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Order(
      Long id,
      @JsonProperty("ma_don_hang") String maDonHang,
      @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Contact(@JsonProperty("khach_hang_id") Long khachHangId, String ten, String sdt) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Device(
      Long id,
      @JsonProperty("ma_theo_doi") String maTheoDoi,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_serial_id") Long soSerialId,
      @JsonProperty("so_serial") String soSerial,
      @JsonProperty("la_thiet_bi_hien_hanh") Boolean laThietBiHienHanh,
      @JsonProperty("han_bao_hanh") OffsetDateTime hanBaoHanh,
      @JsonProperty("can_cu_tinh_han") String canCuTinhHan) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Intake(
      @JsonProperty("ly_do") String lyDo,
      @JsonProperty("tinh_trang") String tinhTrang,
      @JsonProperty("phu_kien") List<Map<String, Object>> phuKien,
      @JsonProperty("anh_urls") List<String> anhUrls) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record Invoice(
      Long id,
      @JsonProperty("ma_hoa_don") String maHoaDon,
      @JsonProperty("trang_thai") TrangThaiHoaDonBaoHanh trangThai,
      @JsonProperty("phien_ban_bao_gia") Integer phienBanBaoGia,
      @JsonProperty("tong_tien") BigDecimal tongTien,
      @JsonProperty("khoan_phai_thu_hieu_luc") BigDecimal khoanPhaiThuHieuLuc,
      @JsonProperty("da_thu") BigDecimal daThu,
      @JsonProperty("da_hoan") BigDecimal daHoan,
      @JsonProperty("con_phai_thu") BigDecimal conPhaiThu,
      @JsonProperty("tong_can_hoan") BigDecimal tongCanHoan,
      @JsonProperty("con_phai_hoan") BigDecimal conPhaiHoan,
      @JsonProperty("trang_thai_thanh_toan") TrangThaiThanhToanBaoHanh trangThaiThanhToan,
      @JsonProperty("trang_thai_hoan_tien") TrangThaiHoanTienBaoHanh trangThaiHoanTien) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record SupplierCost(
      @JsonProperty("chi_phi_ncc_xac_nhan") BigDecimal chiPhiNccXacNhan,
      @JsonProperty("da_chi") BigDecimal daChi,
      @JsonProperty("da_nhan_hoan") BigDecimal daNhanHoan,
      @JsonProperty("con_phai_chi") BigDecimal conPhaiChi,
      @JsonProperty("con_phai_nhan_hoan") BigDecimal conPhaiNhanHoan) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record MoneyTransaction(
      Long id,
      String loai,
      @JsonProperty("so_tien") BigDecimal soTien,
      @JsonProperty("phieu_thu_chi_id") Long phieuThuChiId) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record History(List<HistoryItem> items, PaginationResponse pagination) {}

  @JsonInclude(JsonInclude.Include.ALWAYS)
  public record HistoryItem(
      Long id,
      @JsonProperty("loai_su_kien") String loaiSuKien,
      @JsonProperty("nguoi_thuc_hien_id") Long nguoiThucHienId,
      @JsonProperty("ngay_tao") OffsetDateTime ngayTao,
      @JsonProperty("noi_dung") String noiDung) {}
}
