package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ton_kho")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TonKho {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "kho_hang_id", nullable = false)
  private KhoHang khoHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @Builder.Default
  @Column(name = "ton_thuc_te")
  private Integer tonThucTe = 0;

  @Builder.Default
  @Column(name = "ton_co_the_ban")
  private Integer tonCoTheBan = 0;

  @Builder.Default
  @Column(name = "hang_loi")
  private Integer hangLoi = 0;
}
