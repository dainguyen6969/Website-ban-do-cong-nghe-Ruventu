package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(
    name = "chi_tiet_tra_hang",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_ctth_phieu_dong",
          columnNames = {"phieu_tra_hang_id", "chi_tiet_don_hang_id"})
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiTietTraHang {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "phieu_tra_hang_id", nullable = false)
  private PhieuTraHang phieuTraHang;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "chi_tiet_don_hang_id", nullable = false)
  private ChiTietDonHang chiTietDonHang;

  @NotNull
  @Positive
  @Column(name = "so_luong", nullable = false, columnDefinition = "INT CHECK (so_luong > 0)")
  private Integer soLuong;

  @NotNull
  @DecimalMin("0")
  @Column(
      name = "don_gia_hoan",
      nullable = false,
      precision = 15,
      scale = 2,
      columnDefinition = "DECIMAL(15,2) CHECK (don_gia_hoan >= 0)")
  private BigDecimal donGiaHoan;

  @NotNull
  @DecimalMin("0")
  @Column(
      name = "thanh_tien_hoan",
      nullable = false,
      precision = 15,
      scale = 2,
      columnDefinition = "DECIMAL(15,2) CHECK (thanh_tien_hoan >= 0)")
  private BigDecimal thanhTienHoan;
}
