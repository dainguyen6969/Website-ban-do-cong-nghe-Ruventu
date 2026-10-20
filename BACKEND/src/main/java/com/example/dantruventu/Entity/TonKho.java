package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;

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
  @ColumnDefault("0")
  @Column(name = "ton_thuc_te")
  private Integer tonThucTe = 0;

  @Builder.Default
  @ColumnDefault("0")
  @Column(name = "ton_co_the_ban")
  private Integer tonCoTheBan = 0;

  @Builder.Default
  @ColumnDefault("0")
  @Column(name = "hang_loi")
  private Integer hangLoi = 0;

  @Column(name = "vi_tri_luu_kho", length = 100)
  private String viTriLuuKho;

  @Builder.Default
  @NotNull
  @Min(0)
  @ColumnDefault("0")
  @Check(name = "ck_ton_kho_muc_ton_toi_thieu", constraints = "muc_ton_toi_thieu >= 0")
  @Column(name = "muc_ton_toi_thieu", nullable = false)
  private Integer mucTonToiThieu = 0;

  @Builder.Default
  @NotNull
  @Min(0)
  @ColumnDefault("0")
  @Check(name = "ck_ton_kho_giu_cho_bao_hanh", constraints = "so_luong_giu_cho_bao_hanh >= 0")
  @Column(name = "so_luong_giu_cho_bao_hanh", nullable = false)
  private Integer soLuongGiuChoBaoHanh = 0;
}
