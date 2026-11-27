package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.PhieuTraHang;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhieuTraHangRepository
    extends JpaRepository<PhieuTraHang, Long>, JpaSpecificationExecutor<PhieuTraHang> {

  @Override
  @EntityGraph(attributePaths = {"donHang", "khachHang"})
  Optional<PhieuTraHang> findById(Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT p FROM PhieuTraHang p WHERE p.id = :id")
  Optional<PhieuTraHang> findByIdForUpdate(@Param("id") Long id);

  @Override
  @EntityGraph(attributePaths = {"donHang", "khachHang"})
  Page<PhieuTraHang> findAll(Specification<PhieuTraHang> specification, Pageable pageable);

  Optional<PhieuTraHang> findByMaTraHang(String maTraHang);

  boolean existsByDonHang_Id(Long orderId);

  List<PhieuTraHang> findByDonHang_IdOrderByIdAsc(Long orderId);

  interface RefundExpenseProjection {

    Long getId();

    String getMaPhieu();

    Long getPhieuTraHangId();

    String getLoaiPhieu();

    BigDecimal getSoTien();

    String getPhuongThucThanhToan();

    String getTenNguoiNopNhan();

    String getMaChungTuThamChieu();

    LocalDateTime getNgayGhiNhan();

    String getNguonTao();

    String getTrangThai();
  }

  // Read the explicit ERD relationship, independently of voucher/transaction naming.
  @Query(
      value =
          """
          SELECT cash.id AS id,
                 cash.ma_phieu AS maPhieu,
                 cash.phieu_tra_hang_id AS phieuTraHangId,
                 cash.loai_phieu AS loaiPhieu,
                 cash.so_tien AS soTien,
                 cash.phuong_thuc_thanh_toan AS phuongThucThanhToan,
                 cash.ten_nguoi_nop_nhan AS tenNguoiNopNhan,
                 cash.ma_chung_tu_tham_chieu AS maChungTuThamChieu,
                 cash.ngay_ghi_nhan AS ngayGhiNhan,
                 cash.nguon_tao AS nguonTao,
                 cash.trang_thai AS trangThai
          FROM so_quy_thu_chi cash
          WHERE cash.phieu_tra_hang_id = :returnId
            AND cash.loai_phieu = 'CHI'
          """,
      nativeQuery = true)
  Optional<RefundExpenseProjection> findRefundExpenseByReturnId(@Param("returnId") Long returnId);
}
