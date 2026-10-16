package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.KetQuaXuLyBaoHanh;
import com.example.dantruventu.Enum.NguonSanPhamThayTheBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoGiaBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "phieu_bao_hanh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhieuBaoHanh {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @Size(max = 50)
  @Column(name = "ma_phieu", nullable = false, unique = true, length = 50)
  private String maPhieu;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "don_hang_id", nullable = false)
  private DonHang donHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "khach_hang_id")
  private NguoiDung khachHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "so_serial_id")
  private SoSerialSanPham soSerial;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "nhan_vien_id", nullable = false)
  private NguoiDung nhanVien;

  @NotNull
  @Size(max = 255)
  @Column(name = "ly_do_bao_hanh", nullable = false, length = 255)
  private String lyDoBaoHanh;

  @NotNull
  @Column(name = "tinh_trang_tiep_nhan", nullable = false, columnDefinition = "TEXT")
  private String tinhTrangTiepNhan;

  @Size(max = 150)
  @Column(name = "don_vi_bao_hanh", length = 150)
  private String donViBaoHanh;

  @NotNull
  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_xu_ly", nullable = false, length = 50)
  private TrangThaiBaoHanh trangThaiXuLy;

  @Column(name = "ghi_chu", columnDefinition = "TEXT")
  private String ghiChu;

  @CreationTimestamp
  @Column(
      name = "ngay_tiep_nhan",
      updatable = false,
      columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTiepNhan;

  @UpdateTimestamp
  @Column(name = "ngay_cap_nhat", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayCapNhat;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "thiet_bi_id", nullable = false)
  private ThietBiBaoHanh thietBi;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "thiet_bi_thay_the_id")
  private ThietBiBaoHanh thietBiThayThe;

  @Column(name = "ket_luan_kiem_tra", columnDefinition = "TEXT")
  private String ketLuanKiemTra;

  @Builder.Default
  @NotNull
  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @ColumnDefault("'CHUA_CO_KET_QUA'")
  @Column(name = "ket_qua_xu_ly", nullable = false, length = 50)
  private KetQuaXuLyBaoHanh ketQuaXuLy = KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_bao_gia", length = 50)
  private TrangThaiBaoGiaBaoHanh trangThaiBaoGia;

  @Builder.Default
  @NotNull
  @Positive
  @ColumnDefault("1")
  @Check(name = "ck_pbh_phien_ban_bao_gia", constraints = "phien_ban_bao_gia > 0")
  @Column(name = "phien_ban_bao_gia", nullable = false)
  private Integer phienBanBaoGia = 1;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "nguon_san_pham_thay_the", length = 50)
  private NguonSanPhamThayTheBaoHanh nguonSanPhamThayThe;

  @NotNull
  @Size(max = 100)
  @Column(name = "ten_nguoi_lien_he", nullable = false, length = 100)
  private String tenNguoiLienHe;

  @NotNull
  @Size(max = 20)
  @Column(name = "sdt_nguoi_lien_he", nullable = false, length = 20)
  private String sdtNguoiLienHe;

  @DecimalMin("0")
  @Check(name = "ck_pbh_chi_phi_ncc", constraints = "chi_phi_ncc_xac_nhan >= 0")
  @Column(name = "chi_phi_ncc_xac_nhan", precision = 15, scale = 2)
  private BigDecimal chiPhiNccXacNhan;
}
