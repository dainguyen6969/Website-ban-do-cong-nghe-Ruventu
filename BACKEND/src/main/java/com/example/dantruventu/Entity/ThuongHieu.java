package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(
    name = "thuong_hieu",
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_thuong_hieu_ten", columnNames = "ten_thuong_hieu")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThuongHieu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

  @Column(name = "ten_thuong_hieu", nullable = false, length = 100)
  private String tenThuongHieu;

  @Column(name = "duong_dan_url", nullable = false, unique = true, length = 50)
  private String duongDanUrl;

  @Column(name = "logo", length = 255)
  private String logo;

    @Builder.Default
    @Column(name = "trang_thai", nullable = false)
    private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

    @OneToMany(mappedBy = "thuongHieu", fetch = FetchType.LAZY)
    private List<SanPham> danhSachSanPham;
}