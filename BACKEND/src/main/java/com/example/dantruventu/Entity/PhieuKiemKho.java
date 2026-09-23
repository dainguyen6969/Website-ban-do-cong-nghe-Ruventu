package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiPhieuKiemKho;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "phieu_kiem_kho")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhieuKiemKho {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ma_phieu", nullable = false, unique = true)
  private String maPhieu;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nguoi_kiem_id", nullable = false)
  private NguoiDung nguoiKiem;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @Column(name = "ton_he_thong", nullable = false)
  private Integer tonHeThong;

  @Column(name = "ton_thuc_te", nullable = false)
  private Integer tonThucTe;

  @Column(name = "so_luong_chenh_lech", nullable = false)
  private Integer soLuongChenhLech;

  @Column(name = "ly_do")
  private String lyDo;

  @Enumerated(EnumType.STRING)
  @Column(name = "trang_thai", nullable = false)
  private TrangThaiPhieuKiemKho trangThai;

  @CreationTimestamp
  @Column(name = "ngay_tao", updatable = false)
  private LocalDateTime ngayTao;
}
