package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface AdminReturnOrderRepository extends Repository<DonHang, Long> {

  @Query(
      """
      SELECT COUNT(warranty)
      FROM PhieuBaoHanh warranty
      WHERE warranty.donHang.id = :orderId
        AND warranty.trangThaiXuLy <> :completedWarrantyStatus
      """)
  long countOpenWarranties(
      @Param("orderId") Long orderId,
      @Param("completedWarrantyStatus") TrangThaiBaoHanh completedWarrantyStatus);

  @Query(
      """
      SELECT COUNT(warranty)
      FROM PhieuBaoHanh warranty
      WHERE warranty.thietBi.chiTietDonHang.id IN :orderLineIds
        AND warranty.trangThaiXuLy <> :completedWarrantyStatus
      """)
  long countOpenWarrantiesForOrderLines(
      @Param("orderLineIds") Collection<Long> orderLineIds,
      @Param("completedWarrantyStatus") TrangThaiBaoHanh completedWarrantyStatus);

  @Query(
      """
      SELECT DISTINCT device.chiTietDonHang.id
      FROM ThietBiBaoHanh device, PhieuBaoHanh warranty
      WHERE device.chiTietDonHang.id IN :orderLineIds
        AND warranty.trangThaiXuLy <> :completedWarrantyStatus
        AND (
          warranty.thietBi = device
          OR (warranty.thietBi IS NULL AND warranty.soSerial = device.soSerial)
        )
      """)
  List<Long> findOrderLineIdsWithOpenWarranties(
      @Param("orderLineIds") Collection<Long> orderLineIds,
      @Param("completedWarrantyStatus") TrangThaiBaoHanh completedWarrantyStatus);

  @Query(
      """
      SELECT DISTINCT warranty.soSerial.phienBan.id
      FROM PhieuBaoHanh warranty
      WHERE warranty.donHang.id = :orderId
        AND warranty.thietBi IS NULL
        AND warranty.soSerial IS NOT NULL
        AND warranty.trangThaiXuLy <> :completedWarrantyStatus
      """)
  List<Long> findOpenLegacyWarrantyVariantIds(
      @Param("orderId") Long orderId,
      @Param("completedWarrantyStatus") TrangThaiBaoHanh completedWarrantyStatus);

  @Query(
      value =
          """
          SELECT d
          FROM DonHang d
          LEFT JOIN FETCH d.khachHang kh
          WHERE d.trangThaiDonHang = :orderStatus
            AND d.trangThaiThanhToan = :paymentStatus
            AND d.trangThaiXuatKho = :exportStatus
            AND EXISTS (
              SELECT ct.id
              FROM ChiTietDonHang ct
              WHERE ct.donHang = d
                AND ct.soLuong > COALESCE((
                  SELECT SUM(ctt.soLuong)
                  FROM ChiTietTraHang ctt
                  WHERE ctt.chiTietDonHang = ct
                    AND ctt.phieuTraHang.trangThaiTraHang NOT IN :releasedReturnStatuses
                ), 0)
            )
            AND NOT EXISTS (
              SELECT warranty.id
              FROM PhieuBaoHanh warranty
              WHERE warranty.donHang = d
                AND warranty.trangThaiXuLy <> :completedWarrantyStatus
            )
            AND (
              :keyword IS NULL
              OR LOWER(d.maDonHang) LIKE CONCAT('%', :keyword, '%')
              OR LOWER(COALESCE(kh.hoTen, '')) LIKE CONCAT('%', :keyword, '%')
              OR LOWER(COALESCE(kh.soDienThoai, '')) LIKE CONCAT('%', :keyword, '%')
              OR LOWER(COALESCE(d.tenNguoiNhan, '')) LIKE CONCAT('%', :keyword, '%')
              OR LOWER(COALESCE(d.sdtNguoiNhan, '')) LIKE CONCAT('%', :keyword, '%')
            )
          """,
      countQuery =
          """
          SELECT COUNT(d)
          FROM DonHang d
          LEFT JOIN d.khachHang kh
          WHERE d.trangThaiDonHang = :orderStatus
            AND d.trangThaiThanhToan = :paymentStatus
            AND d.trangThaiXuatKho = :exportStatus
            AND EXISTS (
              SELECT ct.id
              FROM ChiTietDonHang ct
              WHERE ct.donHang = d
                AND ct.soLuong > COALESCE((
                  SELECT SUM(ctt.soLuong)
                  FROM ChiTietTraHang ctt
                  WHERE ctt.chiTietDonHang = ct
                    AND ctt.phieuTraHang.trangThaiTraHang NOT IN :releasedReturnStatuses
                ), 0)
            )
            AND NOT EXISTS (
              SELECT warranty.id
              FROM PhieuBaoHanh warranty
              WHERE warranty.donHang = d
                AND warranty.trangThaiXuLy <> :completedWarrantyStatus
            )
            AND (
              :keyword IS NULL
              OR LOWER(d.maDonHang) LIKE CONCAT('%', :keyword, '%')
              OR LOWER(COALESCE(kh.hoTen, '')) LIKE CONCAT('%', :keyword, '%')
              OR LOWER(COALESCE(kh.soDienThoai, '')) LIKE CONCAT('%', :keyword, '%')
              OR LOWER(COALESCE(d.tenNguoiNhan, '')) LIKE CONCAT('%', :keyword, '%')
              OR LOWER(COALESCE(d.sdtNguoiNhan, '')) LIKE CONCAT('%', :keyword, '%')
            )
          """)
  Page<DonHang> findEligibleOrders(
      @Param("keyword") String keyword,
      @Param("orderStatus") TrangThaiDonHang orderStatus,
      @Param("paymentStatus") TrangThaiThanhToanDonHang paymentStatus,
      @Param("exportStatus") TrangThaiXuatKho exportStatus,
      @Param("releasedReturnStatuses") Collection<TrangThaiTraHang> releasedReturnStatuses,
      @Param("completedWarrantyStatus") TrangThaiBaoHanh completedWarrantyStatus,
      Pageable pageable);
}
