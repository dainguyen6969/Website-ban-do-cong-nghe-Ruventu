package com.example.dantruventu.Repository.partner;

import com.example.dantruventu.Entity.PhieuGiaoHang;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PhieuGiaoHangRepository
    extends JpaRepository<PhieuGiaoHang, Long>, JpaSpecificationExecutor<PhieuGiaoHang> {

  @Override
  @EntityGraph(attributePaths = "donHang")
  Page<PhieuGiaoHang> findAll(Specification<PhieuGiaoHang> specification, Pageable pageable);
}
