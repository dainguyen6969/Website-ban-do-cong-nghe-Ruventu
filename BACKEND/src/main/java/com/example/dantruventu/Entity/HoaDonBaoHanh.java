package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiHoaDonBaoHanh;
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
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "hoa_don_bao_hanh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HoaDonBaoHanh {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @Size(max = 50)
  @Column(name = "ma_hoa_don", nullable = false, unique = true, length = 50)
  private String maHoaDon;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "phieu_bao_hanh_id", nullable = false)
  private PhieuBaoHanh phieuBaoHanh;

  @NotNull
  @Positive
  @Check(name = "ck_hdbh_phien_ban_bao_gia", constraints = "phien_ban_bao_gia > 0")
  @Column(name = "phien_ban_bao_gia", nullable = false)
  private Integer phienBanBaoGia;

  @NotNull
  @DecimalMin("0")
  @Check(name = "ck_hdbh_tong_tien", constraints = "tong_tien >= 0")
  @Column(name = "tong_tien", nullable = false, precision = 15, scale = 2)
  private BigDecimal tongTien;

  @Builder.Default
  @NotNull
  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @ColumnDefault("'HIEU_LUC'")
  @Column(name = "trang_thai", nullable = false, length = 50)
  private TrangThaiHoaDonBaoHanh trangThai = TrangThaiHoaDonBaoHanh.HIEU_LUC;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "nguoi_lap_id", nullable = false)
  private NguoiDung nguoiLap;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      nullable = false,
      updatable = false,
      columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTao;
}
