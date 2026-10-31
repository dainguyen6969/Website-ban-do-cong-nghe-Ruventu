package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiSerial;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "so_serial_san_pham")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SoSerialSanPham {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @Column(name = "so_serial", nullable = false, unique = true, length = 100)
  private String soSerial;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "trang_thai", nullable = false, length = 50)
  private TrangThaiSerial trangThai;

  @Builder.Default
  @Column(name = "tinh_trang_hang", nullable = false, length = 40)
  private String tinhTrangHang = "CHUA_XAC_DINH";

  @Builder.Default
  @Column(name = "bi_thu_hoi", nullable = false)
  private Boolean biThuHoi = false;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "don_hang_id")
  private DonHang donHang;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "chi_tiet_dong_goi_id")
  private ChiTietDonHang chiTietDongGoi;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "don_nhap_hang_id")
  private DonNhapHang donNhapHang;

  @Column(name = "ngay_kich_hoat")
  private LocalDateTime ngayKichHoat;

  @Column(name = "han_bao_hanh")
  private LocalDateTime hanBaoHanh;

  @OneToMany(mappedBy = "soSerial", fetch = FetchType.LAZY)
  private List<PhieuBaoHanh> danhSachPhieuBaoHanh;
}
