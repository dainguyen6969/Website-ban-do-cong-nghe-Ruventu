package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "phien_ban_san_pham")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhienBanSanPham {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "san_pham_id", nullable = false)
    private SanPham sanPham;

    @Column(name = "ten_phien_ban", nullable = false)
    private String tenPhienBan;

    @Column(name = "ma_vach", unique = true)
    private String maVach;

    @Column(name = "gia_ban_le", nullable = false)
    private BigDecimal giaBanLe;

    @Column(name = "gia_nhap", nullable = false)
    private BigDecimal giaNhap;

    @Builder.Default
    @Column(name = "khoi_luong")
    private BigDecimal khoiLuong = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "trang_thai", nullable = false)
    private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

    @OneToMany(mappedBy = "phienBan", fetch = FetchType.LAZY)
    private List<ChiTietDonNhap> danhSachChiTietDonNhap;

    @OneToMany(mappedBy = "phienBan", fetch = FetchType.LAZY)
    private List<GioHang> danhSachGioHang;

    @OneToMany(mappedBy = "phienBan", fetch = FetchType.LAZY)
    private List<ChiTietKhuyenMai> danhSachChiTietKhuyenMai;

    @OneToMany(mappedBy = "phienBan", fetch = FetchType.LAZY)
    private List<SoSerialSanPham> danhSachSoSerial;

    @OneToMany(mappedBy = "phienBanThanhPhan", fetch = FetchType.LAZY)
    private List<ThanhPhanCombo> danhSachThanhPhanCombo;

    @OneToMany(mappedBy = "phienBan", fetch = FetchType.LAZY)
    private List<TheKho> danhSachTheKho;

    @OneToMany(mappedBy = "phienBan", fetch = FetchType.LAZY)
    private List<TonKho> danhSachTonKho;

    @OneToMany(mappedBy = "phienBan", fetch = FetchType.LAZY)
    private List<PhieuKiemKho> danhSachPhieuKiemKho;

    @OneToMany(mappedBy = "phienBan", fetch = FetchType.LAZY)
    private List<ChiTietDonHang> danhSachChiTietDonHang;
}