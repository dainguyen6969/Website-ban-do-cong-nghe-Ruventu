package com.example.dantruventu.Services.order;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OrderEvents {
  private final ApplicationEventPublisher publisher;

  public record Changed(Long orderId, String change) {}

  public void changed(Long orderId, String change) {
    publisher.publishEvent(new Changed(orderId, change));
  }
}
