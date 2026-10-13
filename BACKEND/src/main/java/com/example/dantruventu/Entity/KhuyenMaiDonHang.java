package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
@Table(name = "khuyen_mai_don_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KhuyenMaiDonHang {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // Theo ERD cột đã xác nhận: một đơn tối đa một chương trình, nên giữ UNIQUE/OneToOne.
  @NotNull
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "don_hang_id", nullable = false, unique = true)
  private DonHang donHang;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "khuyen_mai_id", nullable = false)
  private KhuyenMai khuyenMai;

  @NotNull
  @Size(max = 50)
  @Column(name = "ma_chuong_trinh", nullable = false, length = 50)
  private String maChuongTrinh;

  @NotNull
  @Size(max = 150)
  @Column(name = "ten_chuong_trinh", nullable = false, length = 150)
  private String tenChuongTrinh;

  @Builder.Default
  @NotNull
  @DecimalMin("0")
  @ColumnDefault("0")
  @Check(name = "ck_kmdh_so_tien_giam", constraints = "so_tien_giam >= 0")
  @Column(name = "so_tien_giam", nullable = false, precision = 15, scale = 2)
  private BigDecimal soTienGiam = BigDecimal.ZERO;

  @NotNull
  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_ap_dung", nullable = false, length = 50)
  private TrangThaiApDungKhuyenMai trangThaiApDung;

  @NotNull
  @Column(name = "du_lieu_ap_dung", nullable = false, columnDefinition = "JSON")
  private String duLieuApDung;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nguoi_thuc_hien_id")
  private NguoiDung nguoiThucHien;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      nullable = false,
      updatable = false,
      columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTao;

  @UpdateTimestamp
  @Column(
      name = "ngay_cap_nhat",
      nullable = false,
      columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayCapNhat;

  @Column(name = "ly_do_giai_phong", columnDefinition = "TEXT")
  private String lyDoGiaiPhong;
}
