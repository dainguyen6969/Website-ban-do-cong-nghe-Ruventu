package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonRawValue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDetailResponse {

    private Long id;
    private String maSanPham;
    private String tenSanPham;
    private DanhMucResponse danhMuc;
    private ThuongHieuResponse thuongHieu;
    private String loaiSanPham;
    private String moTa;

    @JsonRawValue
    private String thongSoKyThuat;

    private Short trangThai;
    private List<AnhSanPhamResponse> anhSanPham;
    private List<PhienBanResponse> danhSachPhienBan;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DanhMucResponse {

        private Long id;
        private String tenDanhMuc;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ThuongHieuResponse {

        private Long id;
        private String tenThuongHieu;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnhSanPhamResponse {

        private Long id;
        private String duongDanAnh;
        private Boolean laAnhChinh;
        private Integer thuTuHienThi;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PhienBanResponse {

        private Long id;
        private String tenPhienBan;
        private String maVach;
        private BigDecimal giaBanLe;
        private BigDecimal khoiLuong;
        private Long tonCoTheBan;
    }
}