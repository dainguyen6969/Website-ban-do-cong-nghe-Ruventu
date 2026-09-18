package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "so_dia_chi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SoDiaChi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nguoi_dung_id", nullable = false)
    private NguoiDung nguoiDung;

    @Column(name = "ten_nguoi_nhan", nullable = false)
    private String tenNguoiNhan;

    @Column(name = "so_dien_thoai", nullable = false)
    private String soDienThoai;

    @Column(name = "dia_chi_chi_tiet", nullable = false)
    private String diaChiChiTiet;

    @Column(name = "phuong_xa", nullable = false)
    private String phuongXa;

    @Column(name = "tinh_thanh", nullable = false)
    private String tinhThanh;

    @Builder.Default
    @Column(name = "la_mac_dinh")
    private Boolean laMacDinh = false;
}