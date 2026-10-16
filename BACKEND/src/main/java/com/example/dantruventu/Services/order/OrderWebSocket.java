package com.example.dantruventu.Services.order;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Services.JwtService;
import io.jsonwebtoken.JwtException;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderWebSocket extends TextWebSocketHandler implements HandshakeInterceptor {
  private final JwtService jwtService;
  private final NguoiDungRepository users;
  private final ObjectMapper objectMapper;

  private record Ticket(String token, Instant expiresAt) {}

  private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
  // shortcut: subscribers live on one BE instance; use a shared broker for multiple instances.
  private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

  public String issueTicket(String token) {
    if (!authorized(token)) throw new AccessDeniedException("Không có quyền theo dõi đơn hàng");
    tickets.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(Instant.now()));
    String ticket = UUID.randomUUID().toString();
    tickets.put(ticket, new Ticket(token, Instant.now().plusSeconds(30)));
    return ticket;
  }

  private boolean authorized(String token) {
    try {
      if (token == null || !jwtService.isAccessTokenValid(token)) return false;
      return users
          .findByIdWithVaiTro(jwtService.getUserIdFromToken(token))
          .filter(user -> user.getTrangThai() == TrangThaiCoBanEnum.HOAT_DONG)
          .filter(
              user -> user.getVaiTro() != null && "ADMIN".equals(user.getVaiTro().getTenVaiTro()))
          .isPresent();
    } catch (JwtException | IllegalArgumentException ex) {
      return false;
    }
  }

  @Override
  public boolean beforeHandshake(
      ServerHttpRequest request,
      ServerHttpResponse response,
      WebSocketHandler handler,
      Map<String, Object> attributes) {
    String key =
        UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("ticket");
    Ticket ticket = key == null ? null : tickets.remove(key);
    if (ticket == null
        || !ticket.expiresAt().isAfter(Instant.now())
        || !authorized(ticket.token())) {
      response.setStatusCode(HttpStatus.FORBIDDEN);
      return false;
    }
    attributes.put("token", ticket.token());
    return true;
  }

  @Override
  public void afterHandshake(
      ServerHttpRequest request,
      ServerHttpResponse response,
      WebSocketHandler handler,
      Exception exception) {}

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws IOException {
    session.setTextMessageSizeLimit(64);
    WebSocketSession connection = new ConcurrentWebSocketSessionDecorator(session, 1000, 8192);
    sessions.put(session.getId(), connection);
    try {
      connection.sendMessage(new TextMessage("{\"type\":\"ready\"}"));
    } catch (IOException | RuntimeException ex) {
      disconnect(connection);
    }
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) {
    WebSocketSession connection = sessions.get(session.getId());
    if (connection == null) return;
    try {
      if (!"ping".equals(message.getPayload())
          || !authorized((String) session.getAttributes().get("token"))) {
        disconnect(connection);
        return;
      }
      connection.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
    } catch (IOException | RuntimeException ex) {
      disconnect(connection);
    }
  }

  @TransactionalEventListener
  public void broadcast(OrderEvents.Changed event) {
    TextMessage message =
        new TextMessage(
            objectMapper.writeValueAsString(
                Map.of(
                    "type",
                    "order-changed",
                    "orderId",
                    event.orderId(),
                    "change",
                    event.change())));
    for (WebSocketSession session : sessions.values()) {
      try {
        if (!session.isOpen() || !authorized((String) session.getAttributes().get("token"))) {
          disconnect(session);
          continue;
        }
        session.sendMessage(message);
      } catch (IOException | RuntimeException ex) {
        log.debug("Order subscriber disconnected: {}", session.getId(), ex);
        disconnect(session);
      }
    }
  }

  private void disconnect(WebSocketSession session) {
    sessions.remove(session.getId());
    try {
      session.close(CloseStatus.POLICY_VIOLATION);
    } catch (IOException | RuntimeException ex) {
      log.debug("Could not close order subscriber: {}", session.getId(), ex);
    }
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    sessions.remove(session.getId());
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) {
    disconnect(session);
  }
}
