package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "the_kho")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TheKho {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "kho_hang_id", nullable = false)
  private KhoHang khoHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "loai_giao_dich", nullable = false, length = 50)
  private LoaiGiaoDichKho loaiGiaoDich;

  @Column(name = "ma_chung_tu_goc", nullable = false)
  private Long maChungTuGoc;

  @Column(name = "so_luong_thay_doi", nullable = false)
  private Integer soLuongThayDoi;

  @Column(name = "ton_cuoi", nullable = false)
  private Integer tonCuoi;

  @Column(name = "ghi_chu", length = 255)
  private String ghiChu;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      updatable = false,
      columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTao;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phieu_bao_hanh_id")
  private PhieuBaoHanh phieuBaoHanh;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phieu_tra_hang_id")
  private PhieuTraHang phieuTraHang;
}
