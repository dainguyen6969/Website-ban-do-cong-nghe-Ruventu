package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "lich_su_xu_ly_don_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LichSuXuLyDonHang {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "don_hang_id", nullable = false)
  private DonHang donHang;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "nguoi_thuc_hien_id", nullable = false)
  private NguoiDung nguoiThucHien;

  @Column(name = "hanh_dong", nullable = false, length = 50)
  private String hanhDong;

  @Column(name = "mo_ta", nullable = false, length = 255)
  private String moTa;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_don_hang", nullable = false, length = 50)
  private TrangThaiDonHang trangThaiDonHang;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_dong_goi", nullable = false, length = 50)
  private TrangThaiDongGoi trangThaiDongGoi;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_xuat_kho", nullable = false, length = 50)
  private TrangThaiXuatKho trangThaiXuatKho;

  @Column(name = "ngay_thuc_hien", nullable = false, columnDefinition = "DATETIME(6)")
  private LocalDateTime ngayThucHien;
}
