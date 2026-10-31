package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.order.AdminReturnController;
import com.example.dantruventu.DTO.Request.order.AdminReturnCreateRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnResponse;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.GlobalExceptionHandler;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.AdminReturnOrderRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.ChiTietTraHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Repository.order.ThietBiBaoHanhRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AdminReturnCreateTest {

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final Set<TrangThaiTraHang> RELEASED =
      Set.of(TrangThaiTraHang.HUY, TrangThaiTraHang.TU_CHOI);

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
  @Mock CashbookService cashbookService;
  @Mock ReturnInventoryService returnInventoryService;
  @Mock SalesProperties salesProperties;
  @Mock OrderEvents orderEvents;

  @InjectMocks AdminReturnService service;

  private static final String KEY = "8f4b6a10-8632-4c37-8797-b47f371f14fa";
  private final NguoiDung actor = NguoiDung.builder().id(7L).build();
  private final AtomicLong nextSlipId = new AtomicLong(300);
  private final AtomicLong nextLineId = new AtomicLong(500);

  @BeforeEach
  void configureCreation() {
    lenient().when(salesProperties.zone()).thenReturn(ZONE);
    lenient().when(salesProperties.getReturnWindowDays()).thenReturn(30);
    lenient()
        .when(
            cashbookService.executeOnce(
                anyString(),
                any(NguoiDung.class),
                any(),
                eq(AdminReturnResponse.CreateResponse.class),
                any()))
        .thenAnswer(
            invocation -> {
              Supplier<AdminReturnResponse.CreateResponse> operation = invocation.getArgument(4);
              return operation.get();
            });
    lenient()
        .when(returnRepository.saveAndFlush(any()))
        .thenAnswer(
            invocation -> {
              PhieuTraHang slip = invocation.getArgument(0);
              if (slip.getId() == null) {
                slip.setId(nextSlipId.getAndIncrement());
                slip.setNgayTao(LocalDateTime.now(ZONE).withNano(0));
              }
              return slip;
            });
    lenient()
        .when(returnLineRepository.saveAllAndFlush(any()))
        .thenAnswer(
            invocation -> {
              List<ChiTietTraHang> lines = invocation.getArgument(0);
              for (var line : lines) {
                line.setId(nextLineId.getAndIncrement());
              }
              return lines;
            });
  }

  @AfterEach
  void createDoesNotReceiveStockOrPayMoney() {
    verifyNoInteractions(
        deliveryRepository, cashRepository, cashTypeRepository, returnInventoryService);
    verify(cashbookService, never()).createAutomatic(any());
    verify(orderRepository, never()).save(any());
    verify(orderRepository, never()).saveAndFlush(any());
    verify(orderLineRepository, never()).save(any());
    verify(warrantyDeviceRepository, never()).save(any());
    verify(serialRepository, never()).save(any());
  }

  @Test
  void f01CreatesGuestPartialReturnWithContactCreatorAndPolicyEvidence() {
    DonHang order = order(1001L, "2090000", "0");
    ChiTietDonHang line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    stubDevices(order, List.of(line), List.of(device(801L, line), device(802L, line)));

    var envelope =
        new AdminReturnController(service).create(KEY, request(1001L, selection(2001L, 1)), actor);
    assertEquals(201, envelope.getStatus());
    assertEquals("Tạo phiếu trả thành công", envelope.getMessage());
    var result = envelope.getData();
    assertSuccess(result, 1001L, "1045000");
    assertLine(result.getChiTietTra().getFirst(), 2001L, 1, "1045000", "1045000", "0");
    assertEquals("TH000300", result.getMaTraHang());
    assertEquals(300L, result.getId());
    assertNull(result.getKhachHangId());
    var captor = org.mockito.ArgumentCaptor.forClass(PhieuTraHang.class);
    verify(returnRepository, times(2)).saveAndFlush(captor.capture());
    var saved = captor.getValue();
    assertEquals(actor, saved.getNguoiTao());
    assertEquals("Không còn nhu cầu", saved.getLyDoTra());
    Map<?, ?> policy =
        (Map<?, ?>)
            ReturnSnapshotJson.decode(saved.getDuLieuNhanHang()).get("kiem_tra_chinh_sach_khi_lap");
    assertEquals(true, policy.get("du_dieu_kien"));
    assertEquals(7L, ((Number) policy.get("nguoi_xac_minh_id")).longValue());
    assertEquals(30, policy.get("thoi_han_tra_ngay"));
    assertTrue(policy.containsKey("ngay_khach_thuc_nhan"));
    assertTrue(policy.containsKey("thoi_diem_xac_minh"));
    var locked =
        inOrder(orderRepository, orderLineRepository, returnOrderRepository, returnLineRepository);
    locked.verify(orderRepository).findByIdForUpdate(1001L);
    locked.verify(orderLineRepository).findByDonHangIdForUpdate(1001L);
    locked
        .verify(returnOrderRepository)
        .findOrderLineIdsWithOpenWarranties(Set.of(2001L), TrangThaiBaoHanh.HOAN_TAT);
    locked
        .verify(returnOrderRepository)
        .findOpenLegacyWarrantyVariantIds(1001L, TrangThaiBaoHanh.HOAN_TAT);
    locked.verify(returnLineRepository).sumReturnedQuantityByOrder(1001L, RELEASED);
    assertEquals(TrangThaiDonHang.HOAN_THANH, order.getTrangThaiDonHang());
    assertEquals(TrangThaiXuatKho.DA_XUAT_KHO, order.getTrangThaiXuatKho());
  }

  @Test
  void f02CreatesAllPaidAndGiftLinesAndKeepsTheGiftAtZero() {
    DonHang order = order(1004L, "1045000", "0");
    ChiTietDonHang paid = line(4001L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", "1045000");
    ChiTietDonHang gift = line(4002L, order, 301L, LoaiSanPham.DON, 1, true, "0", "0");
    stubOrder(order, List.of(paid, gift));
    stubDevices(order, List.of(paid, gift), List.of(device(1101L, paid), device(1102L, gift)));
    var result =
        service.create(request(1004L, selection(4001L, 1), selection(4002L, 1)), KEY, actor);
    assertSuccess(result, 1004L, "1045000");
    assertEquals(2, result.getChiTietTra().size());
    assertLine(result.getChiTietTra().get(0), 4001L, 1, "1045000", "1045000", "0");
    assertLine(result.getChiTietTra().get(1), 4002L, 1, "0", "0", "0");
    assertTrue(
        !result.getChiTietTra().get(0).getId().equals(result.getChiTietTra().get(1).getId()));
  }

  @Test
  void customerComesFromThePurchaseWhileContactRemainsTheSubmittedSnapshot() {
    DonHang order = order(1001L, "2090000", "0");
    order.setKhachHang(NguoiDung.builder().id(42L).build());
    var line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    stubDevices(order, List.of(line), List.of(device(801L, line), device(802L, line)));
    var result = service.create(request(1001L, selection(2001L, 1)), KEY, actor);
    assertEquals(42L, result.getKhachHangId());
    assertEquals("Nguyễn Văn An", result.getTenNguoiLienHe());
    var captor = org.mockito.ArgumentCaptor.forClass(PhieuTraHang.class);
    verify(returnRepository, times(2)).saveAndFlush(captor.capture());
    assertEquals(order.getKhachHang(), captor.getValue().getKhachHang());
  }

  @Test
  void f03CreatesFullComboFromItsStoredPaymentAndPhysicalSnapshot() {
    DonHang order = order(1003L, "20900000", "0");
    ChiTietDonHang pc =
        line(3001L, order, 701L, LoaiSanPham.BO_PC, 1, false, "20000000", "20900000");
    pc.setCauHinhDaBan(
        ReturnSnapshotJson.encode(
            Map.of(
                "schema_version",
                1,
                "so_luong_bo",
                1,
                "thanh_phan",
                List.of(
                    Map.of(
                        "phien_ban_id",
                        101,
                        "so_luong_moi_bo",
                        1,
                        "ma_don_vi_vat_ly",
                        List.of("BO-1-RAM-1")),
                    Map.of(
                        "phien_ban_id",
                        102,
                        "so_luong_moi_bo",
                        2,
                        "ma_don_vi_vat_ly",
                        List.of("BO-1-SSD-1", "BO-1-SSD-2"))))));
    var ram = device(1201L, pc);
    ram.setPhienBan(variant(101L, LoaiSanPham.DON));
    var ssd1 = device(1202L, pc);
    ssd1.setPhienBan(variant(102L, LoaiSanPham.DON));
    var ssd2 = device(1203L, pc);
    ssd2.setPhienBan(ssd1.getPhienBan());
    stubOrder(order, List.of(pc));
    stubDevices(order, List.of(pc), List.of(ram, ssd1, ssd2));
    when(warrantyDeviceRepository.countWarrantyHistoryTables()).thenReturn(1L);
    when(warrantyDeviceRepository.findRecordedPhysicalIdentities(List.of(3001L)))
        .thenReturn(
            List.of(
                identity(ram, "BO-1-RAM-1"),
                identity(ssd1, "BO-1-SSD-1"),
                identity(ssd2, "BO-1-SSD-2")));
    when(warrantyDeviceRepository.findCompletedReplacements(
            List.of(3001L), TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(List.of());
    var result = service.create(request(1003L, selection(3001L, 1)), KEY, actor);
    assertSuccess(result, 1003L, "20900000");
    assertLine(result.getChiTietTra().getFirst(), 3001L, 1, "20900000", "20900000", "0");
  }

  @Test
  void f04FinalReturnKeepsUnit33333AndLine33334WithAdjustmentOne() {
    DonHang order = order(1006L, "100000", "0");
    ChiTietDonHang line = line(6001L, order, 101L, LoaiSanPham.DON, 3, false, "120000", "100000");
    stubOrder(order, List.of(line));
    when(returnLineRepository.sumReturnedQuantityByOrder(1006L, RELEASED))
        .thenReturn(List.of(previous(6001L, 2L, "66666")));
    stubDevices(order, List.of(line), List.of(device(1603L, line)));
    var result = service.create(request(1006L, selection(6001L, 1)), KEY, actor);
    assertSuccess(result, 1006L, "33334");
    assertLine(result.getChiTietTra().getFirst(), 6001L, 1, "33333", "33334", "1");
  }

  @Test
  void f05ZeroRefundStillWaitsForReceiptAndCreatesNoCashVoucher() {
    DonHang order = order(1007L, "0", "0");
    ChiTietDonHang line = line(2007L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", "0");
    stubOrder(order, List.of(line));
    stubDevices(order, List.of(line), List.of(device(1701L, line)));
    var result = service.create(request(1007L, selection(2007L, 1)), KEY, actor);
    assertSuccess(result, 1007L, "0");
    assertLine(result.getChiTietTra().getFirst(), 2007L, 1, "0", "0", "0");
  }

  @Test
  void f06ExceededQuantityHasTheExactDocumentedIndexed422() {
    DonHang order = order(1001L, "2090000", "0");
    var line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    var error =
        assertThrows(
            AppException.class,
            () -> service.create(request(1001L, selection(2001L, 3)), KEY, actor));
    assertEquals(ErrorCode.UNPROCESSABLE_ENTITY, error.getErrorCode());
    assertEquals("Số lượng yêu cầu vượt quyền trả còn lại", error.getMessage());
    assertEquals("chi_tiet_tra[0].so_luong", error.getField());
    assertEquals("RETURN_QUANTITY_EXCEEDED", error.getCode());
    assertEquals(
        422, new GlobalExceptionHandler().handleAppException(error).getStatusCode().value());
    verifyNoInteractions(returnRepository, warrantyDeviceRepository, serialRepository);
  }

  @Test
  void f07AnyOpenWarrantyOnThePurchaseLineBlocksCreationWithIndexed409() {
    DonHang order = order(1001L, "2090000", "0");
    var line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    when(returnOrderRepository.findOrderLineIdsWithOpenWarranties(
            Set.of(2001L), TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(List.of(2001L));
    var error =
        assertThrows(
            AppException.class,
            () -> service.create(request(1001L, selection(2001L, 1)), KEY, actor));
    assertEquals(ErrorCode.CONFLICT, error.getErrorCode());
    assertEquals("Dòng mua đang được xử lý bảo hành", error.getMessage());
    assertEquals("chi_tiet_tra[0].chi_tiet_don_hang_id", error.getField());
    assertEquals("ORDER_LINE_WARRANTY_OPEN", error.getCode());
    assertEquals(
        409, new GlobalExceptionHandler().handleAppException(error).getStatusCode().value());
    verifyNoInteractions(returnRepository, warrantyDeviceRepository, serialRepository);
  }

  @Test
  void duplicatePurchaseLinesAreRejectedBeforeAcquiringAnyCreationLock() {
    var error =
        assertThrows(
            AppException.class,
            () ->
                service.create(
                    request(1001L, selection(2001L, 1), selection(2001L, 1)), KEY, actor));
    assertEquals(ErrorCode.INVALID_DATA, error.getErrorCode());
    verifyNoInteractions(orderRepository, orderLineRepository, returnRepository, cashbookService);
  }

  @Test
  void missingContactReasonOrPaymentMethodIsRejectedBeforeWriting() {
    List<java.util.function.Consumer<AdminReturnCreateRequest>> invalidBodies =
        List.of(
            body -> body.setTenNguoiLienHe(" "),
            body -> body.setSdtNguoiLienHe(null),
            body -> body.setLyDoTra(""),
            body -> body.setHinhThucHoanTien(null),
            body -> body.setHinhThucHoanTien("THE"));
    for (var change : invalidBodies) {
      var body = request(1001L, selection(2001L, 1));
      change.accept(body);
      assertEquals(
          ErrorCode.INVALID_DATA,
          assertThrows(AppException.class, () -> service.create(body, KEY, actor)).getErrorCode());
    }
    verifyNoInteractions(orderRepository, orderLineRepository, returnRepository, cashbookService);
  }

  @Test
  void missingOrInvalidIdempotencyKeysAreRejectedBeforeDatabaseAccess() {
    for (String key : new String[] {null, "", "abc", "8f4b6a10"}) {
      assertEquals(
          ErrorCode.INVALID_DATA,
          assertThrows(
                  AppException.class,
                  () -> service.create(request(1001L, selection(2001L, 1)), key, actor))
              .getErrorCode());
    }
    verifyNoInteractions(orderRepository, returnRepository, cashbookService);
  }

  @Test
  void missingActorIsUnauthorizedBeforeAcquiringIdempotency() {
    var error =
        assertThrows(
            AppException.class,
            () -> service.create(request(1001L, selection(2001L, 1)), KEY, null));
    assertEquals(ErrorCode.UNAUTHORIZED, error.getErrorCode());
    verifyNoInteractions(orderRepository, returnRepository, cashbookService);
  }

  @Test
  void aPurchaseLineFromAnotherOrderIsNotFound() {
    DonHang order = order(1001L, "2090000", "0");
    var line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    var error =
        assertThrows(
            AppException.class,
            () -> service.create(request(1001L, selection(4001L, 1)), KEY, actor));
    assertEquals(ErrorCode.NOT_FOUND, error.getErrorCode());
    verifyNoInteractions(returnRepository, warrantyDeviceRepository);
  }

  @Test
  void expiredPurchaseIsRejectedUsingReceiptDate() {
    DonHang order = order(1001L, "2090000", "0");
    order.setNgayHoanThanh(LocalDateTime.now(ZONE).minusDays(31));
    when(orderRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(order));
    var error =
        assertThrows(
            AppException.class,
            () -> service.create(request(1001L, selection(2001L, 1)), KEY, actor));
    assertEquals(ErrorCode.UNPROCESSABLE_ENTITY, error.getErrorCode());
    verifyNoInteractions(returnRepository, orderLineRepository);
  }

  @Test
  void missingHistoricalPaymentIsNotRecomputedFromCurrentPrices() {
    DonHang order = order(1005L, "1000000", "0");
    var line = line(5001L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", null);
    stubOrder(order, List.of(line));
    var error =
        assertThrows(
            AppException.class,
            () -> service.create(request(1005L, selection(5001L, 1)), KEY, actor));
    assertEquals("SALE_PAYMENT_SNAPSHOT_MISSING", error.getCode());
    verifyNoInteractions(returnRepository, warrantyDeviceRepository);
  }

  @Test
  void missingGiftIsRejectedBeforeCreatingAnySlip() {
    DonHang order = order(1004L, "1045000", "0");
    var paid = line(4001L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", "1045000");
    var gift = line(4002L, order, 301L, LoaiSanPham.DON, 1, true, "0", "0");
    stubOrder(order, List.of(paid, gift));
    var error =
        assertThrows(
            AppException.class,
            () -> service.create(request(1004L, selection(4001L, 1)), KEY, actor));
    assertEquals(ErrorCode.UNPROCESSABLE_ENTITY, error.getErrorCode());
    assertEquals("FULL_ORDER_RETURN_REQUIRED", error.getCode());
    verifyNoInteractions(returnRepository, warrantyDeviceRepository);
  }

  @Test
  void legacySerialWarrantyAlsoBlocksThePurchaseLine() {
    DonHang order = order(1001L, "2090000", "0");
    var line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    when(returnOrderRepository.findOpenLegacyWarrantyVariantIds(1001L, TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(List.of(101L));
    var error =
        assertThrows(
            AppException.class,
            () -> service.create(request(1001L, selection(2001L, 1)), KEY, actor));
    assertEquals("ORDER_LINE_WARRANTY_OPEN", error.getCode());
    verifyNoInteractions(returnRepository);
  }

  @Test
  void aSecondRequestRechecksHeldQuantityUnderTheCreationLocks() {
    DonHang order = order(1001L, "2090000", "0");
    var line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    stubDevices(order, List.of(line), List.of(device(801L, line), device(802L, line)));
    when(returnLineRepository.sumReturnedQuantityByOrder(1001L, RELEASED))
        .thenReturn(List.of())
        .thenReturn(List.of(previous(2001L, 2L, "2090000")));
    assertSuccess(
        service.create(request(1001L, selection(2001L, 2)), KEY, actor), 1001L, "2090000");
    var error =
        assertThrows(
            AppException.class,
            () ->
                service.create(
                    request(1001L, selection(2001L, 1)),
                    "0f4b6a10-8632-4c37-8797-b47f371f14fa",
                    actor));
    assertEquals("RETURN_QUANTITY_EXCEEDED", error.getCode());
    verify(orderRepository, times(2)).findByIdForUpdate(1001L);
    verify(orderLineRepository, times(2)).findByDonHangIdForUpdate(1001L);
    verify(returnRepository, times(2)).saveAndFlush(any());
  }

  @Test
  void aDetailWriteFailurePropagatesOutOfTheCreationTransaction() {
    DonHang order = order(1001L, "2090000", "0");
    var line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    stubDevices(order, List.of(line), List.of(device(801L, line), device(802L, line)));
    doThrow(new org.springframework.dao.DataIntegrityViolationException("simulated detail failure"))
        .when(returnLineRepository)
        .saveAllAndFlush(any());
    assertThrows(
        org.springframework.dao.DataIntegrityViolationException.class,
        () -> service.create(request(1001L, selection(2001L, 1)), KEY, actor));
  }

  @Test
  void anUnverifiedApprovalCannotBypassPolicy() {
    var body = request(1001L, selection(2001L, 1));
    body.setPheDuyetNgoaiLe(Map.of("da_duyet", true));
    assertEquals(
        ErrorCode.UNPROCESSABLE_ENTITY,
        assertThrows(AppException.class, () -> service.create(body, KEY, actor)).getErrorCode());
    verifyNoInteractions(orderRepository, returnRepository, cashbookService);
  }

  private void stubOrder(DonHang order, List<ChiTietDonHang> lines) {
    when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
    lenient().when(orderLineRepository.findByDonHangIdForUpdate(order.getId())).thenReturn(lines);
    lenient()
        .when(returnLineRepository.sumReturnedQuantityByOrder(order.getId(), RELEASED))
        .thenReturn(List.of());
  }

  private void stubDevices(
      DonHang order, List<ChiTietDonHang> lines, List<ThietBiBaoHanh> devices) {
    when(warrantyDeviceRepository.findCurrentDevices(
            lines.stream().map(ChiTietDonHang::getId).toList(), TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(devices);
    when(serialRepository.findCurrentLegacyReturnSerials(
            order.getId(), TrangThaiSerial.DA_BAN, TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(List.of());
  }

  private DonHang order(Long id, String payment, String shipping) {
    return DonHang.builder()
        .id(id)
        .maDonHang("ORD-" + id)
        .trangThaiDonHang(TrangThaiDonHang.HOAN_THANH)
        .trangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN)
        .trangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO)
        .ngayHoanThanh(LocalDateTime.now(ZONE).minusDays(7))
        .tongThanhToan(new BigDecimal(payment).add(new BigDecimal(shipping)))
        .phiGiaoHang(new BigDecimal(shipping))
        .build();
  }

  private PhienBanSanPham variant(Long id, LoaiSanPham type) {
    var product =
        SanPham.builder().id(id + 1000).loaiSanPham(type).tenSanPham("Sản phẩm " + id).build();
    return PhienBanSanPham.builder().id(id).sanPham(product).build();
  }

  private ChiTietDonHang line(
      Long id,
      DonHang order,
      Long variantId,
      LoaiSanPham type,
      int quantity,
      boolean gift,
      String gross,
      String payment) {
    return ChiTietDonHang.builder()
        .id(id)
        .donHang(order)
        .phienBan(variant(variantId, type))
        .soLuong(quantity)
        .laQuaTang(gift)
        .donGia(new BigDecimal(gross).divide(BigDecimal.valueOf(quantity)))
        .thanhTien(new BigDecimal(gross))
        .tienChietKhau(BigDecimal.ZERO)
        .thanhToanDong(payment == null ? null : new BigDecimal(payment))
        .build();
  }

  private ThietBiBaoHanh device(Long id, ChiTietDonHang line) {
    return ThietBiBaoHanh.builder()
        .id(id)
        .maTheoDoi("TB" + id)
        .chiTietDonHang(line)
        .phienBan(line.getPhienBan())
        .build();
  }

  private ThietBiBaoHanhRepository.RecordedPhysicalIdentity identity(
      ThietBiBaoHanh device, String code) {
    return new ThietBiBaoHanhRepository.RecordedPhysicalIdentity() {
      @Override
      public Long getThietBiId() {
        return device.getId();
      }

      @Override
      public Long getChiTietDonHangId() {
        return device.getChiTietDonHang().getId();
      }

      @Override
      public String getMaDonViVatLy() {
        return code;
      }
    };
  }

  private ChiTietTraHangRepository.ReturnedQuantityProjection previous(
      Long lineId, Long quantity, String amount) {
    BigDecimal refundAmount = new BigDecimal(amount);
    return new ChiTietTraHangRepository.ReturnedQuantityProjection() {
      @Override
      public Long getChiTietDonHangId() {
        return lineId;
      }

      @Override
      public Long getSoLuongDaYeuCauTra() {
        return quantity;
      }

      @Override
      public BigDecimal getTongTienDaYeuCauTra() {
        return refundAmount;
      }
    };
  }

  private AdminReturnCreateRequest request(
      Long orderId, AdminReturnCreateRequest.ReturnLine... lines) {
    var request = new AdminReturnCreateRequest();
    request.setDonHangId(orderId);
    request.setTenNguoiLienHe("Nguyễn Văn An");
    request.setSdtNguoiLienHe("0912345678");
    request.setLyDoTra("Không còn nhu cầu");
    request.setHinhThucHoanTien("TIEN_MAT");
    request.setGhiChu("Khách mang đến cửa hàng");
    request.setChiTietTra(List.of(lines));
    return request;
  }

  private AdminReturnCreateRequest.ReturnLine selection(Long lineId, int quantity) {
    var result = new AdminReturnCreateRequest.ReturnLine();
    result.setChiTietDonHangId(lineId);
    result.setSoLuong(quantity);
    return result;
  }

  private void assertSuccess(
      AdminReturnResponse.CreateResponse result, Long orderId, String amount) {
    assertEquals(orderId, result.getDonHangId());
    assertEquals(TrangThaiTraHang.CHO_TIEP_NHAN, result.getTrangThaiTraHang());
    assertEquals("Nguyễn Văn An", result.getTenNguoiLienHe());
    assertEquals("0912345678", result.getSdtNguoiLienHe());
    assertEquals(0, result.getTongTienHoan().compareTo(new BigDecimal(amount)));
    assertTrue(result.getNgayTao() != null);
    assertEquals(7 * 3600, result.getNgayTao().getOffset().getTotalSeconds());
    var body = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(result));
    assertTrue(body.has("don_hang_id"));
    assertTrue(body.has("chi_tiet_tra"));
    assertTrue(body.has("ten_nguoi_lien_he"));
    assertTrue(body.has("sdt_nguoi_lien_he"));
    assertTrue(body.has("ngay_tao"));
  }

  private void assertLine(
      AdminReturnResponse.ReturnLine line,
      Long id,
      int quantity,
      String unit,
      String amount,
      String adjustment) {
    assertTrue(line.getId() != null);
    assertEquals(id, line.getChiTietDonHangId());
    assertEquals(quantity, line.getSoLuong());
    assertEquals(0, new BigDecimal(unit).compareTo(line.getDonGiaHoan()));
    assertEquals(0, new BigDecimal(amount).compareTo(line.getThanhTienHoan()));
    assertEquals(0, new BigDecimal(adjustment).compareTo(line.getDieuChinhLamTron()));
  }
}
