package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WarrantyReplacementItemsRepository {
  private final EntityManager em;

  @Value("${ruventu.inventory.default-warehouse-id:1}")
  private Long warehouseId;

  public TonKho stockForVariant(Long variantId) {
    var warehouse = em.find(KhoHang.class, warehouseId, LockModeType.PESSIMISTIC_READ);
    if (warehouse == null
        || warehouse.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || em.createQuery("SELECT COUNT(w) FROM KhoHang w", Long.class).getSingleResult() != 1)
      throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    var rows =
        em.createQuery(
                "SELECT t FROM TonKho t WHERE t.khoHang.id=:warehouse AND t.phienBan.id=:variant ORDER BY t.id",
                TonKho.class)
            .setParameter("warehouse", warehouseId)
            .setParameter("variant", variantId)
            .setLockMode(LockModeType.PESSIMISTIC_WRITE)
            .getResultList();
    if (rows.size() != 1) throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    em.refresh(rows.getFirst(), LockModeType.PESSIMISTIC_WRITE);
    return rows.getFirst();
  }

  public SoSerialSanPham selectedSerial(Long id) {
    var serial = em.find(SoSerialSanPham.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (serial == null)
      throw WarrantyReadException.notFound(ErrorCode.NOT_FOUND, "so_serial_id", "SERIAL_NOT_FOUND");
    em.refresh(serial, LockModeType.PESSIMISTIC_WRITE);
    return serial;
  }

  public PhienBanSanPham receivedVariant(Long id) {
    var variant = em.find(PhienBanSanPham.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (variant == null)
      throw WarrantyReadException.notFound(
          ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
          "phien_ban_thuc_nhan_id",
          "PRODUCT_VARIANT_NOT_FOUND");
    em.refresh(variant, LockModeType.PESSIMISTIC_WRITE);
    if (variant.getCoQuanLySerial() == null)
      throw new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
    return variant;
  }

  public void supplier(Long id) {
    supplier(id, true);
  }

  public void supplierForReturn(Long id) {
    supplier(id, false);
  }

  private void supplier(Long id, boolean requireActive) {
    var supplier = em.find(NhaCungCap.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (supplier == null)
      throw WarrantyReadException.notFound(
          ErrorCode.NOT_FOUND, "nha_cung_cap_id", "SUPPLIER_NOT_FOUND");
    em.refresh(supplier, LockModeType.PESSIMISTIC_WRITE);
    if (requireActive && supplier.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG)
      throw new AppException(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_CONFLICT);
  }

  public boolean serialExists(String serial) {
    return em.createQuery(
                "SELECT COUNT(s) FROM SoSerialSanPham s WHERE LOWER(TRIM(s.soSerial))=LOWER(:serial)",
                Long.class)
            .setParameter("serial", serial)
            .getSingleResult()
        > 0;
  }

  public boolean serialHasPendingDevice(Long serial) {
    return em.createQuery(
                "SELECT COUNT(w) FROM PhieuBaoHanh w WHERE w.thietBiThayThe.soSerial.id=:id",
                Long.class)
            .setParameter("id", serial)
            .getSingleResult()
        > 0;
  }

  public SoSerialSanPham createSerial(PhienBanSanPham variant, String code) {
    var serial =
        SoSerialSanPham.builder()
            .phienBan(variant)
            .soSerial(code)
            .trangThai(TrangThaiSerial.GIU_CHO_BAO_HANH)
            .build();
    em.persist(serial);
    em.flush();
    return serial;
  }

  public ThietBiBaoHanh createDevice(
      PhieuBaoHanh ticket, PhienBanSanPham variant, SoSerialSanPham serial, String identification) {
    var device =
        ThietBiBaoHanh.builder()
            .maTheoDoi("TB-" + UUID.randomUUID())
            .chiTietDonHang(ticket.getThietBi().getChiTietDonHang())
            .phienBan(variant)
            .soSerial(serial)
            .dauHieuNhanDang(identification)
            .build();
    em.persist(device);
    em.flush();
    device.setMaTheoDoi("TB%06d".formatted(device.getId()));
    return device;
  }

  public TheKho ledger(
      PhieuBaoHanh ticket, TonKho stock, LoaiGiaoDichKho type, int delta, LocalDateTime at) {
    var card =
        TheKho.builder()
            .khoHang(stock.getKhoHang())
            .phienBan(stock.getPhienBan())
            .loaiGiaoDich(type)
            .maChungTuGoc(ticket.getId())
            .phieuBaoHanh(ticket)
            .soLuongThayDoi(delta)
            .tonCuoi(stock.getTonThucTe())
            .ghiChu(
                type == LoaiGiaoDichKho.XUAT_DOI_BAO_HANH
                    ? "Xuất hàng đổi bảo hành"
                    : "Hoàn xuất hàng đổi bảo hành")
            .ngayTao(at)
            .build();
    em.persist(card);
    em.flush();
    return card;
  }

  public void flush() {
    em.flush();
  }
}
