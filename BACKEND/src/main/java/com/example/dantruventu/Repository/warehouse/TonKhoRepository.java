package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.TonKho;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TonKhoRepository extends JpaRepository<TonKho, Long> {
  interface TonPhienBanProjection {

    Long getPhienBanId();

    Long getTonCoTheBan();
  }

  @Query(
      """
            SELECT t.phienBan.id AS phienBanId,
                   COALESCE(SUM(t.tonCoTheBan), 0) AS tonCoTheBan
            FROM TonKho t
            WHERE t.phienBan.id IN :ids
            GROUP BY t.phienBan.id
            """)
  List<TonPhienBanProjection> tongTonCoTheBanTheoPhienBan(@Param("ids") Collection<Long> ids);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
            SELECT t
            FROM TonKho t
            WHERE t.khoHang.id = :khoHangId
              AND t.phienBan.id = :phienBanId
            ORDER BY t.id
            """)
  List<TonKho> findForSerialUpdate(
      @Param("khoHangId") Long khoHangId, @Param("phienBanId") Long phienBanId);

  boolean existsByPhienBanId(Long phienBanId);

  List<TonKho> findByKhoHang_IdAndPhienBan_IdOrderByIdAsc(Long khoHangId, Long phienBanId);
}
