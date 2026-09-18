package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "chi_tiet_tra_hang",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_chi_tiet_tra_hang_phieu_tra_hang",
                        columnNames = "phieu_tra_hang_id"
                ),
                @UniqueConstraint(
                        name = "uk_chi_tiet_tra_hang_chi_tiet_don_hang",
                        columnNames = "chi_tiet_don_hang_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiTietTraHang {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "phieu_tra_hang_id",
            nullable = false
    )
    private PhieuTraHang phieuTraHang;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "chi_tiet_don_hang_id",
            nullable = false
    )
    private ChiTietDonHang chiTietDonHang;

    @Column(
            name = "so_luong",
            nullable = false,
            columnDefinition = "INT CHECK (so_luong > 0)"
    )
    private Integer soLuong;

    @Column(
            name = "don_gia_hoan",
            nullable = false,
            precision = 15,
            scale = 2,
            columnDefinition = "DECIMAL(15,2) CHECK (don_gia_hoan >= 0)"
    )
    private BigDecimal donGiaHoan;

    @Column(
            name = "thanh_tien_hoan",
            nullable = false,
            precision = 15,
            scale = 2,
            columnDefinition = "DECIMAL(15,2) CHECK (thanh_tien_hoan >= 0)"
    )
    private BigDecimal thanhTienHoan;
}