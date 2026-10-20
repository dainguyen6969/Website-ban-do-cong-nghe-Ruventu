package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WarrantyDetailRepository {
  private final EntityManager entityManager;

  public Optional<PhieuBaoHanh> findTicket(Long id) {
    return entityManager
        .createQuery(
            """
        SELECT warranty FROM PhieuBaoHanh warranty
        JOIN FETCH warranty.donHang orders
        JOIN FETCH warranty.thietBi device
        JOIN FETCH device.chiTietDonHang orderLine
        JOIN FETCH device.phienBan variant
        JOIN FETCH variant.sanPham product
        LEFT JOIN FETCH device.soSerial serial
        LEFT JOIN FETCH warranty.soSerial ticketSerial
        LEFT JOIN FETCH warranty.khachHang customer
        LEFT JOIN FETCH warranty.thietBiThayThe replacement
        WHERE warranty.id = :id
        """,
            PhieuBaoHanh.class)
        .setParameter("id", id)
        .getResultList()
        .stream()
        .findFirst();
  }

  public List<ChiTietPhiBaoHanh> findFees(Long id) {
    return entityManager
        .createQuery(
            """
        SELECT fee FROM ChiTietPhiBaoHanh fee
        WHERE fee.phieuBaoHanh.id = :id
        ORDER BY fee.phienBanBaoGia ASC, fee.id ASC
        """,
            ChiTietPhiBaoHanh.class)
        .setParameter("id", id)
        .getResultList();
  }

  public List<HoaDonBaoHanh> findInvoices(Long id) {
    return entityManager
        .createQuery(
            """
        SELECT invoice FROM HoaDonBaoHanh invoice
        WHERE invoice.phieuBaoHanh.id = :id
        ORDER BY invoice.id ASC
        """,
            HoaDonBaoHanh.class)
        .setParameter("id", id)
        .getResultList();
  }

  public List<SoQuyThuChi> findPostedMoney(Long id) {
    // Both links may point to the same ticket; OR selects each voucher once, without a history
    // join.
    return entityManager
        .createQuery(
            """
        SELECT cash FROM SoQuyThuChi cash
        LEFT JOIN FETCH cash.hoaDonBaoHanh invoice
        LEFT JOIN FETCH cash.phieuBaoHanh warranty
        LEFT JOIN invoice.phieuBaoHanh invoiceWarranty
        WHERE cash.trangThai = :posted
          AND (warranty.id = :id OR invoiceWarranty.id = :id)
        ORDER BY cash.ngayGhiNhan ASC, cash.id ASC
        """,
            SoQuyThuChi.class)
        .setParameter("id", id)
        .setParameter("posted", TrangThaiPhieuThuChi.DA_GHI_NHAN)
        .getResultList();
  }
}
