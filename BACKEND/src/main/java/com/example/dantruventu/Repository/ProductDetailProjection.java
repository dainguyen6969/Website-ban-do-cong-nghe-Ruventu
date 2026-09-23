package com.example.dantruventu.Repository;

import java.math.BigDecimal;

public interface ProductDetailProjection {

    Long getId();

    String getMaSanPham();

    String getTenSanPham();

    Long getDanhMucId();

    String getTenDanhMuc();

    Long getThuongHieuId();

    String getTenThuongHieu();

    String getLoaiSanPham();

    String getMoTa();

    String getThongSoKyThuat();

    Short getTrangThai();

    interface ProductImageProjection {

        Long getId();

        String getDuongDanAnh();

        Boolean getLaAnhChinh();

        Integer getThuTuHienThi();
    }

    interface ProductVariantProjection {

        Long getId();

        String getTenPhienBan();

        String getMaVach();

        BigDecimal getGiaBanLe();

        BigDecimal getKhoiLuong();

        Long getTonCoTheBan();
    }

    interface ProductVariantDetailProjection {

        Long getId();

        Long getSanPhamId();

        String getTenPhienBan();

        String getMaVach();

        BigDecimal getGiaBanLe();

        BigDecimal getKhoiLuong();

        Short getTrangThai();

        Long getTonThucTe();

        Long getTonCoTheBan();
    }
}