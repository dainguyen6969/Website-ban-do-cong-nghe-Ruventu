package com.example.dantruventu.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariantDetailResponse {

    private Long id;
    private Long sanPhamId;
    private String tenPhienBan;
    private String maVach;
    private BigDecimal giaBanLe;
    private BigDecimal khoiLuong;
    private Short trangThai;
    private Long tonThucTe;
    private Long tonCoTheBan;
    private Boolean conHang;
}