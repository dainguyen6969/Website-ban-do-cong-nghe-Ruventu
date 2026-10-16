package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity
@Table(
    name = "thuoc_tinh_phien_ban",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_ttpb_phien_ban_ten",
            columnNames = {"phien_ban_id", "ten_thuoc_tinh"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThuocTinhPhienBan {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @NotNull
  @Size(max = 100)
  @Column(name = "ten_thuoc_tinh", nullable = false, length = 100)
  private String tenThuocTinh;

  @NotNull
  @Size(max = 255)
  @Column(name = "gia_tri", nullable = false, length = 255)
  private String giaTri;
}
