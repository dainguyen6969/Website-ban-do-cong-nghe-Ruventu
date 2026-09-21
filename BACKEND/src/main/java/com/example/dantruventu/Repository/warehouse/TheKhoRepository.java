package com.example.dantruventu.Repository.warehouse;

import com.example.dantruventu.Entity.TheKho;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TheKhoRepository
    extends JpaRepository<TheKho, Long>, JpaSpecificationExecutor<TheKho> {

  @Override
  @EntityGraph(attributePaths = {"phienBan", "khoHang"})
  Page<TheKho> findAll(Specification<TheKho> specification, Pageable pageable);
}
