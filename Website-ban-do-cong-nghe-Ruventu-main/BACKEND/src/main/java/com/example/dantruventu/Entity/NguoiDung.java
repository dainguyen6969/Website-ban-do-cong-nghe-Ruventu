package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "nguoi_dung")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NguoiDung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vai_tro_id", nullable = false)
    private VaiTro vaiTro;

    @Column(name = "ho_ten", nullable = false)
    private String hoTen;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "so_dien_thoai", nullable = false, unique = true)
    private String soDienThoai;

    @Column(name = "mat_khau", nullable = false)
    private String matKhau;

    @Column(name = "anh_dai_dien")
    private String anhDaiDien;

    @Builder.Default
    @Column(name = "trang_thai", nullable = false)
    private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

    @CreationTimestamp
    @Column(name = "ngay_tao", updatable = false)
    private LocalDateTime ngayTao;

    @UpdateTimestamp
    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;

    @OneToMany(mappedBy = "nguoiDung", fetch = FetchType.LAZY)
    private List<SoDiaChi> danhSachDiaChi;

    @OneToMany(mappedBy = "nguoiDung", fetch = FetchType.LAZY)
    private List<GioHang> danhSachGioHang;

    @OneToMany(mappedBy = "khachHang", fetch = FetchType.LAZY)
    private List<DonHang> danhSachDonHangKhach;

    @OneToMany(mappedBy = "nhanVien", fetch = FetchType.LAZY)
    private List<DonHang> danhSachDonHangNhanVien;

    @OneToMany(mappedBy = "quanLy", fetch = FetchType.LAZY)
    private List<KhoHang> danhSachKhoQuanLy;

    @OneToMany(mappedBy = "nguoiTao", fetch = FetchType.LAZY)
    private List<DonNhapHang> danhSachDonNhapHang;

    @OneToMany(mappedBy = "nguoiKiem", fetch = FetchType.LAZY)
    private List<PhieuKiemKho> danhSachPhieuKiemKho;

    @OneToMany(mappedBy = "khachHang", fetch = FetchType.LAZY)
    private List<PhieuBaoHanh> danhSachBaoHanhKhachHang;

    @OneToMany(mappedBy = "nhanVien", fetch = FetchType.LAZY)
    private List<PhieuBaoHanh> danhSachBaoHanhNhanVien;

    @OneToMany(mappedBy = "khachHang", fetch = FetchType.LAZY)
    private List<PhieuTraHang> danhSachPhieuTraHang;
}