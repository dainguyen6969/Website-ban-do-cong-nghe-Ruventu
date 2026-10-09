package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
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
