package com.example.dantruventu.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "chi_tiet_don_hang")
@Check(
    name = "ck_ctdh_chiet_khau",
    constraints = "tien_chiet_khau >= 0 AND tien_chiet_khau <= thanh_tien")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiTietDonHang {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "don_hang_id", nullable = false)
  private DonHang donHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @NotNull
  @Column(name = "so_luong", nullable = false)
  private Integer soLuong;

  @NotNull
  @Column(name = "don_gia", nullable = false, precision = 15, scale = 2)
  private BigDecimal donGia;

  @NotNull
  @Column(name = "thanh_tien", nullable = false, precision = 15, scale = 2)
  private BigDecimal thanhTien;

  @Column(name = "cau_hinh_da_ban", columnDefinition = "JSON")
  private String cauHinhDaBan;

  @Builder.Default
  @NotNull
  @ColumnDefault("FALSE")
  @Column(name = "la_qua_tang", nullable = false, columnDefinition = "BOOLEAN")
  private Boolean laQuaTang = false;

  @DecimalMin("0")
  @Column(name = "tien_chiet_khau", precision = 15, scale = 2)
  private BigDecimal tienChietKhau;

  @DecimalMin("0")
  @Check(name = "ck_ctdh_thanh_toan_dong", constraints = "thanh_toan_dong >= 0")
  @Column(name = "thanh_toan_dong", precision = 15, scale = 2)
  private BigDecimal thanhToanDong;

  @JsonIgnore
  @AssertTrue(message = "Tiền chiết khấu phải từ 0 đến thành tiền của dòng.")
  public boolean isTienChietKhauHopLe() {
    return tienChietKhau == null
        || (tienChietKhau.signum() >= 0
            && (thanhTien == null || tienChietKhau.compareTo(thanhTien) <= 0));
  }
}
