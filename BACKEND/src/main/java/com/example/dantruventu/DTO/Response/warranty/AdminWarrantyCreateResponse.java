package com.example.dantruventu.DTO.Response.warranty;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

public record AdminWarrantyCreateResponse(
    Long id,
    @JsonProperty("ma_phieu") String maPhieu,
    @JsonProperty("don_hang_id") Long donHangId,
    @JsonProperty("chi_tiet_don_hang_id") Long chiTietDonHangId,
    @JsonProperty("khach_hang_id") Long khachHangId,
    @JsonProperty("thiet_bi_id") Long thietBiId,
    @JsonProperty("ma_theo_doi") String maTheoDoi,
    @JsonProperty("so_serial_id") Long soSerialId,
    @JsonProperty("trang_thai_serial") String trangThaiSerial,
    @JsonProperty("trang_thai_xu_ly") String trangThaiXuLy,
    @JsonProperty("ket_qua_tiep_nhan") String ketQuaTiepNhan,
    @JsonProperty("dieu_kien_bao_hanh") String dieuKienBaoHanh,
    @JsonProperty("nguoi_tiep_nhan_id") Long nguoiTiepNhanId,
    @JsonProperty("ngay_tiep_nhan") OffsetDateTime ngayTiepNhan,
    @JsonProperty("phien_ban_id") Long phienBanId,
    @JsonProperty("khoa_thiet_bi") boolean khoaThietBi,
    @JsonProperty("so_luong_quyen_dang_khoa") int soLuongQuyenDangKhoa,
    @JsonProperty("hoa_don_id") Long hoaDonId,
    @JsonProperty("phieu_thu_chi_id") Long phieuThuChiId,
    @JsonProperty("da_chap_thuan_phi") boolean daChapThuanPhi) {}
