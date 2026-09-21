package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressResponse {
    @JsonProperty("id")
    private Long id;

    @JsonProperty("ten_nguoi_nhan")
    private String tenNguoiNhan;

    @JsonProperty("so_dien_thoai")
    private String soDienThoai;

    @JsonProperty("dia_chi_chi_tiet")
    private String diaChiChiTiet;

    @JsonProperty("phuong_xa")
    private String phuongXa;

    @JsonProperty("tinh_thanh")
    private String tinhThanh;

    @JsonProperty("la_mac_dinh")
    private Boolean laMacDinh;
}
