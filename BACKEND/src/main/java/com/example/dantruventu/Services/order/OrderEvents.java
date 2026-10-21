package com.example.dantruventu.Services.order;

import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.DonNhapHang;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class OrderEvents {
  private final ApplicationEventPublisher publisher;

  public record Changed(Long orderId, String change) {}

  public void changed(Long orderId, String change) {
    publisher.publishEvent(new Changed(orderId, change));
  }

  public record StatusChange(String field, String before, String after) {}

  public record Notification(
      String id,
      String category,
      Long itemId,
      String title,
      String description,
      List<StatusChange> changes,
      Instant occurredAt) {}

  public void created(DonHang order) {
    changed(order.getId(), "CREATED");
    notify(
        "NEW_ORDER",
        order.getId(),
        order.getMaDonHang(),
        customer(order)
            + " · "
            + (order.getLoaiDonHang().name().equals("ONLINE") ? "Trực tuyến" : "Tại quầy"),
        List.of());
  }

  public void watchOrder(DonHang order) {
    watch(
        "ORDER_STATUS",
        order.getId(),
        order.getMaDonHang(),
        customer(order),
        () ->
            Map.of(
                "Đơn hàng", state(order.getTrangThaiDonHang()),
                "Đóng gói", state(order.getTrangThaiDongGoi()),
                "Xuất kho", state(order.getTrangThaiXuatKho()),
                "Thanh toán", state(order.getTrangThaiThanhToan())));
  }

  public void createdPurchase(DonNhapHang order) {
    notify(
        "PURCHASE_ORDER",
        order.getId(),
        order.getMaDonNhap(),
        "Đã tạo đơn nhập hàng",
        List.of(new StatusChange("Nhập hàng", null, state(order.getTrangThaiNhap()))));
  }

  public void watchPurchase(DonNhapHang order) {
    watch(
        "PURCHASE_ORDER",
        order.getId(),
        order.getMaDonNhap(),
        "Cập nhật đơn nhập hàng",
        () ->
            Map.of(
                "Nhập hàng",
                state(order.getTrangThaiNhap()),
                "Thanh toán",
                state(order.getTrangThaiThanhToan())));
  }

  public void receipt(SoQuyThuChi receipt) {
    if (receipt.getLoaiPhieu() != LoaiPhieuThuChi.THU) return;
    notify(
        "RECEIPT",
        receipt.getId(),
        receipt.getMaPhieu(),
        receipt.getTenNguoiNopNhan() + " · " + receipt.getSoTien().toPlainString() + " ₫",
        List.of());
  }

  public void status(String category, Long id, String title, Enum<?> before, Enum<?> after) {
    if (before != after)
      notify(
          category,
          id,
          title,
          "Thay đổi trạng thái",
          List.of(new StatusChange("Trạng thái", state(before), state(after))));
  }

  private String customer(DonHang order) {
    if (order.getTenNguoiNhan() != null && !order.getTenNguoiNhan().isBlank())
      return order.getTenNguoiNhan();
    return order.getKhachHang() == null ? "Khách lẻ" : order.getKhachHang().getHoTen();
  }

  private static String state(Enum<?> value) {
    return value == null ? "" : value.name();
  }

  private void notify(
      String category, Long id, String title, String description, List<StatusChange> changes) {
    publisher.publishEvent(
        new Notification(
            UUID.randomUUID().toString(),
            category,
            id,
            title,
            description,
            changes,
            Instant.now()));
  }

  private void watch(
      String category,
      Long id,
      String title,
      String description,
      Supplier<Map<String, String>> states) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
    boolean watching =
        TransactionSynchronizationManager.getSynchronizations().stream()
            .anyMatch(
                sync ->
                    sync instanceof Pending pending
                        && pending.category.equals(category)
                        && pending.id.equals(id));
    if (!watching)
      TransactionSynchronizationManager.registerSynchronization(
          new Pending(category, id, title, description, states));
  }

  // Compare the locked initial state with the final state once per transaction, including
  // payment-only changes.
  private class Pending implements TransactionSynchronization {
    private final String category;
    private final Long id;
    private final String title;
    private final String description;
    private final Supplier<Map<String, String>> states;
    private final Map<String, String> before;

    Pending(
        String category,
        Long id,
        String title,
        String description,
        Supplier<Map<String, String>> states) {
      this.category = category;
      this.id = id;
      this.title = title;
      this.description = description;
      this.states = states;
      this.before = states.get();
    }

    @Override
    public void beforeCommit(boolean readOnly) {
      if (readOnly) return;
      var changes =
          states.get().entrySet().stream()
              .filter(entry -> !Objects.equals(before.get(entry.getKey()), entry.getValue()))
              .map(
                  entry ->
                      new StatusChange(
                          entry.getKey(), before.get(entry.getKey()), entry.getValue()))
              .toList();
      if (!changes.isEmpty()) OrderEvents.this.notify(category, id, title, description, changes);
    }
  }
}
