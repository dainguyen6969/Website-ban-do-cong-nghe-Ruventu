package com.example.dantruventu.Repository.order;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface AdminReturnOrderRepository extends Repository<DonHang, Long> {

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
                ), 0)
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
                ), 0)
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
      Pageable pageable);
}
