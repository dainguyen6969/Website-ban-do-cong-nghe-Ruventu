package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.NguoiDung;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NguoiDungRepository
    extends JpaRepository<NguoiDung, Long>, JpaSpecificationExecutor<NguoiDung> {

  Optional<NguoiDung> findByEmail(String email);

  Optional<NguoiDung> findByEmailOrSoDienThoai(String email, String soDienThoai);

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
