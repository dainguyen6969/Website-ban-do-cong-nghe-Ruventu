package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.DonNhapHang;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DonNhapHangRepository extends JpaRepository<DonNhapHang, Long>, JpaSpecificationExecutor<DonNhapHang> {
    Page<DonNhapHang> findByNhaCungCap_Id(
            Long nhaCungCapId,
            Pageable pageable);
}
