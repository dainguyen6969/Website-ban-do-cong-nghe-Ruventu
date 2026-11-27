package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ThietBiBaoHanhRepository extends JpaRepository<ThietBiBaoHanh, Long> {

  @Query(
      """
      SELECT device
      FROM ThietBiBaoHanh device
      JOIN FETCH device.chiTietDonHang orderLine
      JOIN FETCH device.phienBan variant
      JOIN FETCH variant.sanPham
      LEFT JOIN FETCH device.soSerial
      WHERE orderLine.id IN :orderLineIds
        AND device.chiTietTraHang IS NULL
        AND NOT EXISTS (
          SELECT warranty.id
          FROM PhieuBaoHanh warranty
          WHERE warranty.thietBi = device
            AND warranty.thietBiThayThe IS NOT NULL
            AND warranty.trangThaiXuLy = :completedStatus
        )
      ORDER BY orderLine.id, device.id
      """)
  List<ThietBiBaoHanh> findCurrentDevices(
      @Param("orderLineIds") Collection<Long> orderLineIds,
      @Param("completedStatus") TrangThaiBaoHanh completedStatus);

  interface RecordedPhysicalIdentity {
    Long getThietBiId();

    Long getChiTietDonHangId();

    String getMaDonViVatLy();
  }

  interface CompletedReplacement {
    Long getPreviousDeviceId();

    Long getReplacementDeviceId();
  }

  @Query(
      value =
          """
          SELECT COUNT(*)
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
            AND table_name = 'lich_su_bao_hanh'
          """,
      nativeQuery = true)
  long countWarrantyHistoryTables();

  /** BH04 I98 stores the physical unit key in history JSON, not a device column. */
  @Query(
      value =
          """
          SELECT device.id AS thietBiId,
                 device.chi_tiet_don_hang_id AS chiTietDonHangId,
                 JSON_UNQUOTE(JSON_EXTRACT(history.du_lieu_chi_tiet,
                     '$.ma_don_vi_vat_ly')) AS maDonViVatLy
          FROM lich_su_bao_hanh history
          JOIN phieu_bao_hanh warranty ON warranty.id = history.phieu_bao_hanh_id
          JOIN thiet_bi_bao_hanh device ON device.id = warranty.thiet_bi_id
          WHERE device.chi_tiet_don_hang_id IN (:orderLineIds)
            AND JSON_TYPE(JSON_EXTRACT(history.du_lieu_chi_tiet,
                '$.ma_don_vi_vat_ly')) = 'STRING'
          ORDER BY history.ngay_tao, history.id
          """,
      nativeQuery = true)
  List<RecordedPhysicalIdentity> findRecordedPhysicalIdentities(
      @Param("orderLineIds") Collection<Long> orderLineIds);

  @Query(
      """
      SELECT warranty.thietBi.id AS previousDeviceId,
             warranty.thietBiThayThe.id AS replacementDeviceId
      FROM PhieuBaoHanh warranty
      WHERE warranty.thietBi.chiTietDonHang.id IN :orderLineIds
        AND warranty.thietBiThayThe IS NOT NULL
        AND warranty.thietBiThayThe.chiTietDonHang = warranty.thietBi.chiTietDonHang
        AND warranty.trangThaiXuLy = :completedStatus
      """)
  List<CompletedReplacement> findCompletedReplacements(
      @Param("orderLineIds") Collection<Long> orderLineIds,
      @Param("completedStatus") TrangThaiBaoHanh completedStatus);
}
