package com.example.dantruventu.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "chi_tiet_phi_bao_hanh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiTietPhiBaoHanh {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "phieu_bao_hanh_id", nullable = false)
  private PhieuBaoHanh phieuBaoHanh;

  @Builder.Default
  @NotNull
  @Positive
  @ColumnDefault("1")
  @Check(name = "ck_ctpbh_phien_ban_bao_gia", constraints = "phien_ban_bao_gia > 0")
  @Column(name = "phien_ban_bao_gia", nullable = false)
  private Integer phienBanBaoGia = 1;

  @NotNull
  @Size(max = 255)
  @Column(name = "noi_dung", nullable = false, length = 255)
  private String noiDung;

  @NotNull
  @Positive
  @Check(name = "ck_ctpbh_so_luong", constraints = "so_luong > 0")
  @Column(name = "so_luong", nullable = false)
  private Integer soLuong;

  @NotNull
  @DecimalMin("0")
  @Check(name = "ck_ctpbh_don_gia_khach", constraints = "don_gia_khach >= 0")
  @Column(name = "don_gia_khach", nullable = false, precision = 15, scale = 2)
  private BigDecimal donGiaKhach;

  @NotNull
  @DecimalMin("0")
  @Check(name = "ck_ctpbh_thanh_tien_khach", constraints = "thanh_tien_khach >= 0")
  @Column(name = "thanh_tien_khach", nullable = false, precision = 15, scale = 2)
  private BigDecimal thanhTienKhach;

  @DecimalMin("0")
  @Check(name = "ck_ctpbh_chi_phi_ncc", constraints = "chi_phi_ncc_du_kien >= 0")
  @Column(name = "chi_phi_ncc_du_kien", precision = 15, scale = 2)
  private BigDecimal chiPhiNccDuKien;

  @Size(max = 50)
  @Column(name = "dieu_kien_bao_hanh", length = 50)
  private String dieuKienBaoHanh;

  @JsonIgnore
  @AssertTrue(message = "Thành tiền khách phải bằng số lượng nhân đơn giá khách.")
  public boolean isThanhTienKhachHopLe() {
    return soLuong == null
        || donGiaKhach == null
        || thanhTienKhach == null
        || thanhTienKhach.compareTo(donGiaKhach.multiply(BigDecimal.valueOf(soLuong))) == 0;
  }
}
