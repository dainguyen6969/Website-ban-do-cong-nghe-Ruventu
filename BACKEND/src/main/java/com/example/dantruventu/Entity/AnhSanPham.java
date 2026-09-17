package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "anh_san_pham")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnhSanPham {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "san_pham_id", nullable = false)
  private SanPham sanPham;

  @Column(name = "duong_dan_anh", nullable = false)
  private String duongDanAnh;

  @Builder.Default
  @Column(name = "la_anh_chinh")
  private Boolean laAnhChinh = false;

  @Builder.Default
  @Column(name = "thu_tu_hien_thi")
  private Integer thuTuHienThi = 0;
}
