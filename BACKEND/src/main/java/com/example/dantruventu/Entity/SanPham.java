package com.example.dantruventu.Entity;

import com.example.dantruventu.Config.TrangThaiCoBanConverter;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

  @Column(name = "ten_san_pham", nullable = false, length = 255)
  private String tenSanPham;

  @Column(name = "ma_san_pham", nullable = false, unique = true, length = 50)
  private String maSanPham;

  @Column(name = "mo_ta", columnDefinition = "TEXT")
  private String moTa;

  @Column(name = "thong_so_ky_thuat", columnDefinition = "JSON")
  private String thongSoKyThuat;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "loai_san_pham", nullable = false, length = 20)
  private LoaiSanPham loaiSanPham;

  @Builder.Default
  @ColumnDefault("0.00")
  @Column(name = "thue_vat", precision = 5, scale = 2)
  private BigDecimal thueVat = BigDecimal.ZERO;

  @Builder.Default
  @Convert(converter = TrangThaiCoBanConverter.class)
  @ColumnDefault("1")
  @Column(name = "trang_thai", nullable = false, columnDefinition = "SMALLINT")
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @NotNull
  @Min(0)
  @Check(name = "ck_san_pham_bao_hanh_thang", constraints = "thoi_han_bao_hanh_thang >= 0")
  @Column(name = "thoi_han_bao_hanh_thang", nullable = false)
  private Integer thoiHanBaoHanhThang;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      updatable = false,
      columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTao;

  @OneToMany(mappedBy = "sanPham", fetch = FetchType.LAZY)
  private List<AnhSanPham> danhSachAnhSanPham;

  @OneToMany(mappedBy = "sanPham", fetch = FetchType.LAZY)
  private List<PhienBanSanPham> danhSachPhienBan;

  @OneToMany(mappedBy = "sanPhamCombo", fetch = FetchType.LAZY)
  private List<ThanhPhanCombo> danhSachThanhPhanCombo;
}
