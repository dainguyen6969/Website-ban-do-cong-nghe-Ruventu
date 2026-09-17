package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "phieu_giao_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhieuGiaoHang {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_phieu_giao_hang", nullable = false, unique = true, length = 20)
  private String maPhieuGiaoHang;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "don_hang_id", nullable = false)
  private DonHang donHang;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "doi_tac_van_chuyen_id", nullable = false)
  private DoiTacVanChuyen doiTacVanChuyen;

  @Column(name = "ma_van_don", unique = true, length = 50)
  private String maVanDon;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_giao_hang", nullable = false, length = 30)
  private TrangThaiGiaoHangEnum trangThaiGiaoHang;

  @Builder.Default
  @Column(
      name = "tien_thu_ho_cod",
      nullable = false,
      precision = 15,
      scale = 2,
      columnDefinition = "DECIMAL(15,2) DEFAULT 0")
  private BigDecimal tienThuHoCod = BigDecimal.ZERO;

  @Builder.Default
  @Column(
      name = "phi_tra_doi_tac",
      nullable = false,
      precision = 15,
      scale = 2,
      columnDefinition = "DECIMAL(15,2) DEFAULT 0")
  private BigDecimal phiTraDoiTac = BigDecimal.ZERO;

  @CreationTimestamp
  @Column(name = "ngay_tao", nullable = false, updatable = false, columnDefinition = "DATETIME")
  private LocalDateTime ngayTao;

  @Column(name = "ngay_cap_nhat", columnDefinition = "DATETIME")
  private LocalDateTime ngayCapNhat;
}
