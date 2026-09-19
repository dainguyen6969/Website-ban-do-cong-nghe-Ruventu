package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.KhoHang;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface KhoHangRepository
        extends JpaRepository<KhoHang, Long>,
        JpaSpecificationExecutor<KhoHang> {

    @Override
    @EntityGraph(attributePaths = "quanLy")
    Page<KhoHang> findAll(
            Specification<KhoHang> specification,
            Pageable pageable);
}