package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiTraHang;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "phieu_tra_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhieuTraHang {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_tra_hang", nullable = false, unique = true, length = 50)
  private String maTraHang;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "don_hang_id", nullable = false)
  private DonHang donHang;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "khach_hang_id", nullable = false)
  private NguoiDung khachHang;

  @Column(name = "tong_tien_hoan", nullable = false, precision = 15, scale = 2)
  private BigDecimal tongTienHoan;

  @Column(name = "hinh_thuc_hoan_tien", nullable = false, length = 50)
  private String hinhThucHoanTien;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_tra_hang", nullable = false, length = 50)
  private TrangThaiTraHang trangThaiTraHang;

  @Column(name = "ly_do_tra", nullable = false, length = 255)
  private String lyDoTra;

  @Column(name = "ghi_chu", columnDefinition = "TEXT")
  private String ghiChu;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      updatable = false,
      columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTao;
}
