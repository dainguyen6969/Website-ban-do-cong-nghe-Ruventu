package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiApDungKhuyenMai;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chi_tiet_khuyen_mai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiTietKhuyenMai {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "khuyen_mai_id", nullable = false)
  private KhuyenMai khuyenMai;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @Enumerated(EnumType.STRING)
  @Column(name = "loai_ap_dung", nullable = false)
  private LoaiApDungKhuyenMai loaiApDung;

  @Builder.Default
  @Column(name = "so_luong", nullable = false)
  private Integer soLuong = 1;
}
