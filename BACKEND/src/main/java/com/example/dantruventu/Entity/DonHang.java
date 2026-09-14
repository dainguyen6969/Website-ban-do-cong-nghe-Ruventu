package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDongGoi;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "don_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonHang {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_don_hang", nullable = false, unique = true)
    private String maDonHang;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai_don_hang", nullable = false)
    private LoaiDonHang loaiDonHang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "khach_hang_id")
    private NguoiDung khachHang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nhan_vien_id")
    private NguoiDung nhanVien;

    @Column(name = "tong_tien_hang", nullable = false)
    private BigDecimal tongTienHang;

    @Builder.Default
    @Column(name = "tien_chiet_khau")
    private BigDecimal tienChietKhau = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "phi_giao_hang")
    private BigDecimal phiGiaoHang = BigDecimal.ZERO;

    @Column(name = "tong_thanh_toan", nullable = false)
    private BigDecimal tongThanhToan;

    @Column(name = "phuong_thuc_thanh_toan", nullable = false)
    private String phuongThucThanhToan;

    @Column(name = "ma_giao_dich_thanh_toan")
    private String maGiaoDichThanhToan;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai_thanh_toan", nullable = false)
    private TrangThaiThanhToanDonHang trangThaiThanhToan;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai_don_hang", nullable = false)
    private TrangThaiDonHang trangThaiDonHang;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai_dong_goi", nullable = false)
    private TrangThaiDongGoi trangThaiDongGoi =
            TrangThaiDongGoi.CHUA_DONG_GOI;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai_xuat_kho", nullable = false)
    private TrangThaiXuatKho trangThaiXuatKho =
            TrangThaiXuatKho.CHUA_XUAT_KHO;

    @Column(name = "ten_nguoi_nhan")
    private String tenNguoiNhan;

    @Column(name = "sdt_nguoi_nhan")
    private String sdtNguoiNhan;

    @Column(name = "dia_chi_giao_hang")
    private String diaChiGiaoHang;

    @Column(name = "don_vi_van_chuyen")
    private String donViVanChuyen;

    @Column(name = "ma_van_don")
    private String maVanDon;

    @Builder.Default
    @Column(name = "phi_tra_doi_tac")
    private BigDecimal phiTraDoiTac = BigDecimal.ZERO;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @CreationTimestamp
    @Column(name = "ngay_tao", updatable = false)
    private LocalDateTime ngayTao;

    @OneToMany(mappedBy = "donHang", fetch = FetchType.LAZY)
    private List<SoSerialSanPham> danhSachSoSerial;

    @OneToMany(mappedBy = "donHang", fetch = FetchType.LAZY)
    private List<ChiTietDonHang> danhSachChiTietDonHang;

    @OneToMany(mappedBy = "donHang", fetch = FetchType.LAZY)
    private List<PhieuBaoHanh> danhSachPhieuBaoHanh;

    @OneToMany(mappedBy = "donHang", fetch = FetchType.LAZY)
    private List<PhieuTraHang> danhSachPhieuTraHang;
}