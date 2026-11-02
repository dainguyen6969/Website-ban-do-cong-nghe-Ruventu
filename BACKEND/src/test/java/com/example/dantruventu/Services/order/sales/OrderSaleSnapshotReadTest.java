package com.example.dantruventu.Services.order.sales;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Error.AppException;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.SimpleTransactionStatus;
import tools.jackson.databind.ObjectMapper;

class OrderSaleSnapshotReadTest {
  @Test
  void missingLegacySnapshotDoesNotPoisonAReadButStillRollsBackStrictCallers() {
    var transactions = mock(PlatformTransactionManager.class);
    when(transactions.getTransaction(any())).thenAnswer(call -> new SimpleTransactionStatus());
    var target = new OrderSaleSnapshotService(null, new ObjectMapper(), null, null);
    var factory = new ProxyFactory(target);
    factory.setProxyTargetClass(true);
    factory.addAdvice(new TransactionInterceptor(transactions, new AnnotationTransactionAttributeSource()));
    var proxy = (OrderSaleSnapshotService) factory.getProxy();

    assertFalse(proxy.hasValidSnapshot(new ChiTietDonHang()));
    verify(transactions).commit(any());
    verify(transactions, never()).rollback(any());

    assertThrows(AppException.class, () -> proxy.requireSnapshot(new ChiTietDonHang()));
    verify(transactions).rollback(any());
  }
}
