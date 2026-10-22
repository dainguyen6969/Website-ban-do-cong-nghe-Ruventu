package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Check;

@Entity
@Table(
    name = "giu_hang_tung_phan",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_giu_hang_tung_phan_don_phien_ban",
            columnNames = {"don_hang_id", "phien_ban_id"}))
@Check(name = "ck_giu_hang_tung_phan_so_luong", constraints = "so_luong > 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GiuHangTungPhan {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "don_hang_id", nullable = false)
  private Long donHangId;

  @Column(name = "kho_hang_id", nullable = false)
  private Long khoHangId;

  @Column(name = "phien_ban_id", nullable = false)
  private Long phienBanId;

  @Column(name = "so_luong", nullable = false)
  private Integer soLuong;
}
