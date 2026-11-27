package com.example.dantruventu.DTO.Response.promotion;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record AdminPromotionOrdersResponse(
    @JsonProperty("khuyen_mai_id") Long khuyenMaiId,
    List<OrderItem> items,
    PaginationResponse pagination) {

  public record OrderItem(
      @JsonProperty("khuyen_mai_don_hang_id") Long khuyenMaiDonHangId,
      @JsonProperty("don_hang_id") Long donHangId,
      @JsonProperty("ma_don_hang") String maDonHang,
      @JsonProperty("loai_don_hang") LoaiDonHang loaiDonHang,
      @JsonProperty("khach_hang_id") Long khachHangId,
      @JsonProperty("ten_nguoi_nhan") String tenNguoiNhan,
      @JsonProperty("sdt_nguoi_nhan") String sdtNguoiNhan,
      @JsonProperty("ngay_tao_don") OffsetDateTime ngayTaoDon,
      @JsonProperty("trang_thai_don_hang") TrangThaiDonHang trangThaiDonHang,
      @JsonProperty("trang_thai_ap_dung") TrangThaiApDungKhuyenMai trangThaiApDung,
      @JsonProperty("ma_chuong_trinh") String maChuongTrinh,
      @JsonProperty("ten_chuong_trinh") String tenChuongTrinh,
      @JsonProperty("phien_ban_cau_hinh") Integer phienBanCauHinh,
      @JsonProperty("so_tien_giam") BigDecimal soTienGiam,
      @JsonProperty("qua_tang") List<Gift> quaTang,
      @JsonProperty("ngay_chot_uu_dai") OffsetDateTime ngayChotUuDai,
      @JsonProperty("ngay_cap_nhat_luot") OffsetDateTime ngayCapNhatLuot,
      @JsonProperty("canh_bao_du_lieu") @JsonInclude(JsonInclude.Include.NON_NULL)
          String canhBaoDuLieu) {}

  public record Gift(
      @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("so_luong") Integer soLuong,
      @JsonProperty("don_gia") BigDecimal donGia,
      @JsonProperty("thanh_toan_dong") BigDecimal thanhToanDong) {}
}
