package com.example.dantruventu;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Services.order.AdminOrderService;
import com.example.dantruventu.Services.order.OrderEvents;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@EnableScheduling
@SpringBootApplication
public class DantRuventuApplication {

  public static void main(String[] args) {
    SpringApplication.run(DantRuventuApplication.class, args);
  }

  @Component
  @RequiredArgsConstructor
  @Slf4j
  public static class PendingOrderTasks {

    private final DonHangRepository orderRepository;
    private final AdminOrderService orderService;
    private final SalesProperties salesProperties;

    @Value("${ruventu.sales.pending-order-processing-enabled:false}")
    private boolean enabled;

    @Scheduled(
        initialDelayString = "${ruventu.sales.pending-order-initial-delay-ms:10000}",
        fixedDelayString = "${ruventu.sales.pending-order-scan-delay-ms:60000}")
    public void scan() {
      log.info("PENDING_ORDER_SCAN enabled={}", enabled);

      if (!enabled) {
        return;
      }

      LocalDateTime cutoff = LocalDateTime.now(salesProperties.zone());

      Long afterId = 0L;

      while (true) {
        var ids =
            orderRepository.findPendingOrderLifecycleIds(afterId, cutoff, PageRequest.of(0, 100));

        log.info("PENDING_ORDER_IDS afterId={}, cutoff={}, ids={}", afterId, cutoff, ids);

        if (ids.isEmpty()) {
          return;
        }

        for (Long id : ids) {
          process(id);
        }

        afterId = ids.get(ids.size() - 1);
      }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void receiptCommitted(OrderEvents.Changed event) {
      if (enabled && "XAC_NHAN_THU_TIEN".equals(event.change())) {
        process(event.orderId());
      }
    }

    private void process(Long orderId) {
      try {
        orderService.processPendingOrderLifecycle(orderId);
      } catch (RuntimeException exception) {
        log.warn("Chưa xử lý được vòng đời đơn {}", orderId, exception);
      }
    }
  }
}
