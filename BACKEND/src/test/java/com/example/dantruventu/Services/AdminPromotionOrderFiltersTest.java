package com.example.dantruventu.Services;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Entity.KhuyenMaiDonHang;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Specification.KhuyenMaiDonHangSpecification;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class AdminPromotionOrderFiltersTest {
  @Test
  void filtersOnlyLinkedProgramOrderCodeUsageStatusAndOrderCreationDates() {
    Root<KhuyenMaiDonHang> root = mock(Root.class);
    CriteriaQuery<?> query = mock(CriteriaQuery.class);
    CriteriaBuilder cb = mock(CriteriaBuilder.class);
    Path<KhuyenMai> promotion = mock(Path.class);
    Path<Long> promotionId = mock(Path.class);
    Path<DonHang> order = mock(Path.class);
    Path<String> orderCode = mock(Path.class);
    Path<TrangThaiApDungKhuyenMai> usageStatus = mock(Path.class);
    Path<LocalDateTime> orderDate = mock(Path.class);
    Expression<String> lowerCode = mock(Expression.class);
    Predicate predicate = mock(Predicate.class);
    when(root.<KhuyenMai>get("khuyenMai")).thenReturn(promotion);
    when(promotion.<Long>get("id")).thenReturn(promotionId);
    when(root.<DonHang>get("donHang")).thenReturn(order);
    when(root.<TrangThaiApDungKhuyenMai>get("trangThaiApDung")).thenReturn(usageStatus);
    when(order.<String>get("maDonHang")).thenReturn(orderCode);
    when(order.<LocalDateTime>get("ngayTao")).thenReturn(orderDate);
    when(cb.lower(orderCode)).thenReturn(lowerCode);
    when(cb.equal(any(Expression.class), any(Object.class))).thenReturn(predicate);
    when(cb.like(any(Expression.class), anyString(), anyChar())).thenReturn(predicate);
    when(cb.greaterThanOrEqualTo(any(Expression.class), any(LocalDateTime.class)))
        .thenReturn(predicate);
    when(cb.lessThan(any(Expression.class), any(LocalDateTime.class))).thenReturn(predicate);
    var start = LocalDateTime.of(2026, 10, 1, 0, 0);
    var end = LocalDateTime.of(2026, 11, 1, 0, 0);
    KhuyenMaiDonHangSpecification.build(
            10L, "ORD_%\\", TrangThaiApDungKhuyenMai.GIU_CHO, start, end)
        .toPredicate(root, query, cb);
    verify(cb).equal(promotionId, 10L);
    verify(cb).equal(usageStatus, TrangThaiApDungKhuyenMai.GIU_CHO);
    verify(cb).like(lowerCode, "%ord\\_\\%\\\\%", '\\');
    verify(cb).greaterThanOrEqualTo(orderDate, start);
    verify(cb).lessThan(orderDate, end);
  }
}
