package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDongGoi;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

  @Column(name = "ma_don_hang", nullable = false, unique = true, length = 50)
  private String maDonHang;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "loai_don_hang", nullable = false, length = 20)
  private LoaiDonHang loaiDonHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "khach_hang_id")
  private NguoiDung khachHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nhan_vien_id")
  private NguoiDung nhanVien;

  @Column(name = "tong_tien_hang", nullable = false, precision = 15, scale = 2)
  private BigDecimal tongTienHang;

  @Builder.Default
  @Column(
      name = "tien_chiet_khau",
      precision = 15,
      scale = 2,
      columnDefinition = "DECIMAL(15,2) DEFAULT 0.00")
  private BigDecimal tienChietKhau = BigDecimal.ZERO;

  @Builder.Default
  @Column(
      name = "phi_giao_hang",
      precision = 15,
      scale = 2,
      columnDefinition = "DECIMAL(15,2) DEFAULT 0.00")
  private BigDecimal phiGiaoHang = BigDecimal.ZERO;

  @Column(name = "tong_thanh_toan", nullable = false, precision = 15, scale = 2)
  private BigDecimal tongThanhToan;

  @Column(name = "phuong_thuc_thanh_toan", nullable = false, length = 50)
  private String phuongThucThanhToan;

  @Column(name = "ma_giao_dich_thanh_toan", length = 255)
  private String maGiaoDichThanhToan;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_thanh_toan", nullable = false, length = 50)
  private TrangThaiThanhToanDonHang trangThaiThanhToan;

  @Builder.Default
  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_dong_goi", nullable = false, length = 50)
  private TrangThaiDongGoi trangThaiDongGoi = TrangThaiDongGoi.CHUA_DONG_GOI;

  @Builder.Default
  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_xuat_kho", nullable = false, length = 50)
  private TrangThaiXuatKho trangThaiXuatKho = TrangThaiXuatKho.CHUA_XUAT_KHO;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_don_hang", nullable = false, length = 50)
  private TrangThaiDonHang trangThaiDonHang;

  @Column(name = "ten_nguoi_nhan", length = 100)
  private String tenNguoiNhan;

  @Column(name = "sdt_nguoi_nhan", length = 20)
  private String sdtNguoiNhan;

  @Column(name = "dia_chi_giao_hang", length = 255)
  private String diaChiGiaoHang;

  @Column(name = "ghi_chu", columnDefinition = "TEXT")
  private String ghiChu;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      updatable = false,
      columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
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
