package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "chi_tiet_gio_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiTietGioHang {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "don_hang_id", nullable = false)
    private DonHang donHang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phien_ban_id", nullable = false)
    private PhienBanSanPham phienBan;

    @Column(name = "don_gia", nullable = false)
    private BigDecimal donGia;

    @Column(name = "so_luong", nullable = false)
    private Integer soLuong;

    @Column(name = "thanh_tien", nullable = false)
    private BigDecimal thanhTien;
}