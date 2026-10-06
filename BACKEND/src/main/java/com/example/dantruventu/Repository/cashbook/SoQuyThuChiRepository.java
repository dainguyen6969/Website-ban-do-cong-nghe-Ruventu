package com.example.dantruventu.Repository.cashbook;

import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SoQuyThuChiRepository
    extends JpaRepository<SoQuyThuChi, Long>, JpaSpecificationExecutor<SoQuyThuChi> {

  Optional<SoQuyThuChi> findByMaPhieu(String maPhieu);

  boolean existsByMaPhieuIgnoreCase(String maPhieu);

  boolean existsByLoaiPhieuAndNguonTaoAndMaChungTuThamChieuAndSoTien(
      LoaiPhieuThuChi loaiPhieu,
      NguonTaoPhieuThuChi nguonTao,
      String maChungTuThamChieu,
      BigDecimal soTien);

  boolean existsByNhomNguoiNopNhanAndTenNguoiNopNhanIgnoreCase(
      NhomNguoiNopNhanEnum nhomNguoiNopNhan, String tenNguoiNopNhan);

  @Query(
      """
      SELECT COALESCE(SUM(s.soTien), 0)
      FROM SoQuyThuChi s
      LEFT JOIN s.nguoiTao creator
      WHERE s.trangThai = :confirmedStatus
        AND s.ngayGhiNhan IS NOT NULL
        AND s.loaiPhieu = :amountType
        AND (:filterType IS NULL OR s.loaiPhieu = :filterType)
        AND (:keywordPattern IS NULL
             OR LOWER(s.maPhieu) LIKE :keywordPattern ESCAPE '!'
             OR LOWER(s.tenNguoiNopNhan) LIKE :keywordPattern ESCAPE '!'
             OR LOWER(s.maChungTuThamChieu) LIKE :keywordPattern ESCAPE '!')
        AND (:paymentMethod IS NULL OR s.phuongThucThanhToan = :paymentMethod)
        AND (:payerGroup IS NULL OR s.nhomNguoiNopNhan = :payerGroup)
        AND (:payerNamePattern IS NULL
             OR LOWER(s.tenNguoiNopNhan) LIKE :payerNamePattern ESCAPE '!')
        AND (:creatorId IS NULL OR creator.id = :creatorId)
        AND (:startInclusive IS NULL OR s.ngayGhiNhan >= :startInclusive)
        AND (:endExclusive IS NULL OR s.ngayGhiNhan < :endExclusive)
      """)
  BigDecimal sumCashbookAmount(
      @Param("amountType") LoaiPhieuThuChi amountType,
      @Param("filterType") LoaiPhieuThuChi filterType,
      @Param("confirmedStatus") TrangThaiPhieuThuChi confirmedStatus,
      @Param("keywordPattern") String keywordPattern,
      @Param("paymentMethod") String paymentMethod,
      @Param("payerGroup") NhomNguoiNopNhanEnum payerGroup,
      @Param("payerNamePattern") String payerNamePattern,
      @Param("creatorId") Long creatorId,
      @Param("startInclusive") LocalDateTime startInclusive,
      @Param("endExclusive") LocalDateTime endExclusive);

  @EntityGraph(attributePaths = {"loaiThuChi", "nguoiTao"})
  Optional<SoQuyThuChi> findByIdAndLoaiPhieu(Long id, LoaiPhieuThuChi loaiPhieu);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      SELECT s
      FROM SoQuyThuChi s
      WHERE s.id = :id
        AND s.loaiPhieu = :loaiPhieu
      """)
  Optional<SoQuyThuChi> findByIdAndLoaiPhieuForUpdate(
      @Param("id") Long id, @Param("loaiPhieu") LoaiPhieuThuChi loaiPhieu);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      """
      UPDATE SoQuyThuChi s
      SET s.trangThai = :trangThai,
          s.updatedAt = :updatedAt
      WHERE s.id = :id
      """)
  int updateCancellationStatus(
      @Param("id") Long id,
      @Param("trangThai") TrangThaiPhieuThuChi trangThai,
      @Param("updatedAt") LocalDateTime updatedAt);

  @Override
  @EntityGraph(attributePaths = {"loaiThuChi", "nguoiTao"})
  Page<SoQuyThuChi> findAll(
      org.springframework.data.jpa.domain.Specification<SoQuyThuChi> specification,
      Pageable pageable);

  @Override
  @EntityGraph(attributePaths = {"nguoiTao"})
  List<SoQuyThuChi> findAll(
      org.springframework.data.jpa.domain.Specification<SoQuyThuChi> specification, Sort sort);

  @Query(
      """
            SELECT COALESCE(SUM(s.soTien), 0)
            FROM SoQuyThuChi s
            WHERE s.maChungTuThamChieu = :maDonNhap
              AND s.loaiPhieu = :loaiPhieu
              AND s.trangThai = :trangThai
            """)
  BigDecimal sumByPurchaseOrder(
      @Param("maDonNhap") String maDonNhap,
      @Param("loaiPhieu") LoaiPhieuThuChi loaiPhieu,
      @Param("trangThai") TrangThaiPhieuThuChi trangThai);

  List<SoQuyThuChi> findByMaChungTuThamChieu(String maChungTuThamChieu);
}
