package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "san_pham")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SanPham {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "danh_muc_id", nullable = false)
    private DanhMuc danhMuc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thuong_hieu_id")
    private ThuongHieu thuongHieu;

    @Column(name = "ten_san_pham", nullable = false)
    private String tenSanPham;

    @Column(name = "ma_san_pham", nullable = false, unique = true)
    private String maSanPham;

    @Column(name = "mo_ta", columnDefinition = "TEXT")
    private String moTa;

    @Column(name = "thong_so_ky_thuat", columnDefinition = "JSON")
    private String thongSoKyThuat;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai_san_pham", nullable = false)
    private LoaiSanPham loaiSanPham;

    @Column(name = "thue_vat")
    private BigDecimal thueVat;

    @Builder.Default
    @Column(name = "trang_thai", nullable = false)
    private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

    @CreationTimestamp
    @Column(
            name = "ngay_tao",
            updatable = false,
            columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    )
    private LocalDateTime ngayTao;

    @OneToMany(mappedBy = "sanPham", fetch = FetchType.LAZY)
    private List<AnhSanPham> danhSachAnhSanPham;

    @OneToMany(mappedBy = "sanPham", fetch = FetchType.LAZY)
    private List<PhienBanSanPham> danhSachPhienBan;

    @OneToMany(mappedBy = "sanPhamCombo", fetch = FetchType.LAZY)
    private List<ThanhPhanCombo> danhSachThanhPhanCombo;
}