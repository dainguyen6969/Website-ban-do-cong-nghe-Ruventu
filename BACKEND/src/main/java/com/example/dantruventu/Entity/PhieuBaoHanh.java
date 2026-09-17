package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

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

  @Column(name = "ma_phieu", nullable = false, unique = true)
  private String maPhieu;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "don_hang_id", nullable = false)
  private DonHang donHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "khach_hang_id", nullable = false)
  private NguoiDung khachHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "so_serial_id", nullable = false)
  private SoSerialSanPham soSerial;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nhan_vien_id", nullable = false)
  private NguoiDung nhanVien;

  @Column(name = "ly_do_bao_hanh", nullable = false)
  private String lyDoBaoHanh;

  @Column(name = "tinh_trang_tiep_nhan", nullable = false, columnDefinition = "TEXT")
  private String tinhTrangTiepNhan;

  @Column(name = "don_vi_bao_hanh")
  private String donViBaoHanh;

  @Enumerated(EnumType.STRING)
  @Column(name = "trang_thai_xu_ly", nullable = false)
  private TrangThaiBaoHanh trangThaiXuLy;

  @Column(name = "ghi_chu", columnDefinition = "TEXT")
  private String ghiChu;

  @CreationTimestamp
  @Column(name = "ngay_tiep_nhan", updatable = false)
  private LocalDateTime ngayTiepNhan;
}
