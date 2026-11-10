package com.example.dantruventu.Entity;

import com.example.dantruventu.Config.TrangThaiCoBanConverter;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "kho_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KhoHang {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "quan_ly_id")
  private NguoiDung quanLy;

  @Column(name = "ma_kho", nullable = false, unique = true)
  private String maKho;

  @Column(name = "ten_kho", nullable = false)
  private String tenKho;

  @Column(name = "dia_chi", nullable = false)
  private String diaChi;

  @Builder.Default
  @Convert(converter = TrangThaiCoBanConverter.class)
  @ColumnDefault("1")
  @Column(name = "trang_thai", nullable = false, columnDefinition = "SMALLINT")
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @OneToMany(mappedBy = "khoHang", fetch = FetchType.LAZY)
  private List<TonKho> danhSachTonKho;

  @OneToMany(mappedBy = "khoHang", fetch = FetchType.LAZY)
  private List<TheKho> danhSachTheKho;
}
