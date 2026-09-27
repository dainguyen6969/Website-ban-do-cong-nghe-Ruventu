package com.example.dantruventu.Repository;

import com.example.dantruventu.Entity.GioHang;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface GioHangRepository
        extends JpaRepository<GioHang, Long> {

    List<GioHang> findByNguoiDungIdOrderByNgayCapNhatDesc(
            Long nguoiDungId
    );

    Optional<GioHang> findByNguoiDungIdAndPhienBanId(
            Long nguoiDungId,
            Long phienBanId
    );

    Optional<GioHang> findByIdAndNguoiDungId(
            Long id,
            Long nguoiDungId
    );

    @EntityGraph(attributePaths = {"phienBan", "phienBan.sanPham"})
    List<GioHang> findByNguoiDungIdAndIdIn(
            Long nguoiDungId,
            Collection<Long> ids
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
            """
            SELECT g FROM GioHang g
            JOIN FETCH g.phienBan pb
            JOIN FETCH pb.sanPham
            WHERE g.nguoiDung.id = :nguoiDungId
              AND g.id IN :ids
            """
    )
    List<GioHang> findSelectedForUpdate(
            @Param("nguoiDungId") Long nguoiDungId,
            @Param("ids") Collection<Long> ids
    );

    long deleteByNguoiDungIdAndIdIn(
            Long nguoiDungId,
            Collection<Long> ids
    );
}
