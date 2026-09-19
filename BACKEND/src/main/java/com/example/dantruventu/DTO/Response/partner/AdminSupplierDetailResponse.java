package com.example.dantruventu.DTO.Response.partner;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanNhap;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSupplierDetailResponse {

    private Long id;

    @JsonProperty("ma_nha_cung_cap")
    private String maNhaCungCap;

    @JsonProperty("ten_nha_cung_cap")
    private String tenNhaCungCap;

    @JsonProperty("so_dien_thoai")
    private String soDienThoai;

    private String email;

    @JsonProperty("dia_chi")
    private String diaChi;

    @JsonProperty("trang_thai")
    private Short trangThai;

    @JsonProperty("lich_su_don_nhap")
    private List<PurchaseHistoryData> lichSuDonNhap;

    private PaginationResponse pagination;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PurchaseHistoryData {

        private Long id;

        @JsonProperty("ma_don_nhap")
        private String maDonNhap;

        @JsonProperty("ngay_tao")
        private OffsetDateTime ngayTao;

        @JsonProperty("trang_thai_nhap")
        private TrangThaiNhapHang trangThaiNhap;

        @JsonProperty("trang_thai_thanh_toan")
        private TrangThaiThanhToanNhap trangThaiThanhToan;

        @JsonProperty("tong_tien")
        private BigDecimal tongTien;
    }
}