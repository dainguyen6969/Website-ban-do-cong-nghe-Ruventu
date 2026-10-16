package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "lich_su_bao_hanh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LichSuBaoHanh {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phieu_bao_hanh_id")
  private PhieuBaoHanh phieuBaoHanh;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nguoi_thuc_hien_id")
  private NguoiDung nguoiThucHien;

  @NotNull
  @Size(max = 50)
  @Column(name = "loai_su_kien", nullable = false, length = 50)
  private String loaiSuKien;

  @NotNull
  @Column(name = "noi_dung", nullable = false, columnDefinition = "TEXT")
  private String noiDung;

  @Column(name = "du_lieu_chi_tiet", columnDefinition = "JSON")
  private String duLieuChiTiet;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      nullable = false,
      updatable = false,
      columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTao;
}
