package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "chi_tiet_don_nhap")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiTietDonNhap {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "don_nhap_hang_id", nullable = false)
  private DonNhapHang donNhapHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @Column(name = "so_luong", nullable = false)
  private Integer soLuong;

  @Column(name = "gia_nhap", nullable = false)
  private BigDecimal giaNhap;

  @Column(name = "thanh_tien", nullable = false)
  private BigDecimal thanhTien;
}
