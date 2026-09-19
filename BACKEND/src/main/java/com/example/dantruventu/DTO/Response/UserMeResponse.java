package com.example.dantruventu.DTO.Response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMeResponse {

    private Long id;
    private String hoTen;
    private String email;
    private String soDienThoai;
    private String anhDaiDien;
    private String trangThai;

    private DiaChiMacDinhResponse diaChiMacDinh;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DiaChiMacDinhResponse {

        private Long id;
        private String tenNguoiNhan;
        private String soDienThoai;
        private String diaChiChiTiet;
        private String phuongXa;
        private String tinhThanh;
    }
}