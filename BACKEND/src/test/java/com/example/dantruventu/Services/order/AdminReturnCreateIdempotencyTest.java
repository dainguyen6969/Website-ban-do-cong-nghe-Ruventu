package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminReturnCreateRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.AdminReturnOrderRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.ChiTietTraHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.order.ThietBiBaoHanhRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AdminReturnCreateIdempotencyTest {

  private static final String KEY = "8f4b6a10-8632-4c37-8797-b47f371f14fa";
  private final ObjectMapper mapper = new ObjectMapper();
  private final NguoiDung actor = NguoiDung.builder().id(7L).build();

  @Mock SalesIdempotencyRepository idempotencyRepository;
  @Mock PhieuTraHangRepository returnRepository;
  @Mock AdminReturnOrderRepository returnOrderRepository;
  @Mock ThietBiBaoHanhRepository warrantyDeviceRepository;
  @Mock DonHangRepository orderRepository;
  @Mock ChiTietDonHangRepository orderLineRepository;
  @Mock ChiTietTraHangRepository returnLineRepository;
  @Mock SoSerialSanPhamRepository serialRepository;
  @Mock PhieuGiaoHangRepository deliveryRepository;
  @Mock SoQuyThuChiRepository cashRepository;
  @Mock LoaiThuChiRepository cashTypeRepository;
  @Mock ReturnInventoryService inventoryService;
  @Mock SalesProperties salesProperties;
  @Mock OrderEvents orderEvents;
  @Mock jakarta.persistence.EntityManager entityManager;
  @Mock ReturnMoneySnapshotService returnMoneySnapshots;

  private AdminReturnService service;

  @BeforeEach
  void useTheActualIdempotencyService() {
    var cashbook =
        new CashbookService(
            cashRepository, cashTypeRepository, idempotencyRepository, mapper, orderEvents);
    service =
        new AdminReturnService(
            returnRepository,
            returnOrderRepository,
            warrantyDeviceRepository,
            orderRepository,
            orderLineRepository,
            returnLineRepository,
            serialRepository,
            deliveryRepository,
            cashRepository,
            cashTypeRepository,
            cashbook,
            inventoryService,
            salesProperties,
            orderEvents,
            entityManager,
            returnMoneySnapshots);
    // Supplies transaction context for the real MANDATORY helper; no DB rollback is simulated.
    TransactionSynchronizationManager.setActualTransactionActive(true);
    TransactionSynchronizationManager.setCurrentTransactionReadOnly(false);
  }

  @AfterEach
  void clearTransactionContextAndCheckNoStockOrMoneyOperation() {
    TransactionSynchronizationManager.clear();
    verifyNoInteractions(cashRepository, cashTypeRepository, inventoryService, deliveryRepository);
  }

  @Test
  void sameActorKeyAndBodyReplayTheExactStoredResponseWithoutCreatingAgain() {
    var stored = storedResponse();
    stubCompletedKeys(stored);
    var first = service.create(request(), KEY, actor);
    var second = service.create(request(), KEY, actor);
    String expected = mapper.writeValueAsString(stored);
    assertEquals(expected, mapper.writeValueAsString(first));
    assertEquals(expected, mapper.writeValueAsString(second));
    assertEquals(OffsetDateTime.parse("2026-10-12T11:00:00+07:00"), second.getNgayTao());
    verify(idempotencyRepository, times(2)).acquire(eq("TH-CREATE-" + KEY), eq(7L), anyString());
    verify(idempotencyRepository, never()).complete(anyString(), anyString());
    verifyNoInteractions(
        orderRepository,
        orderLineRepository,
        returnRepository,
        returnLineRepository,
        warrantyDeviceRepository,
        returnOrderRepository);
  }

  @Test
  void reusingTheKeyWithDifferentBodyIs409BeforeAnyOrderLock() {
    stubCompletedKeys(storedResponse());
    service.create(request(), KEY, actor);
    var changed = request();
    changed.setLyDoTra("Lý do khác");
    var error = assertThrows(AppException.class, () -> service.create(changed, KEY, actor));
    assertEquals(ErrorCode.CONFLICT, error.getErrorCode());
    verifyNoInteractions(orderRepository, returnRepository);
  }

  @Test
  void aDifferentActorCannotReplayAnotherActorsKey() {
    stubCompletedKeys(storedResponse());
    service.create(request(), KEY, actor);
    var otherActor = NguoiDung.builder().id(8L).build();
    var error = assertThrows(AppException.class, () -> service.create(request(), KEY, otherActor));
    assertEquals(ErrorCode.CONFLICT, error.getErrorCode());
    verifyNoInteractions(orderRepository, returnRepository);
  }

  @Test
  void failedCreationDoesNotCacheASuccessResponse() {
    when(idempotencyRepository.acquire(anyString(), anyLong(), anyString()))
        .thenAnswer(
            invocation ->
                new SalesIdempotencyRepository.Entry(
                    invocation.getArgument(1), invocation.getArgument(2), null));
    when(orderRepository.findByIdForUpdate(1006L)).thenReturn(Optional.empty());
    var error = assertThrows(AppException.class, () -> service.create(request(), KEY, actor));
    assertEquals(ErrorCode.NOT_FOUND, error.getErrorCode());
    verify(idempotencyRepository, never()).complete(anyString(), anyString());
    verifyNoInteractions(returnRepository, returnLineRepository);
  }

  private void stubCompletedKeys(AdminReturnResponse.CreateResponse stored) {
    String json = mapper.writeValueAsString(stored);
    Map<String, SalesIdempotencyRepository.Entry> rows = new HashMap<>();
    when(idempotencyRepository.acquire(anyString(), anyLong(), anyString()))
        .thenAnswer(
            invocation -> {
              String key = invocation.getArgument(0);
              Long actorId = invocation.getArgument(1);
              String hash = invocation.getArgument(2);
              return rows.computeIfAbsent(
                  key, ignored -> new SalesIdempotencyRepository.Entry(actorId, hash, json));
            });
  }

  private AdminReturnCreateRequest request() {
    var line = new AdminReturnCreateRequest.ReturnLine();
    line.setChiTietDonHangId(6001L);
    line.setSoLuong(1);
    var request = new AdminReturnCreateRequest();
    request.setDonHangId(1006L);
    request.setTenNguoiLienHe("Nguyễn Văn An");
    request.setSdtNguoiLienHe("0912345678");
    request.setLyDoTra("Không còn nhu cầu");
    request.setHinhThucHoanTien("TIEN_MAT");
    request.setChiTietTra(List.of(line));
    return request;
  }

  private AdminReturnResponse.CreateResponse storedResponse() {
    return AdminReturnResponse.CreateResponse.builder()
        .id(303L)
        .maTraHang("TH000303")
        .donHangId(1006L)
        .khachHangId(null)
        .tenNguoiLienHe("Nguyễn Văn An")
        .sdtNguoiLienHe("0912345678")
        .trangThaiTraHang(TrangThaiTraHang.CHO_TIEP_NHAN)
        .chiTietTra(
            List.of(
                AdminReturnResponse.ReturnLine.builder()
                    .id(504L)
                    .chiTietDonHangId(6001L)
                    .soLuong(1)
                    .donGiaHoan(new BigDecimal("33333"))
                    .thanhTienHoan(new BigDecimal("33334"))
                    .dieuChinhLamTron(BigDecimal.ONE)
                    .build()))
        .tongTienHoan(new BigDecimal("33334"))
        .ngayTao(OffsetDateTime.parse("2026-10-12T11:00:00+07:00"))
        .build();
  }
}
