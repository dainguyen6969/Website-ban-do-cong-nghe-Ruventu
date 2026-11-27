package com.example.dantruventu.Entity;

import com.example.dantruventu.Config.TrangThaiCoBanConverter;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(
    name = "nha_cung_cap",
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_ncc_so_dien_thoai", columnNames = "so_dien_thoai"),
      @UniqueConstraint(name = "uk_ncc_email", columnNames = "email")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NhaCungCap {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_nha_cung_cap", nullable = false, unique = true)
  private String maNhaCungCap;

  @Column(name = "ten_nha_cung_cap", nullable = false)
  private String tenNhaCungCap;

  @Column(name = "so_dien_thoai", nullable = false)
  private String soDienThoai;

  @Column(name = "email")
  private String email;

  @Column(name = "dia_chi")
  private String diaChi;

  @Builder.Default
  @Convert(converter = TrangThaiCoBanConverter.class)
  @ColumnDefault("1")
  @Column(name = "trang_thai", nullable = false, columnDefinition = "SMALLINT")
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @OneToMany(mappedBy = "nhaCungCap", fetch = FetchType.LAZY)
  private List<DonNhapHang> danhSachDonNhapHang;
}
