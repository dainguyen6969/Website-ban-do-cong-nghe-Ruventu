package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.WarrantyReadException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** Participates in the caller's write transaction; never writes stock or financial tables. */
@Repository
@RequiredArgsConstructor
public class WarrantyIntakeRepository {
  private final EntityManager entityManager;
  private final JdbcTemplate jdbcTemplate;

  public record Origin(Long lineId, Long orderId) {}

  public Origin origin(Long deviceId, Long lineId) {
    // Scalar lookup only: do not cache an entity snapshot before acquiring the order lock.
    String sql =
        deviceId == null
            ? "SELECT c.id, c.don_hang_id FROM chi_tiet_don_hang c WHERE c.id = ?"
            : "SELECT c.id, c.don_hang_id FROM thiet_bi_bao_hanh t JOIN chi_tiet_don_hang c ON c.id = t.chi_tiet_don_hang_id WHERE t.id = ?";
    List<Origin> found =
        jdbcTemplate.query(
            sql,
            (rs, row) -> new Origin(rs.getLong(1), rs.getLong(2)),
            deviceId == null ? lineId : deviceId);
    if (found.isEmpty())
      throw WarrantyReadException.notFound(
          deviceId == null
              ? ErrorCode.WARRANTY_PURCHASE_LINE_NOT_FOUND
              : ErrorCode.WARRANTY_DEVICE_NOT_FOUND,
          deviceId == null ? "chi_tiet_don_hang_id" : "thiet_bi_id",
          "NOT_FOUND");
    return found.getFirst();
  }

  public DonHang lockOrder(Long id) {
    return lock(DonHang.class, id);
  }

  public LocalDateTime deliveryRecordedAt(Long orderId) {
    return entityManager
        .createQuery(
            "SELECT MIN(h.ngayThucHien) FROM LichSuXuLyDonHang h WHERE h.donHang.id = :id AND h.hanhDong = 'GIAO_VAN_GIAO_THANH_CONG'",
            LocalDateTime.class)
        .setParameter("id", orderId)
        .getSingleResult();
  }

  public ChiTietDonHang lockLine(Long id) {
    return lock(ChiTietDonHang.class, id);
  }

  public ThietBiBaoHanh lockDevice(Long id) {
    return lock(ThietBiBaoHanh.class, id);
  }

  public SoSerialSanPham lockSerial(Long id) {
    return lock(SoSerialSanPham.class, id);
  }

  public LichSuBaoHanh lockIntake(Long id) {
    LichSuBaoHanh root =
        entityManager.find(LichSuBaoHanh.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (root == null
        || root.getPhieuBaoHanh() != null
        || !"YEU_CAU_TIEP_NHAN".equals(root.getLoaiSuKien()))
      throw WarrantyReadException.notFound(
          ErrorCode.INTAKE_REQUEST_NOT_FOUND, "yeu_cau_tiep_nhan_id", "NOT_FOUND");
    return root;
  }

  private <T> T lock(Class<T> type, Long id) {
    T value = entityManager.find(type, id, LockModeType.PESSIMISTIC_WRITE);
    if (value == null) throw new AppException(ErrorCode.WARRANTY_ORIGIN_UNVERIFIED);
    entityManager.refresh(value, LockModeType.PESSIMISTIC_WRITE);
    return value;
  }

  public ThietBiBaoHanh createDevice(ChiTietDonHang line, String identification) {
    ThietBiBaoHanh device =
        ThietBiBaoHanh.builder()
            .maTheoDoi("TB-TMP-" + UUID.randomUUID())
            .chiTietDonHang(line)
            .phienBan(line.getPhienBan())
            .dauHieuNhanDang(identification)
            .build();
    // Missing historical expiry/activation stays unknown; current product policy is not evidence.
    entityManager.persist(device);
    entityManager.flush();
    device.setMaTheoDoi(String.format(Locale.ROOT, "TB%06d", device.getId()));
    entityManager.flush();
    return device;
  }

  public PhieuBaoHanh createTicket(
      ThietBiBaoHanh device,
      Long actorId,
      String reason,
      String condition,
      String contact,
      String phone,
      LocalDateTime receivedAt,
      String provider,
      String note) {
    entityManager.flush();
    GeneratedKeyHolder key = new GeneratedKeyHolder();
    // Entity @CreationTimestamp would replace the actual receipt time with server time.
    // Explicit insert preserves that time without changing the shared Entity mapping.
    jdbcTemplate.update(
        connection -> {
          var statement =
              connection.prepareStatement(
                  """
          INSERT INTO phieu_bao_hanh
          (ma_phieu, don_hang_id, khach_hang_id, so_serial_id, nhan_vien_id,
           ly_do_bao_hanh, tinh_trang_tiep_nhan, don_vi_bao_hanh, trang_thai_xu_ly,
           ghi_chu, ngay_tiep_nhan, ngay_cap_nhat, thiet_bi_id, ket_qua_xu_ly,
           phien_ban_bao_gia, ten_nguoi_lien_he, sdt_nguoi_lien_he)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'TIEP_NHAN', ?, ?, CURRENT_TIMESTAMP,
                  ?, 'CHUA_CO_KET_QUA', 1, ?, ?)
          """,
                  Statement.RETURN_GENERATED_KEYS);
          DonHang order = device.getChiTietDonHang().getDonHang();
          statement.setString(1, "BH-TMP-" + UUID.randomUUID());
          statement.setLong(2, order.getId());
          statement.setObject(
              3, order.getKhachHang() == null ? null : order.getKhachHang().getId());
          statement.setObject(
              4, device.getSoSerial() == null ? null : device.getSoSerial().getId());
          statement.setLong(5, actorId);
          statement.setString(6, reason);
          statement.setString(7, condition);
          statement.setString(8, provider);
          statement.setString(9, note);
          statement.setTimestamp(10, Timestamp.valueOf(receivedAt));
          statement.setLong(11, device.getId());
          statement.setString(12, contact);
          statement.setString(13, phone);
          return statement;
        },
        key);
    Number generated = key.getKey();
    if (generated == null) throw new AppException(ErrorCode.WARRANTY_CREATE_FAILED);
    Long id = generated.longValue();
    jdbcTemplate.update(
        "UPDATE phieu_bao_hanh SET ma_phieu = ? WHERE id = ?",
        String.format(Locale.ROOT, "BH-%06d", id),
        id);
    return entityManager.find(PhieuBaoHanh.class, id);
  }

  public void recordHistory(PhieuBaoHanh ticket, Long actorId, String json) {
    entityManager.persist(
        LichSuBaoHanh.builder()
            .phieuBaoHanh(ticket)
            .nguoiThucHien(entityManager.getReference(NguoiDung.class, actorId))
            .loaiSuKien("TIEP_NHAN")
            .noiDung("Thực tiếp nhận thiết bị bảo hành")
            .duLieuChiTiet(json)
            .build());
    entityManager.flush();
  }
}
