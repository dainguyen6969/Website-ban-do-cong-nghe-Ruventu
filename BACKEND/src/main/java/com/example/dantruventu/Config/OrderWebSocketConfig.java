package com.example.dantruventu.Config;

import com.example.dantruventu.Services.order.OrderWebSocket;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.ServletWebSocketHandlerRegistry;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class OrderWebSocketConfig implements WebSocketConfigurer {
  private final OrderWebSocket socket;

  @Value(
      "${ruventu.orders.websocket.allowed-origins:http://localhost:5173,http://127.0.0.1:5173,http://localhost,https://coactive-subfestive-estelle.ngrok-free.dev}")
  private String[] allowedOrigins;

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    // The exact socket route must run before the REST /orders/{id} mapping.
    ((ServletWebSocketHandlerRegistry) registry).setOrder(-1);
    registry
        .addHandler(socket, "/api/v1/admin/orders/realtime")
        .addInterceptors(socket)
        .setAllowedOrigins(allowedOrigins);
  }
}
