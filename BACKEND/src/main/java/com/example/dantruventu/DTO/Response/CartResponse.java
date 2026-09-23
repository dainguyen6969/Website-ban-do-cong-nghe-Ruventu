package com.example.dantruventu.DTO.Response;

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
public class CartResponse {

    private List<CartItemResponse> items;
    private Integer tongSoLuong;
    private BigDecimal tamTinh;
    private BigDecimal giamGia;
    private BigDecimal tongTien;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CartItemResponse {

        private Long cartItemId;
        private Long phienBanId;
        private String tenSanPham;
        private String tenPhienBan;
        private String anh;
        private BigDecimal donGia;
        private Integer soLuong;
        private BigDecimal thanhTien;
        private Integer tonKhoKhaDung;
        private Boolean conHang;
    }
}