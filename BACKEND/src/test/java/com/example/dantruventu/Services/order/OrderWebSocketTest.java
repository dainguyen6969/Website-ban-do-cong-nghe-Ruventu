package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.OrderWebSocketConfig;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Services.JwtService;
import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionalEventListenerFactory;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.ServletWebSocketHandlerRegistry;
import tools.jackson.databind.ObjectMapper;

class OrderWebSocketTest {
  JwtService jwt = mock(JwtService.class);
  NguoiDungRepository users = mock(NguoiDungRepository.class);
  OrderWebSocket socket = new OrderWebSocket(jwt, users, new ObjectMapper());
  NguoiDung admin;

  @BeforeEach
  void authorize() {
    admin =
        NguoiDung.builder()
            .id(1L)
            .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
            .vaiTro(VaiTro.builder().tenVaiTro("ADMIN").build())
            .build();
    when(jwt.isAccessTokenValid("token")).thenReturn(true);
    when(jwt.getUserIdFromToken("token")).thenReturn(1L);
    when(users.findByIdWithVaiTro(1L)).thenReturn(Optional.of(admin));
  }

  WebSocketSession subscriber(String id) throws IOException {
    WebSocketSession session = mock(WebSocketSession.class);
    when(session.getId()).thenReturn(id);
    when(session.isOpen()).thenReturn(true);
    when(session.getAttributes()).thenReturn(Map.of("token", "token"));
    socket.afterConnectionEstablished(session);
    clearInvocations(session);
    return session;
  }

  @Test
  void socketRoutePrecedesRestOrderIdRoute() {
    var config = new OrderWebSocketConfig(socket);
    ReflectionTestUtils.setField(config, "allowedOrigins", new String[] {"http://localhost:5173"});
    var registry = new ServletWebSocketHandlerRegistry();
    config.registerWebSocketHandlers(registry);
    assertEquals(-1, registry.getHandlerMapping().getOrder());
  }

  @Test
  void ticketsAreSingleUseAndRestrictedToActiveAdmins() {
    String ticket = socket.issueTicket("token");
    ServerHttpRequest request = mock(ServerHttpRequest.class);
    when(request.getURI()).thenReturn(URI.create("http://localhost/realtime?ticket=" + ticket));
    ServerHttpResponse response = mock(ServerHttpResponse.class);
    Map<String, Object> attributes = new HashMap<>();
    assertTrue(socket.beforeHandshake(request, response, socket, attributes));
    assertEquals("token", attributes.get("token"));
    assertFalse(socket.beforeHandshake(request, response, socket, new HashMap<>()));
    assertThrows(AccessDeniedException.class, () -> socket.issueTicket("bad-token"));
    admin.getVaiTro().setTenVaiTro("USER");
    assertThrows(AccessDeniedException.class, () -> socket.issueTicket("token"));
    admin.getVaiTro().setTenVaiTro("ADMIN");
    admin.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    assertThrows(AccessDeniedException.class, () -> socket.issueTicket("token"));
  }

  @Test
  void revokedTicketCannotConnectAndExpiredSubscriberCannotReceive() throws Exception {
    String ticket = socket.issueTicket("token");
    WebSocketSession session = subscriber("revoked");
    when(jwt.isAccessTokenValid("token")).thenReturn(false);
    ServerHttpRequest request = mock(ServerHttpRequest.class);
    when(request.getURI()).thenReturn(URI.create("http://localhost/realtime?ticket=" + ticket));
    assertFalse(
        socket.beforeHandshake(request, mock(ServerHttpResponse.class), socket, new HashMap<>()));
    socket.broadcast(new OrderEvents.Changed(9L, "UPDATED"));
    verify(session, never()).sendMessage(any());
    verify(session).close(any());
  }

  @Test
  void failedSubscriberDoesNotPreventOtherSubscribersOrCommit() throws Exception {
    WebSocketSession broken = subscriber("broken");
    WebSocketSession healthy = subscriber("healthy");
    doThrow(new IOException("disconnected")).when(broken).sendMessage(any());
    assertDoesNotThrow(() -> socket.broadcast(new OrderEvents.Changed(9L, "DUYET_DON")));
    ArgumentCaptor<TextMessage> message = ArgumentCaptor.forClass(TextMessage.class);
    verify(healthy).sendMessage(message.capture());
    assertEquals(
        9, new ObjectMapper().readTree(message.getValue().getPayload()).get("orderId").asInt());
    verify(broken).close(any());
  }

  @Test
  void onlyCommittedTransactionsBroadcast() throws Exception {
    WebSocketSession session = subscriber("transaction");
    try (var context = new AnnotationConfigApplicationContext()) {
      context.registerBean(TransactionalEventListenerFactory.class);
      context.registerBean(OrderWebSocket.class, () -> socket);
      context.refresh();
      var tx =
          new TransactionTemplate(
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
      OrderEvents events = new OrderEvents(context);
      context.publishEvent(new OrderEvents.Changed(1L, "NO_TRANSACTION"));
      verify(session, never()).sendMessage(any());
      tx.executeWithoutResult(
          status -> {
            events.changed(2L, "ROLLBACK");
            status.setRollbackOnly();
          });
      verify(session, never()).sendMessage(any());
      tx.executeWithoutResult(
          status -> {
            events.changed(3L, "CREATED");
            assertDoesNotThrow(() -> verify(session, never()).sendMessage(any()));
          });
      ArgumentCaptor<TextMessage> message = ArgumentCaptor.forClass(TextMessage.class);
      verify(session).sendMessage(message.capture());
      assertTrue(message.getValue().getPayload().contains("CREATED"));
    }
  }
}
