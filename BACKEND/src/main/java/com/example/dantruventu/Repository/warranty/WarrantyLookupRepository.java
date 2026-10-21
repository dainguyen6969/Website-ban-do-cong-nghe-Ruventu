package com.example.dantruventu.Repository.warranty;

import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhieuBaoHanh;
import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WarrantyLookupRepository {
  private final EntityManager entityManager;

  // Only persisted HANDOVER evidence commits a replacement edge. Pending proposals do not
  // create another purchase right, and a replacement serial need not link directly to the order.
  private static final String SOURCES =
      """
      WITH RECURSIVE handover_data AS (
        SELECT h.phieu_bao_hanh_id, h.du_lieu_chi_tiet,
          COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet, '$.giao_nhan')), 'null'),
                   NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet, '$.ban_giao')), 'null'), h.du_lieu_chi_tiet) AS handover_json
        FROM lich_su_bao_hanh h WHERE h.loai_su_kien = 'HANDOVER'
      ), completed_edges AS (
        SELECT w.thiet_bi_id AS old_id, w.thiet_bi_thay_the_id AS new_id,
               old_device.chi_tiet_don_hang_id AS line_id
        FROM phieu_bao_hanh w
        JOIN thiet_bi_bao_hanh old_device ON old_device.id = w.thiet_bi_id
        JOIN thiet_bi_bao_hanh new_device ON new_device.id = w.thiet_bi_thay_the_id
        WHERE w.trang_thai_xu_ly = 'HOAN_TAT' AND w.ket_qua_xu_ly = 'DOI_SAN_PHAM'
          AND old_device.chi_tiet_don_hang_id = new_device.chi_tiet_don_hang_id
          AND EXISTS (
            SELECT 1 FROM handover_data h
            WHERE h.phieu_bao_hanh_id = w.id
              AND (
                ((JSON_UNQUOTE(JSON_EXTRACT(h.handover_json, '$.thiet_bi_id'))
                    = CAST(w.thiet_bi_thay_the_id AS CHAR)
                  OR JSON_UNQUOTE(JSON_EXTRACT(h.handover_json, '$.thiet_bi_thay_the_id'))
                    = CAST(w.thiet_bi_thay_the_id AS CHAR))
                  AND (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.handover_json, '$.thiet_bi_cu_id')), 'null') IS NULL
                    OR JSON_UNQUOTE(JSON_EXTRACT(h.handover_json, '$.thiet_bi_cu_id'))
                      = CAST(w.thiet_bi_id AS CHAR)))
                OR (JSON_TYPE(JSON_EXTRACT(h.du_lieu_chi_tiet, '$.phuong_an_doi.da_ban_giao')) = 'BOOLEAN'
                  AND JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet, '$.phuong_an_doi.da_ban_giao')) = 'true'
                  AND JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,
                       '$.phuong_an_doi.thiet_bi_cu_id')) = CAST(w.thiet_bi_id AS CHAR)
                  AND JSON_UNQUOTE(JSON_EXTRACT(h.du_lieu_chi_tiet,
                       '$.phuong_an_doi.thiet_bi_thay_the_id')) = CAST(w.thiet_bi_thay_the_id AS CHAR))
              )
          )
      ), device_roots AS (
        SELECT t.id, t.id AS root_id, t.chi_tiet_don_hang_id AS line_id
        FROM thiet_bi_bao_hanh t
        WHERE NOT EXISTS (SELECT 1 FROM phieu_bao_hanh proposal
                          WHERE proposal.thiet_bi_thay_the_id = t.id)
      ), device_lineage AS (
        SELECT id, root_id, line_id FROM device_roots
        UNION DISTINCT
        SELECT edge.new_id, lineage.root_id, lineage.line_id
        FROM device_lineage lineage
        JOIN completed_edges edge ON edge.old_id = lineage.id AND edge.line_id = lineage.line_id
      ), line_rights AS (
        SELECT line.id,
          (SELECT COUNT(*) FROM device_roots root WHERE root.line_id = line.id) AS tracked_roots,
          (SELECT COALESCE(SUM(r.so_luong), 0) FROM chi_tiet_tra_hang r
            JOIN phieu_tra_hang form ON form.id = r.phieu_tra_hang_id
            WHERE r.chi_tiet_don_hang_id = line.id
              AND form.trang_thai_tra_hang IN ('DA_NHAN_HANG','DA_HOAN_TIEN','HOAN_TAT')) AS returned,
          (SELECT COUNT(DISTINCT chain.root_id) FROM device_lineage chain
            JOIN thiet_bi_bao_hanh returned_device ON returned_device.id = chain.id
            JOIN chi_tiet_tra_hang returned_line ON returned_line.id = returned_device.chi_tiet_tra_hang_id
            JOIN phieu_tra_hang returned_form ON returned_form.id = returned_line.phieu_tra_hang_id
            WHERE chain.line_id = line.id
              AND returned_form.trang_thai_tra_hang IN ('DA_NHAN_HANG','DA_HOAN_TIEN','HOAN_TAT')) AS tracked_returned,
          (SELECT COUNT(*) FROM so_serial_san_pham serial
            WHERE serial.don_hang_id = line.don_hang_id AND serial.phien_ban_id = line.phien_ban_id
              AND NOT EXISTS (SELECT 1 FROM thiet_bi_bao_hanh tracked WHERE tracked.so_serial_id = serial.id)
              AND EXISTS (SELECT 1 FROM phien_ban_san_pham sv JOIN san_pham sp ON sp.id = sv.san_pham_id
                          WHERE sv.id = line.phien_ban_id AND sp.loai_san_pham = 'DON')
              AND (SELECT COUNT(*) FROM chi_tiet_don_hang same_variant
                   WHERE same_variant.don_hang_id = line.don_hang_id
                     AND same_variant.phien_ban_id = line.phien_ban_id) = 1) AS untracked_serials
        FROM chi_tiet_don_hang line
      ), candidate_sources AS (
        SELECT 'DEVICE' AS kind, device.id AS device_id, line.id AS line_id,
               serial.id AS serial_id, orders.id AS order_id, device.phien_ban_id AS variant_id,
               1 AS matching_lines, orders.ma_don_hang, device.ma_theo_doi, serial.so_serial,
               orders.sdt_nguoi_nhan AS order_phone, customer.so_dien_thoai AS customer_phone
        FROM thiet_bi_bao_hanh device
        JOIN chi_tiet_don_hang line ON line.id = device.chi_tiet_don_hang_id
        JOIN don_hang orders ON orders.id = line.don_hang_id
        LEFT JOIN nguoi_dung customer ON customer.id = orders.khach_hang_id
        LEFT JOIN so_serial_san_pham serial ON serial.id = device.so_serial_id
        UNION ALL
        SELECT 'SERIAL', NULL,
               CASE WHEN COUNT(line.id) = 1 THEN MIN(line.id) ELSE NULL END,
               serial.id, orders.id, serial.phien_ban_id, COUNT(line.id),
               orders.ma_don_hang, NULL, serial.so_serial, orders.sdt_nguoi_nhan, customer.so_dien_thoai
        FROM so_serial_san_pham serial
        LEFT JOIN don_hang orders ON orders.id = serial.don_hang_id
        LEFT JOIN nguoi_dung customer ON customer.id = orders.khach_hang_id
        LEFT JOIN chi_tiet_don_hang line ON line.don_hang_id = orders.id
          AND line.phien_ban_id = serial.phien_ban_id
          AND EXISTS (SELECT 1 FROM phien_ban_san_pham sv JOIN san_pham sp ON sp.id = sv.san_pham_id
                      WHERE sv.id = line.phien_ban_id AND sp.loai_san_pham = 'DON')
        WHERE NOT EXISTS (SELECT 1 FROM thiet_bi_bao_hanh tracked WHERE tracked.so_serial_id = serial.id)
        GROUP BY serial.id, orders.id, serial.phien_ban_id, orders.ma_don_hang,
                 serial.so_serial, orders.sdt_nguoi_nhan, customer.so_dien_thoai
        UNION ALL
        SELECT 'LINE', NULL, line.id, NULL, orders.id, line.phien_ban_id, 1,
               orders.ma_don_hang, NULL, NULL, orders.sdt_nguoi_nhan, customer.so_dien_thoai
        FROM chi_tiet_don_hang line
        JOIN don_hang orders ON orders.id = line.don_hang_id
        JOIN phien_ban_san_pham variant ON variant.id = line.phien_ban_id
        JOIN san_pham product ON product.id = variant.san_pham_id
        JOIN line_rights rights ON rights.id = line.id
        LEFT JOIN nguoi_dung customer ON customer.id = orders.khach_hang_id
        WHERE line.so_luong > rights.tracked_roots + rights.untracked_serials
                             + GREATEST(rights.returned - rights.tracked_returned, 0)
      ), candidates AS (
        SELECT source.* FROM candidate_sources source
      )
      """;

  public record Filter(String serial, String tracking, String orderCode, String phone) {}

  public record Candidate(
      String kind,
      Long deviceId,
      Long lineId,
      Long serialId,
      Long orderId,
      Long variantId,
      long matchingLines) {}

  public Page<Candidate> findCandidates(Filter filter, Pageable pageable) {
    Map<String, Object> parameters = new LinkedHashMap<>();
    String predicate = predicate(filter, parameters);
    Query count =
        entityManager.createNativeQuery(SOURCES + "SELECT COUNT(*) FROM candidates c " + predicate);
    parameters.forEach(count::setParameter);
    long total = number(count.getSingleResult()).longValue();
    if (total == 0) return new PageImpl<>(List.of(), pageable, 0);
    Query query =
        entityManager.createNativeQuery(
            SOURCES
                + """
        SELECT c.kind, c.device_id, c.line_id, c.serial_id, c.order_id, c.variant_id, c.matching_lines
        FROM candidates c
        """
                + predicate
                + " ORDER BY c.order_id DESC, c.line_id DESC, c.kind, c.device_id DESC, c.serial_id DESC");
    parameters.forEach(query::setParameter);
    query.setFirstResult(Math.toIntExact(pageable.getOffset()));
    query.setMaxResults(pageable.getPageSize());
    List<Candidate> items = new ArrayList<>();
    for (Object raw : query.getResultList()) {
      if (!(raw instanceof Object[] values) || values.length != 7) throw invalid();
      items.add(
          new Candidate(
              values[0].toString(),
              id(values[1]),
              id(values[2]),
              id(values[3]),
              id(values[4]),
              id(values[5]),
              number(values[6]).longValue()));
    }
    return new PageImpl<>(items, pageable, total);
  }

  private String predicate(Filter filter, Map<String, Object> parameters) {
    StringBuilder where = new StringBuilder(" WHERE 1=1");
    add(where, parameters, "c.so_serial", "serial", filter.serial());
    add(where, parameters, "c.ma_theo_doi", "tracking", filter.tracking());
    add(where, parameters, "c.ma_don_hang", "orderCode", filter.orderCode());
    if (filter.phone() != null) {
      where.append(
          """
           AND (c.order_phone = :phone OR c.customer_phone = :phone
             OR EXISTS (SELECT 1 FROM phieu_bao_hanh contact
               WHERE contact.thiet_bi_id = c.device_id AND contact.sdt_nguoi_lien_he = :phone))
          """);
      parameters.put("phone", filter.phone());
    }
    return where.toString();
  }

  private void add(
      StringBuilder where,
      Map<String, Object> parameters,
      String column,
      String name,
      String value) {
    if (value != null) {
      where.append(" AND ").append(column).append(" = :").append(name);
      parameters.put(name, value);
    }
  }

  public List<PhieuBaoHanh> findReplacementTickets(Long deviceId) {
    return entityManager
        .createQuery(
            "SELECT w FROM PhieuBaoHanh w WHERE w.thietBi.id = :id AND w.thietBiThayThe IS NOT NULL ORDER BY w.id",
            PhieuBaoHanh.class)
        .setParameter("id", deviceId)
        .getResultList();
  }

  public List<PhieuBaoHanh> findIncomingReplacementTickets(Long deviceId) {
    return entityManager
        .createQuery(
            "SELECT w FROM PhieuBaoHanh w WHERE w.thietBiThayThe.id = :id ORDER BY w.id",
            PhieuBaoHanh.class)
        .setParameter("id", deviceId)
        .getResultList();
  }

  public List<PhieuBaoHanh> findWarrantiesForLine(Long lineId) {
    return entityManager
        .createQuery(
            "SELECT w FROM PhieuBaoHanh w WHERE w.thietBi.chiTietDonHang.id = :id ORDER BY w.id",
            PhieuBaoHanh.class)
        .setParameter("id", lineId)
        .getResultList();
  }

  public List<ChiTietTraHang> findReturnsForLine(Long lineId) {
    return entityManager
        .createQuery(
            "SELECT r FROM ChiTietTraHang r WHERE r.chiTietDonHang.id = :id ORDER BY r.id",
            ChiTietTraHang.class)
        .setParameter("id", lineId)
        .getResultList();
  }

  public List<ThietBiBaoHanh> findDevicesForLine(Long lineId) {
    return entityManager
        .createQuery(
            "SELECT d FROM ThietBiBaoHanh d WHERE d.chiTietDonHang.id = :id ORDER BY d.id",
            ThietBiBaoHanh.class)
        .setParameter("id", lineId)
        .getResultList();
  }

  public boolean hasComboLines(Long orderId) {
    return entityManager
            .createQuery(
                "SELECT COUNT(c) FROM ChiTietDonHang c WHERE c.donHang.id = :id AND c.phienBan.sanPham.loaiSanPham = com.example.dantruventu.Enum.LoaiSanPham.BO_PC",
                Long.class)
            .setParameter("id", orderId)
            .getSingleResult()
        > 0;
  }

  public boolean wasDelivered(DonHang order) {
    if (order == null) return false;
    if (order.getLoaiDonHang() == LoaiDonHang.TAI_QUAY
        && order.getTrangThaiDonHang() == TrangThaiDonHang.HOAN_THANH
        && order.getTrangThaiXuatKho() == TrangThaiXuatKho.DA_XUAT_KHO) return true;
    long deliveries =
        entityManager
            .createQuery(
                "SELECT COUNT(d) FROM PhieuGiaoHang d WHERE d.donHang.id = :id AND d.trangThaiGiaoHang = com.example.dantruventu.Enum.TrangThaiGiaoHangEnum.GIAO_THANH_CONG",
                Long.class)
            .setParameter("id", order.getId())
            .getSingleResult();
    if (deliveries > 0) return true;
    long history =
        entityManager
            .createQuery(
                "SELECT COUNT(h) FROM LichSuXuLyDonHang h WHERE h.donHang.id = :id AND h.hanhDong = 'GIAO_VAN_GIAO_THANH_CONG'",
                Long.class)
            .setParameter("id", order.getId())
            .getSingleResult();
    return history > 0;
  }

  public ThietBiBaoHanh device(Long id) {
    return entity(ThietBiBaoHanh.class, id);
  }

  public ChiTietDonHang line(Long id) {
    return entity(ChiTietDonHang.class, id);
  }

  public SoSerialSanPham serial(Long id) {
    return entity(SoSerialSanPham.class, id);
  }

  public DonHang order(Long id) {
    return entity(DonHang.class, id);
  }

  private <T> T entity(Class<T> type, Long id) {
    if (id == null) return null;
    T entity = entityManager.find(type, id);
    if (entity == null) throw invalid();
    return entity;
  }

  private static Long id(Object value) {
    return value == null ? null : number(value).longValue();
  }

  private static Number number(Object value) {
    if (!(value instanceof Number number)) throw invalid();
    return number;
  }

  private static AppException invalid() {
    return new AppException(ErrorCode.INVALID_WARRANTY_READ_DATA);
  }
}
