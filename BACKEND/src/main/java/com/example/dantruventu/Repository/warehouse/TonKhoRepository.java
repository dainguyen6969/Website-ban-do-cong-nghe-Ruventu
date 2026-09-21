package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.TonKho;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
