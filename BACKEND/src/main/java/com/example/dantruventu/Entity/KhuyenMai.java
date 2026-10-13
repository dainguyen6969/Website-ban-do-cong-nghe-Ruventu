package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.LoaiChietKhau;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "khuyen_mai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KhuyenMai {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_chuong_trinh", nullable = false, unique = true, length = 50)
  private String maChuongTrinh;

  @Column(name = "ten_chuong_trinh", nullable = false, length = 150)
  private String tenChuongTrinh;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "phuong_thuc_khuyen_mai", nullable = false, length = 50)
  private PhuongThucKhuyenMai phuongThucKhuyenMai;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "doi_tuong_khuyen_mai", nullable = false, length = 50)
  private DoiTuongKhuyenMai doiTuongKhuyenMai;

  @Positive
  @Check(name = "ck_km_so_luong_ap_dung", constraints = "so_luong_ap_dung > 0")
  @Column(name = "so_luong_ap_dung")
  private Integer soLuongApDung;

  @Builder.Default
  @NotNull
  @Min(0)
  @ColumnDefault("0")
  @Check(name = "ck_km_so_luong_da_dung", constraints = "so_luong_da_dung >= 0")
  @Column(name = "so_luong_da_dung", nullable = false)
  private Integer soLuongDaDung = 0;

  @Column(name = "gia_tri_khuyen_mai", precision = 15, scale = 2)
  private BigDecimal giaTriKhuyenMai;

  @Column(name = "mo_ta", columnDefinition = "TEXT")
  private String moTa;

  @Column(name = "ngay_bat_dau", nullable = false, columnDefinition = "TIMESTAMP")
  private LocalDateTime ngayBatDau;

  @Column(name = "ngay_ket_thuc", nullable = false, columnDefinition = "TIMESTAMP")
  private LocalDateTime ngayKetThuc;

  @Builder.Default
  @ColumnDefault("1")
  @Column(name = "trang_thai", nullable = false, columnDefinition = "SMALLINT")
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "loai_chiet_khau", length = 20)
  private LoaiChietKhau loaiChietKhau;

  @Builder.Default
  @NotNull
  @DecimalMin("0")
  @ColumnDefault("0")
  @Check(name = "ck_km_gia_tri_toi_thieu", constraints = "gia_tri_hang_toi_thieu >= 0")
  @Column(name = "gia_tri_hang_toi_thieu", nullable = false, precision = 15, scale = 2)
  private BigDecimal giaTriHangToiThieu = BigDecimal.ZERO;

  @Builder.Default
  @NotNull
  @Min(0)
  @ColumnDefault("0")
  @Check(name = "ck_km_so_luong_toi_thieu", constraints = "so_luong_mua_toi_thieu >= 0")
  @Column(name = "so_luong_mua_toi_thieu", nullable = false)
  private Integer soLuongMuaToiThieu = 0;

  @Positive
  @Check(name = "ck_km_muc_giam_toi_da", constraints = "muc_giam_toi_da > 0")
  @Column(name = "muc_giam_toi_da", precision = 15, scale = 2)
  private BigDecimal mucGiamToiDa;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "danh_muc_id")
  private DanhMuc danhMuc;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "thuong_hieu_id")
  private ThuongHieu thuongHieu;

  @Builder.Default
  @NotNull
  @Positive
  @ColumnDefault("1")
  @Check(name = "ck_km_phien_ban_cau_hinh", constraints = "phien_ban_cau_hinh > 0")
  @Column(name = "phien_ban_cau_hinh", nullable = false)
  private Integer phienBanCauHinh = 1;

  @OneToMany(mappedBy = "khuyenMai", fetch = FetchType.LAZY)
  private List<ChiTietKhuyenMai> danhSachChiTietKhuyenMai;

  @JsonIgnore
  @AssertTrue(message = "Loại chiết khấu bắt buộc khi phương thức là CHIET_KHAU.")
  public boolean isLoaiChietKhauHopLe() {
    return phuongThucKhuyenMai != PhuongThucKhuyenMai.CHIET_KHAU || loaiChietKhau != null;
  }

  @JsonIgnore
  @AssertTrue(
      message = "TANG_SAN_PHAM phải để gia_tri_khuyen_mai null; quà lưu ở chi tiết khuyến mại.")
  public boolean isGiaTriKhuyenMaiHopLe() {
    return phuongThucKhuyenMai != PhuongThucKhuyenMai.TANG_SAN_PHAM || giaTriKhuyenMai == null;
  }

  @JsonIgnore
  @AssertTrue(message = "Phạm vi DANH_MUC/THUONG_HIEU phải có FK tương ứng.")
  public boolean isPhamViKhuyenMaiHopLe() {
    return (doiTuongKhuyenMai != DoiTuongKhuyenMai.DANH_MUC || danhMuc != null)
        && (doiTuongKhuyenMai != DoiTuongKhuyenMai.THUONG_HIEU || thuongHieu != null);
  }
}
