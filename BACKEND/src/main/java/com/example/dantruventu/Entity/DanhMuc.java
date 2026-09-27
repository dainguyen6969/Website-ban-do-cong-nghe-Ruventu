package com.example.dantruventu.Entity;

import com.example.dantruventu.Config.TrangThaiCoBanConverter;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import java.util.List;
import lombok.*;

@Entity
@Table(name = "danh_muc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DanhMuc {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "danh_muc_cha_id")
  private DanhMuc danhMucCha;

  @Column(name = "ten_danh_muc", nullable = false)
  private String tenDanhMuc;

  @Column(name = "duong_dan_url", nullable = false, unique = true)
  private String duongDanUrl;

  @Column(name = "anh_dai_dien")
  private String anhDaiDien;

  @Builder.Default
  @Convert(converter = TrangThaiCoBanConverter.class)
  @Column(name = "trang_thai", nullable = false)
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @OneToMany(mappedBy = "danhMucCha", fetch = FetchType.LAZY)
  private List<DanhMuc> danhSachDanhMucCon;

  @OneToMany(mappedBy = "danhMuc", fetch = FetchType.LAZY)
  private List<SanPham> danhSachSanPham;
}
