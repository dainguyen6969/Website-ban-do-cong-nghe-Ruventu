package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "the_kho")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TheKho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kho_hang_id", nullable = false)
    private KhoHang khoHang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phien_ban_id", nullable = false)
    private PhienBanSanPham phienBan;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai_giao_dich", nullable = false)
    private LoaiGiaoDichKho loaiGiaoDich;

    @Column(name = "ma_chung_tu_goc", nullable = false)
    private Long maChungTuGoc;

    @Column(name = "so_luong_thay_doi", nullable = false)
    private Integer soLuongThayDoi;

    @Column(name = "ton_cuoi", nullable = false)
    private Integer tonCuoi;

    @Column(name = "ghi_chu")
    private String ghiChu;

    @CreationTimestamp
    @Column(name = "ngay_tao", updatable = false)
    private LocalDateTime ngayTao;
}