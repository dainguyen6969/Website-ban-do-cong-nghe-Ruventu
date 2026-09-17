package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import java.util.List;
import lombok.*;

@Entity
@Table(name = "thuong_hieu")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThuongHieu {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ten_thuong_hieu", nullable = false)
  private String tenThuongHieu;

  @Column(name = "duong_dan_url", nullable = false, unique = true)
  private String duongDanUrl;

  @Column(name = "logo")
  private String logo;

  @Builder.Default
  @Column(name = "trang_thai", nullable = false)
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @OneToMany(mappedBy = "thuongHieu", fetch = FetchType.LAZY)
  private List<SanPham> danhSachSanPham;
}
