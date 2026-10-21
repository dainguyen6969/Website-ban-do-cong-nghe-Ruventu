package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiSerial;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SoSerialSanPhamRepository
    extends JpaRepository<SoSerialSanPham, Long>, JpaSpecificationExecutor<SoSerialSanPham> {

  @Override
  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham", "donHang"})
  Page<SoSerialSanPham> findAll(Specification<SoSerialSanPham> specification, Pageable pageable);

  @Override
  @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham", "donHang"})
  Optional<SoSerialSanPham> findById(Long id);

  @Query(
      """
            SELECT s.phienBan.id
            FROM SoSerialSanPham s
            WHERE s.id = :id
            """)
  Optional<Long> findPhienBanIdBySerialId(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM SoSerialSanPham s WHERE s.id = :id")
  Optional<SoSerialSanPham> findByIdForUpdate(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      SELECT s
      FROM SoSerialSanPham s
      WHERE s.id IN :ids
      ORDER BY s.id
      """)
  List<SoSerialSanPham> findAllByIdsForUpdate(@Param("ids") Collection<Long> ids);

  Optional<SoSerialSanPham> findBySoSerial(String soSerial);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      SELECT s
      FROM SoSerialSanPham s
      LEFT JOIN FETCH s.donHang d
      LEFT JOIN FETCH d.khachHang
      WHERE s.soSerial = :soSerial
      """)
  Optional<SoSerialSanPham> findBySoSerialForUpdate(@Param("soSerial") String soSerial);

  boolean existsBySoSerial(String soSerial);

  boolean existsBySoSerialIn(Collection<String> soSerials);

  long countByPhienBanId(Long phienBanId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
    SELECT s
    FROM SoSerialSanPham s
    WHERE s.donHang.id = :orderId
    ORDER BY s.id
    """)
  List<SoSerialSanPham> findByOrderForUpdate(@Param("orderId") Long orderId);

  List<SoSerialSanPham> findByDonHang_IdOrderByIdAsc(Long donHangId);

  @Query(
      """
            SELECT s
            FROM SoSerialSanPham s
            JOIN FETCH s.chiTietDongGoi c
            JOIN FETCH c.donHang d
            WHERE d.id = :orderId
            ORDER BY s.id
            """)
  List<SoSerialSanPham> findPackingByOrderId(@Param("orderId") Long orderId);
    
  /** Legacy fallback must not bring back a returned device or an old warranty serial. */
  @Query(
      """
      SELECT serial
      FROM SoSerialSanPham serial
      JOIN FETCH serial.phienBan variant
      JOIN FETCH variant.sanPham
      WHERE serial.donHang.id = :orderId
        AND serial.trangThai = :soldStatus
        AND NOT EXISTS (
          SELECT device.id
          FROM ThietBiBaoHanh device
          WHERE device.soSerial = serial
        )
        AND NOT EXISTS (
          SELECT warranty.id
          FROM PhieuBaoHanh warranty
          WHERE warranty.soSerial = serial
            AND warranty.thietBiThayThe IS NOT NULL
            AND warranty.trangThaiXuLy = :completedStatus
        )
      ORDER BY serial.id
      """)
  List<SoSerialSanPham> findCurrentLegacyReturnSerials(
      @Param("orderId") Long orderId,
      @Param("soldStatus") TrangThaiSerial soldStatus,
      @Param("completedStatus") TrangThaiBaoHanh completedStatus);
}
