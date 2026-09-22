package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiDoiTacVanChuyenEnum;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "doi_tac_van_chuyen")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoiTacVanChuyen {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_doi_tac", nullable = false, unique = true, length = 20)
  private String maDoiTac;

  @Column(name = "ten_doi_tac", nullable = false, length = 100)
  private String tenDoiTac;

  @Column(name = "so_dien_thoai", nullable = false, length = 15)
  private String soDienThoai;

  @Column(name = "email", length = 100)
  private String email;

  @Column(name = "dia_chi", length = 255)
  private String diaChi;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "loai_doi_tac", nullable = false, length = 30)
  private LoaiDoiTacVanChuyenEnum loaiDoiTac;

  @Builder.Default
  @Column(name = "trang_thai", nullable = false)
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;

  @Column(name = "ghi_chu", columnDefinition = "TEXT")
  private String ghiChu;

  @Column(name = "ngay_cap_nhat", columnDefinition = "DATETIME")
  private LocalDateTime ngayCapNhat;

  @CreationTimestamp
  @Column(name = "ngay_tao", nullable = false, updatable = false, columnDefinition = "DATETIME")
  private LocalDateTime ngayTao;
}
