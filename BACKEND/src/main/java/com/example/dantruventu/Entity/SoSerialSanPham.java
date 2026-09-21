package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiSerial;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

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
    @Column(name = "trang_thai", nullable = false)
    private TrangThaiSerial trangThai;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "don_hang_id")
    private DonHang donHang;

    @Column(name = "ngay_kich_hoat")
    private LocalDateTime ngayKichHoat;

    @Column(name = "han_bao_hanh")
    private LocalDateTime hanBaoHanh;

    @OneToMany(mappedBy = "soSerial", fetch = FetchType.LAZY)
    private List<PhieuBaoHanh> danhSachPhieuBaoHanh;
}