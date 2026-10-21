package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "phieu_tra_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhieuTraHang {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_tra_hang", nullable = false, unique = true, length = 50)
  private String maTraHang;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "don_hang_id", nullable = false)
  private DonHang donHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "khach_hang_id")
  private NguoiDung khachHang;

  @Column(name = "tong_tien_hoan", nullable = false, precision = 15, scale = 2)
  private BigDecimal tongTienHoan;

  @Column(name = "hinh_thuc_hoan_tien", nullable = false, length = 50)
  private String hinhThucHoanTien;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai_tra_hang", nullable = false, length = 50)
  private TrangThaiTraHang trangThaiTraHang;

  @Column(name = "ly_do_tra", nullable = false, length = 255)
  private String lyDoTra;

  @Column(name = "ghi_chu", columnDefinition = "TEXT")
  private String ghiChu;

  @CreationTimestamp
  @Column(
      name = "ngay_tao",
      updatable = false,
      columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayTao;

  @NotNull
  @Size(max = 100)
  @Column(name = "ten_nguoi_lien_he", nullable = false, length = 100)
  private String tenNguoiLienHe;

  @NotNull
  @Size(max = 20)
  @Column(name = "sdt_nguoi_lien_he", nullable = false, length = 20)
  private String sdtNguoiLienHe;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "nguoi_tao_id", nullable = false)
  private NguoiDung nguoiTao;

  @UpdateTimestamp
  @Column(
      name = "ngay_cap_nhat",
      nullable = false,
      columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
  private LocalDateTime ngayCapNhat;

  @Column(name = "ngay_tiep_nhan_thuc_te", columnDefinition = "DATETIME")
  private LocalDateTime ngayTiepNhanThucTe;

  @Column(name = "ngay_nhan_hang", columnDefinition = "DATETIME")
  private LocalDateTime ngayNhanHang;

  @Column(name = "ngay_ket_thuc", columnDefinition = "DATETIME")
  private LocalDateTime ngayKetThuc;

  @Column(name = "ly_do_ket_thuc", columnDefinition = "TEXT")
  private String lyDoKetThuc;

  @Column(name = "du_lieu_nhan_hang", columnDefinition = "JSON")
  private String duLieuNhanHang;

  @JsonIgnore
  @AssertTrue(message = "Lý do kết thúc bắt buộc khi hủy hoặc từ chối phiếu trả hàng.")
  public boolean isLyDoKetThucHopLe() {
    return (trangThaiTraHang != TrangThaiTraHang.HUY
            && trangThaiTraHang != TrangThaiTraHang.TU_CHOI)
        || (lyDoKetThuc != null && !lyDoKetThuc.isBlank());
  }
}
