package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "thiet_bi_bao_hanh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThietBiBaoHanh {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @Size(max = 50)
  @Column(name = "ma_theo_doi", nullable = false, unique = true, length = 50)
  private String maTheoDoi;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "chi_tiet_don_hang_id", nullable = false)
  private ChiTietDonHang chiTietDonHang;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "so_serial_id")
  private SoSerialSanPham soSerial;

  @Column(name = "han_bao_hanh", columnDefinition = "DATETIME")
  private LocalDateTime hanBaoHanh;

  @Column(name = "dau_hieu_nhan_dang", columnDefinition = "TEXT")
  private String dauHieuNhanDang;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      nullable = false,
      updatable = false,
      columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTao;

  @Column(name = "ngay_kich_hoat", columnDefinition = "DATETIME")
  private LocalDateTime ngayKichHoat;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "chi_tiet_tra_hang_id")
  private ChiTietTraHang chiTietTraHang;
}
