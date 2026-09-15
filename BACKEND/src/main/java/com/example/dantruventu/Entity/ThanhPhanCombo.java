package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "thanh_phan_combo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThanhPhanCombo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "san_pham_combo_id", nullable = false)
    private SanPham sanPhamCombo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phien_ban_thanh_phan_id", nullable = false)
    private PhienBanSanPham phienBanThanhPhan;

    @Builder.Default
    @Column(name = "so_luong", nullable = false)
    private Integer soLuong = 1;
}