package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.DonNhapHang;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionalEventListenerFactory;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

class OrderNotificationTest {
  static class Sink {
    final List<OrderEvents.Notification> events = new ArrayList<>();

    @TransactionalEventListener
    public void receive(OrderEvents.Notification event) {
      events.add(event);
    }
  }

  private TransactionTemplate transaction() {
    return new TransactionTemplate(
        new AbstractPlatformTransactionManager() {
          @Override
          protected Object doGetTransaction() {
            return new Object();
          }

          @Override
          protected void doBegin(Object transaction, TransactionDefinition definition) {}

          @Override
          protected void doCommit(DefaultTransactionStatus status) {}

          @Override
          protected void doRollback(DefaultTransactionStatus status) {}
        });
  }

  @Test
  void allCategoriesPublishOnlyAfterCommitAndStatusWatchKeepsRealBeforeAndAfter() {
    try (var context = new AnnotationConfigApplicationContext()) {
      context.registerBean(TransactionalEventListenerFactory.class);
      context.registerBean(Sink.class);
      context.refresh();
      var events = new OrderEvents(context);
      var sink = context.getBean(Sink.class);
      var order =
          DonHang.builder()
              .id(1L)
              .maDonHang("DH1")
              .loaiDonHang(LoaiDonHang.ONLINE)
              .trangThaiDonHang(TrangThaiDonHang.CHO_DUYET)
              .trangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN)
              .build();
      var tx = transaction();
      tx.executeWithoutResult(
          status -> {
            events.created(order);
            events.watchOrder(order);
            events.watchOrder(order);
            order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);
            order.setTrangThaiDongGoi(TrangThaiDongGoi.DA_DONG_GOI);
            order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO);
            order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
            events.receipt(
                SoQuyThuChi.builder()
                    .id(2L)
                    .maPhieu("PT2")
                    .loaiPhieu(LoaiPhieuThuChi.THU)
                    .tenNguoiNopNhan("Khách lẻ")
                    .soTien(BigDecimal.TEN)
                    .build());
            events.createdPurchase(
                DonNhapHang.builder()
                    .id(3L)
                    .maDonNhap("DN3")
                    .trangThaiNhap(TrangThaiNhapHang.DAT_HANG)
                    .build());
            events.status(
                "SUPPLIER",
                4L,
                "NCC4",
                TrangThaiCoBanEnum.HOAT_DONG,
                TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
            events.status(
                "SHIPPING_PARTNER",
                5L,
                "VC5",
                TrangThaiCoBanEnum.HOAT_DONG,
                TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
            assertTrue(sink.events.isEmpty());
          });
      assertEquals(6, sink.events.size());
      var changes =
          sink.events.stream()
              .filter(event -> event.category().equals("ORDER_STATUS"))
              .findFirst()
              .orElseThrow()
              .changes();
      assertEquals(4, changes.size());
      assertTrue(
          changes.contains(new OrderEvents.StatusChange("Đơn hàng", "CHO_DUYET", "CHO_DONG_GOI")));
      sink.events.clear();
      tx.executeWithoutResult(
          status -> {
            events.watchOrder(order);
            events.status(
                "SUPPLIER", 4L, "NCC4", TrangThaiCoBanEnum.HOAT_DONG, TrangThaiCoBanEnum.HOAT_DONG);
            events.receipt(SoQuyThuChi.builder().loaiPhieu(LoaiPhieuThuChi.CHI).build());
          });
      assertTrue(sink.events.isEmpty(), "No-op updates and expenses must not notify");
      tx.executeWithoutResult(
          status -> {
            events.watchOrder(order);
            order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
            events.created(order);
            status.setRollbackOnly();
          });
      assertTrue(sink.events.isEmpty(), "Rolled-back changes must not notify");
      var purchase =
          DonNhapHang.builder()
              .id(3L)
              .maDonNhap("DN3")
              .trangThaiNhap(TrangThaiNhapHang.DAT_HANG)
              .trangThaiThanhToan(TrangThaiThanhToanNhap.CHUA_TRA)
              .build();
      tx.executeWithoutResult(
          status -> {
            events.watchPurchase(purchase);
            purchase.setTrangThaiNhap(TrangThaiNhapHang.DA_DUYET);
          });
      assertEquals(
          List.of(new OrderEvents.StatusChange("Nhập hàng", "DAT_HANG", "DA_DUYET")),
          sink.events.getFirst().changes());
    }
  }
}
