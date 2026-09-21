package com.example.dantruventu.DTO.Response.partner;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSupplierListItemResponse {

    private Long id;

    @JsonProperty("ma_nha_cung_cap")
    private String maNhaCungCap;

    @JsonProperty("ten_nha_cung_cap")
    private String tenNhaCungCap;

    @JsonProperty("so_dien_thoai")
    private String soDienThoai;

    @JsonProperty("trang_thai")
    private Short trangThai;
}