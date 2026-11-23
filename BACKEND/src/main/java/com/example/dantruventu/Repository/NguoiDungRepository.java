package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface NguoiDungRepository
    extends JpaRepository<NguoiDung, Long>, JpaSpecificationExecutor<NguoiDung> {

  Optional<NguoiDung> findByEmail(String email);

  // Khóa cả chủ giỏ, kể cả khi chưa có dòng gio_hang nào để khóa.
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT n FROM NguoiDung n WHERE n.id = :id")
  Optional<NguoiDung> findForCartUpdate(@Param("id") Long id);

  Optional<NguoiDung> findByEmailOrSoDienThoai(String email, String soDienThoai);

  @Query(
      """
      SELECT n
      FROM NguoiDung n
      JOIN n.vaiTro v
      WHERE n.trangThai = :activeStatus
        AND (
          UPPER(v.tenVaiTro) = 'USER'
          OR UPPER(v.tenVaiTro) = 'KHACH_HANG'
          OR LOWER(v.tenVaiTro) = 'khách hàng'
          OR LOWER(v.tenVaiTro) = 'khach hang'
          OR LOWER(COALESCE(v.moTa, '')) LIKE '%khách hàng%'
          OR LOWER(COALESCE(v.moTa, '')) LIKE '%khach hang%'
        )
        AND (
          :keyword IS NULL
          OR LOWER(n.hoTen) LIKE :keyword ESCAPE '!'
          OR LOWER(n.soDienThoai) LIKE :keyword ESCAPE '!'
        )
      """)
  Page<NguoiDung> findActiveCustomerPayers(
      @Param("activeStatus") TrangThaiCoBanEnum activeStatus,
      @Param("keyword") String keyword,
      Pageable pageable);

  @Query(
      """
      SELECT n
      FROM NguoiDung n
      JOIN n.vaiTro v
      WHERE n.trangThai = :activeStatus
        AND NOT (
          UPPER(v.tenVaiTro) = 'USER'
          OR UPPER(v.tenVaiTro) = 'KHACH_HANG'
          OR LOWER(v.tenVaiTro) = 'khách hàng'
          OR LOWER(v.tenVaiTro) = 'khach hang'
          OR LOWER(COALESCE(v.moTa, '')) LIKE '%khách hàng%'
          OR LOWER(COALESCE(v.moTa, '')) LIKE '%khach hang%'
        )
        AND (
          :keyword IS NULL
          OR LOWER(n.hoTen) LIKE :keyword ESCAPE '!'
          OR LOWER(n.soDienThoai) LIKE :keyword ESCAPE '!'
        )
      """)
  Page<NguoiDung> findActiveEmployeePayers(
      @Param("activeStatus") TrangThaiCoBanEnum activeStatus,
      @Param("keyword") String keyword,
      Pageable pageable);

  boolean existsByEmail(String email);

  boolean existsBySoDienThoai(String soDienThoai);

  // NEW: PUT update employee with self-lock/self-demotion checks
  boolean existsBySoDienThoaiAndIdNot(String soDienThoai, Long id);

  @Query(
      """
            SELECT n
            FROM NguoiDung n
            JOIN FETCH n.vaiTro
            WHERE n.id = :id
            """)
  Optional<NguoiDung> findByIdWithVaiTro(@Param("id") Long id);

  @Modifying(flushAutomatically = true)
  @Query(
      value =
          """
          UPDATE nguoi_dung
          SET phien_ban_xac_thuc = phien_ban_xac_thuc + 1
          WHERE id = :id
          """,
      nativeQuery = true)
  void incrementAuthVersion(@Param("id") Long id);

  @Modifying
  @Query(
      """
            UPDATE NguoiDung n
            SET n.hoTen = :hoTen, n.anhDaiDien = :anhDaiDien, n.ngayCapNhat = :now
            WHERE n.id = :id AND n.phienBanXacThuc = :authVersion AND n.trangThai = :active
            """)
  int updateProfileForSession(
      @Param("id") Long id,
      @Param("authVersion") long authVersion,
      @Param("active") TrangThaiCoBanEnum active,
      @Param("hoTen") String hoTen,
      @Param("anhDaiDien") String anhDaiDien,
      @Param("now") LocalDateTime now);

  boolean existsByIdAndVaiTro_MaVaiTroAndTrangThai(
      Long id, String maVaiTro, TrangThaiCoBanEnum trangThai);

  // NEW: GET role list - count employees for a role
  long countByVaiTroId(Long vaiTroId);

  // NEW: GET role list - batch count employees grouped by role IDs
  @Query(
      """
      SELECT n.vaiTro.id AS roleId, COUNT(n) AS userCount
      FROM NguoiDung n
      WHERE n.vaiTro.id IN :roleIds
      GROUP BY n.vaiTro.id
      """)
  java.util.List<Object[]> countUsersGroupedByRoleIds(
      @Param("roleIds") java.util.Collection<Long> roleIds);
}
