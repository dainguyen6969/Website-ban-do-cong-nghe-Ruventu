package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanNhap;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "don_nhap_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonNhapHang {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_don_nhap", nullable = false, unique = true)
  private String maDonNhap;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nha_cung_cap_id", nullable = false)
  private NhaCungCap nhaCungCap;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nguoi_tao_id", nullable = false)
  private NguoiDung nguoiTao;

  @Column(name = "tong_tien", nullable = false)
  private BigDecimal tongTien;

  @Enumerated(EnumType.STRING)
  @Column(name = "trang_thai_thanh_toan", nullable = false)
  private TrangThaiThanhToanNhap trangThaiThanhToan;

  @Enumerated(EnumType.STRING)
  @Column(name = "trang_thai_nhap", nullable = false)
  private TrangThaiNhapHang trangThaiNhap;

  @Builder.Default
  @Column(name = "ap_dung_thue", columnDefinition = "BOOLEAN DEFAULT FALSE")
  private Boolean apDungThue = false;

  @CreationTimestamp
  @Column(name = "ngay_tao", updatable = false)
  private LocalDateTime ngayTao;

  @OneToMany(mappedBy = "donNhapHang", fetch = FetchType.LAZY)
  private List<ChiTietDonNhap> danhSachChiTietDonNhap;
}
