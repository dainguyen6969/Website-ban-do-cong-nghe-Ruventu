package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiTraHang;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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

    @Column(name = "ma_tra_hang", nullable = false, unique = true)
    private String maTraHang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "don_hang_id", nullable = false)
    private DonHang donHang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "khach_hang_id", nullable = false)
    private NguoiDung khachHang;

    @Column(name = "tong_tien_hoan", nullable = false)
    private BigDecimal tongTienHoan;

    @Column(name = "hinh_thuc_hoan_tien", nullable = false)
    private String hinhThucHoanTien;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai_tra_hang", nullable = false)
    private TrangThaiTraHang trangThaiTraHang;

    @Column(name = "ly_do_tra", nullable = false)
    private String lyDoTra;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @CreationTimestamp
    @Column(name = "ngay_tao", updatable = false)
    private LocalDateTime ngayTao;
}