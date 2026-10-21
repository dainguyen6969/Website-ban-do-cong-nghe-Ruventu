package com.example.dantruventu.DTO.Request.warranty;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** IDs and quantities remain raw until validation to reject fractional JSON numbers. */
public record AdminWarrantyCreateRequest(
    @JsonProperty("yeu_cau_tiep_nhan_id") Object yeuCauTiepNhanId,
    @JsonProperty("thiet_bi_id") Object thietBiId,
    @JsonProperty("chi_tiet_don_hang_id") Object chiTietDonHangId,
    @JsonProperty("so_serial_id") Object soSerialId,
    @JsonProperty("dau_hieu_nhan_dang") String dauHieuNhanDang,
    @JsonProperty("ly_do_bao_hanh") String lyDoBaoHanh,
    @JsonProperty("tinh_trang_tiep_nhan") String tinhTrangTiepNhan,
    @JsonProperty("ten_nguoi_lien_he") String tenNguoiLienHe,
    @JsonProperty("sdt_nguoi_lien_he") String sdtNguoiLienHe,
    @JsonProperty("ngay_tiep_nhan_thuc_te") String ngayTiepNhanThucTe,
    @JsonProperty("dieu_kien_bao_hanh") String dieuKienBaoHanh,
    @JsonProperty("can_cu_xac_minh") String canCuXacMinh,
    @JsonProperty("phu_kien") List<Accessory> phuKien,
    @JsonProperty("anh_urls") List<String> anhUrls,
    @JsonProperty("don_vi_bao_hanh_du_kien") String donViBaoHanhDuKien,
    @JsonProperty("ghi_chu") String ghiChu,
    @JsonProperty("phien_ban_thuc_te_id") Object phienBanThucTeId,
    @JsonProperty("ma_don_vi_vat_ly") String maDonViVatLy) {

  @JsonAnySetter
  public void rejectUnknown(String name, Object value) {
    throw new IllegalArgumentException("Trường không được phép: " + name);
  }

  public record Accessory(
      @JsonProperty("ten") String ten, @JsonProperty("so_luong") Object soLuong) {
    @JsonAnySetter
    public void rejectUnknown(String name, Object value) {
      throw new IllegalArgumentException("Trường phụ kiện không được phép: " + name);
    }
  }
}
