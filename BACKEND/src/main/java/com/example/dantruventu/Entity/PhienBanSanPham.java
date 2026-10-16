package com.example.dantruventu.Entity;

import com.example.dantruventu.Config.TrangThaiCoBanConverter;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

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

  @Column(name = "ten_phien_ban", nullable = false, length = 150)
  private String tenPhienBan;

  @Column(name = "ma_vach", unique = true, length = 50)
  private String maVach;

  @Column(name = "gia_ban_le", nullable = false, precision = 15, scale = 2)
  private BigDecimal giaBanLe;

  @Column(name = "gia_nhap", nullable = false, precision = 15, scale = 2)
  private BigDecimal giaNhap;

  @Builder.Default
  @ColumnDefault("0.00")
  @Column(name = "khoi_luong", precision = 10, scale = 2)
  private BigDecimal khoiLuong = BigDecimal.ZERO;

  @Builder.Default
  @Convert(converter = TrangThaiCoBanConverter.class)
  @ColumnDefault("1")
  @Column(name = "trang_thai", nullable = false, columnDefinition = "SMALLINT")
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @NotNull
  @Column(name = "co_quan_ly_serial", nullable = false, columnDefinition = "BOOLEAN")
  private Boolean coQuanLySerial;

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
