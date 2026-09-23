package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;

@Entity
@Table(name = "khuyen_mai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KhuyenMai {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_chuong_trinh", nullable = false, unique = true)
  private String maChuongTrinh;

  @Column(name = "ten_chuong_trinh", nullable = false)
  private String tenChuongTrinh;

  @Enumerated(EnumType.STRING)
  @Column(name = "phuong_thuc_khuyen_mai", nullable = false)
  private PhuongThucKhuyenMai phuongThucKhuyenMai;

  @Enumerated(EnumType.STRING)
  @Column(name = "doi_tuong_khuyen_mai", nullable = false)
  private DoiTuongKhuyenMai doiTuongKhuyenMai;

  @Column(name = "so_luong_ap_dung")
  private Integer soLuongApDung;

  @Builder.Default
  @Column(name = "so_luong_da_dung")
  private Integer soLuongDaDung = 0;

  @Column(name = "gia_tri_khuyen_mai")
  private BigDecimal giaTriKhuyenMai;

  @Column(name = "mo_ta", columnDefinition = "TEXT")
  private String moTa;

  @Column(name = "ngay_bat_dau", nullable = false)
  private LocalDateTime ngayBatDau;

  @Column(name = "ngay_ket_thuc", nullable = false)
  private LocalDateTime ngayKetThuc;

  @Builder.Default
  @Column(name = "trang_thai", nullable = false)
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @OneToMany(mappedBy = "khuyenMai", fetch = FetchType.LAZY)
  private List<ChiTietKhuyenMai> danhSachChiTietKhuyenMai;
}
