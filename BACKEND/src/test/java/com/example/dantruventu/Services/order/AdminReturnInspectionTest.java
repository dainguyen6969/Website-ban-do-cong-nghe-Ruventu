package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminReturnCancelRequest;
import com.example.dantruventu.DTO.Request.order.AdminReturnHandoverRequest;
import com.example.dantruventu.DTO.Request.order.AdminReturnInspectionRequest;
import com.example.dantruventu.DTO.Request.order.AdminReturnRejectRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnInspectionResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.*;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.documents.DocumentNumberService;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

class AdminReturnInspectionTest {

  private static final String KEY = "8f4b6a10-8632-4c37-8797-b47f371f14fa";
  private static final String KEY2 = "9f4b6a10-8632-4c37-8797-b47f371f14fa";
  private static final OffsetDateTime RECEIVED = OffsetDateTime.parse("2026-10-12T11:30:00+07:00");
  private final PhieuTraHangRepository returns = mock(PhieuTraHangRepository.class);
  private final ChiTietTraHangRepository lines = mock(ChiTietTraHangRepository.class);
  private final ThietBiBaoHanhRepository devices = mock(ThietBiBaoHanhRepository.class);
  private final SoQuyThuChiRepository cash = mock(SoQuyThuChiRepository.class);
  private final LoaiThuChiRepository cashTypes = mock(LoaiThuChiRepository.class);
  private final SalesIdempotencyRepository keys = mock(SalesIdempotencyRepository.class);
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private final DocumentNumberService numbers = mock(DocumentNumberService.class);
  private final OrderEvents events = mock(OrderEvents.class);
  private final SalesProperties properties = new SalesProperties();
  private final ObjectMapper json = new ObjectMapper();
  private final Map<String, SalesIdempotencyRepository.Entry> cached = new HashMap<>();
  private final NguoiDung actor = NguoiDung.builder().id(7L).build();
  private AdminReturnInspectionService service;
  private CashbookService cashbook;
  private PhieuTraHang slip;
  private ThietBiBaoHanh device;

  @BeforeEach
  void setup() {
    cashbook = new CashbookService(cash, cashTypes, keys, json, events, jdbc, numbers);
    service =
        new AdminReturnInspectionService(
            returns, lines, devices, cash, cashbook, properties, events);
    // Exercise the real idempotency code with in-memory storage; no claim of a real DB lock test.
    TransactionSynchronizationManager.setActualTransactionActive(true);
    TransactionSynchronizationManager.setCurrentTransactionReadOnly(false);
    when(keys.acquire(anyString(), anyLong(), anyString()))
        .thenAnswer(
            call -> {
              String key = call.getArgument(0);
              return cached.computeIfAbsent(
                  key,
                  ignored ->
                      new SalesIdempotencyRepository.Entry(
                          call.getArgument(1), call.getArgument(2), null));
            });
    doAnswer(
            call -> {
              String key = call.getArgument(0);
              var previous = cached.get(key);
              cached.put(
                  key,
                  new SalesIdempotencyRepository.Entry(
                      previous.actorId(), previous.requestHash(), call.getArgument(1)));
              return null;
            })
        .when(keys)
        .complete(anyString(), anyString());
    DonHang order =
        DonHang.builder().id(1001L).ngayHoanThanh(LocalDateTime.of(2026, 10, 8, 10, 0)).build();
    var purchase = ChiTietDonHang.builder().id(2001L).donHang(order).soLuong(2).build();
    slip =
        PhieuTraHang.builder()
            .id(300L)
            .donHang(order)
            .maTraHang("TH000300")
            .trangThaiTraHang(TrangThaiTraHang.CHO_TIEP_NHAN)
            .duLieuNhanHang(
                ReturnSnapshotJson.encode(
                    Map.of("kiem_tra_chinh_sach_khi_lap", Map.of("du_dieu_kien", true))))
            .build();
    var line =
        ChiTietTraHang.builder()
            .id(500L)
            .phieuTraHang(slip)
            .chiTietDonHang(purchase)
            .soLuong(1)
            .build();
    device =
        ThietBiBaoHanh.builder()
            .id(801L)
            .chiTietDonHang(purchase)
            .phienBan(PhienBanSanPham.builder().id(101L).build())
            .soSerial(
                SoSerialSanPham.builder()
                    .id(501L)
                    .soSerial("RAM-SN-501")
                    .trangThai(TrangThaiSerial.DA_BAN)
                    .build())
            .build();
    when(returns.findByIdForUpdate(300L)).thenReturn(Optional.of(slip));
    when(lines.findByPhieuTraHang_IdOrderByIdAsc(300L)).thenReturn(List.of(line));
    when(devices.findCurrentDevices(anyCollection(), eq(TrangThaiBaoHanh.HOAN_TAT)))
        .thenReturn(List.of(device));
  }

  @AfterEach
  void cleanup() {
    TransactionSynchronizationManager.clear();
    verify(cash, never()).save(any());
    verify(cash, never()).saveAndFlush(any());
    verify(devices, never()).save(any());
    verify(devices, never()).saveAndFlush(any());
    verifyNoInteractions(cashTypes, jdbc, numbers);
  }

  @Test
  void f01RecordsCustodyAndAuditWithoutAcceptingOrChangingTheSerial() {
    var result = inspect(request());
    assertEquals(TrangThaiTraHang.CHO_TIEP_NHAN, result.trangThaiTraHang());
    assertTrue(result.dangGiuHang());
    assertFalse(result.daNhapKho());
    assertNull(result.phieuChi());
    assertNull(slip.getNgayNhanHang());
    assertNull(slip.getNgayKetThuc());
    assertEquals(RECEIVED, result.ngayTiepNhanThucTe());
    assertEquals(TrangThaiSerial.DA_BAN, device.getSoSerial().getTrangThai());
    var item = result.hangThucNhan().getFirst();
    assertTrue(item.maMucNhan().startsWith("HN-"));
    assertNotNull(UUID.fromString(item.maMucNhan().substring(3)));
    assertEquals(801L, item.thietBiId());
    var data = saved();
    assertEquals(Map.of("du_dieu_kien", true), data.get("kiem_tra_chinh_sach_khi_lap"));
    var event = (Map<?, ?>) ((List<?>) data.get("lich_su_tiep_nhan")).getFirst();
    assertEquals(7L, ((Number) event.get("nguoi_thuc_hien_id")).longValue());
    assertEquals("Nguyễn Văn An", event.get("nguoi_giao"));
    assertEquals(List.of("/uploads/intake.jpg"), event.get("bang_chung_urls"));
    assertTrue(json.writeValueAsString(result).contains("\"phieu_chi\":null"));
    verify(events).changed(1001L, "RETURN_INSPECTED");
  }

  @Test
  void f02WrongParcelKeepsObservedIdentityAndNeverAssignsADevice() {
    var input = unknown();
    input.getHangThucNhan().getFirst().setSoSerial("MA-KHONG-KHOP");
    var result = inspect(input);
    assertNull(result.hangThucNhan().getFirst().thietBiId());
    assertEquals("MA-KHONG-KHOP", result.hangThucNhan().getFirst().soSerial());
    assertTrue(result.dangGiuHang());
    verifyNoInteractions(devices);
    var item = (Map<?, ?>) ((List<?>) saved().get("hang_dang_giu")).getFirst();
    assertNull(item.get("phien_ban_id"));
    assertNull(item.get("so_serial_id"));
  }

  @Test
  void sameKeyReplaysStableCodesAndDoesNotAppendAgain() {
    var first = inspect(request());
    assertEquals(first, inspect(request()));
    verify(returns, times(1)).findByIdForUpdate(300L);
    verify(returns, times(1)).saveAndFlush(slip);
    assertEquals(1, ((List<?>) saved().get("lich_su_tiep_nhan")).size());
  }

  @ParameterizedTest
  @ValueSource(strings = {"person", "time", "identity", "evidence", "conclusion"})
  void changedBodyWithTheSameKeyConflictsWithoutAppending(String part) {
    inspect(unknown());
    var changed = unknown();
    switch (part) {
      case "person" -> changed.setNguoiGiao("Người khác");
      case "time" -> changed.setNgayTiepNhanThucTe(RECEIVED.plusMinutes(1));
      case "identity" -> changed.getHangThucNhan().getFirst().setDauHieuNhanDang("Kiện khác");
      case "evidence" -> changed.setBangChungUrls(List.of("/uploads/other.jpg"));
      case "conclusion" -> changed.setKetQuaKiemTra("Kết quả khác");
    }
    String before = slip.getDuLieuNhanHang();
    assertEquals(
        ErrorCode.CONFLICT,
        assertThrows(AppException.class, () -> inspect(changed)).getErrorCode());
    assertEquals(before, slip.getDuLieuNhanHang());
    verify(returns, times(1)).saveAndFlush(slip);
  }

  @Test
  void aNewReceiptAppendsInsteadOfReplacingEarlierCustodyOrProof() {
    var first = inspect(unknown());
    var next = unknown();
    next.setNgayTiepNhanThucTe(RECEIVED.plusMinutes(5));
    next.getHangThucNhan().getFirst().setDauHieuNhanDang("Kiện thứ hai");
    var second = service.inspect(300L, KEY2, next, actor);
    assertNotEquals(
        first.hangThucNhan().getFirst().maMucNhan(), second.hangThucNhan().getFirst().maMucNhan());
    assertEquals(RECEIVED, second.ngayTiepNhanThucTe());
    assertEquals(2, ((List<?>) saved().get("hang_dang_giu")).size());
    assertEquals(2, ((List<?>) saved().get("lich_su_tiep_nhan")).size());
    assertEquals(
        first.hangThucNhan().getFirst().maMucNhan(),
        ((Map<?, ?>) ((List<?>) saved().get("hang_dang_giu")).getFirst()).get("ma_muc_nhan"));
  }

  @Test
  void duplicateVerifiedDeviceIsNotRecordedAsAnotherParcel() {
    inspect(request());
    String before = slip.getDuLieuNhanHang();
    var error =
        assertThrows(AppException.class, () -> service.inspect(300L, KEY2, request(), actor));
    assertEquals("RETURN_DEVICE_ALREADY_HELD", error.getCode());
    assertEquals(before, slip.getDuLieuNhanHang());
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiTraHang.class,
      names = {"DA_NHAN_HANG", "DA_HOAN_TIEN", "HOAN_TAT"})
  void f03AcceptedStatesCannotBeEditedThroughInspection(TrangThaiTraHang status) {
    slip.setTrangThaiTraHang(status);
    var error = assertThrows(AppException.class, () -> inspect(request()));
    assertEquals("RETURN_ALREADY_ACCEPTED", error.getCode());
    assertEquals("id", error.getField());
    verify(returns, never()).saveAndFlush(any());
  }

  @ParameterizedTest
  @EnumSource(
      value = TrangThaiTraHang.class,
      names = {"HUY", "TU_CHOI", "CHO_TRA_KHACH"})
  void onlyPendingSlipsAllowIntake(TrangThaiTraHang status) {
    slip.setTrangThaiTraHang(status);
    assertEquals(
        "RETURN_INSPECTION_NOT_ALLOWED",
        assertThrows(AppException.class, () -> inspect(request())).getCode());
  }

  @Test
  void inconsistentAcceptedTimestampAndExpenseBothBlockIntake() {
    slip.setNgayNhanHang(RECEIVED.toLocalDateTime());
    assertEquals(
        "RETURN_ALREADY_ACCEPTED",
        assertThrows(AppException.class, () -> inspect(request())).getCode());
    slip.setNgayNhanHang(null);
    when(cash.findByBusinessKey("CHI-TH-300")).thenReturn(Optional.of(new SoQuyThuChi()));
    assertEquals(
        "RETURN_ALREADY_ACCEPTED",
        assertThrows(AppException.class, () -> inspect(request())).getCode());
  }

  @ParameterizedTest
  @ValueSource(strings = {"unknown-id", "wrong-line", "wrong-serial", "multiple-device-quantity"})
  void aSuppliedDeviceIdMustActuallyMatchCurrentDeliveredIdentity(String variant) {
    var input = request();
    switch (variant) {
      case "unknown-id" -> input.getHangThucNhan().getFirst().setThietBiId(999L);
      case "wrong-line" -> device.setChiTietDonHang(ChiTietDonHang.builder().id(999L).build());
      case "wrong-serial" -> input.getHangThucNhan().getFirst().setSoSerial("SAI-SERIAL");
      case "multiple-device-quantity" -> input.getHangThucNhan().getFirst().setSoLuong(2);
    }
    assertEquals(
        "CURRENT_DEVICE_IDENTIFICATION_INVALID",
        assertThrows(AppException.class, () -> inspect(input)).getCode());
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void deviceWithoutSerialCanStillBeHeldWithPhysicalIdentification() {
    device.setSoSerial(null);
    var input = request();
    input.getHangThucNhan().getFirst().setSoSerial(null);
    assertEquals(801L, inspect(input).hangThucNhan().getFirst().thietBiId());
  }

  @Test
  void aForeignReturnLineIs404AndNothingIsWritten() {
    var input = request();
    input.getHangThucNhan().getFirst().setChiTietTraHangId(501L);
    assertEquals(
        "RETURN_LINE_NOT_FOUND", assertThrows(AppException.class, () -> inspect(input)).getCode());
    verify(returns, never()).saveAndFlush(any());
  }

  @Test
  void aMissingSlipIs404() {
    when(returns.findByIdForUpdate(300L)).thenReturn(Optional.empty());
    assertEquals(
        ErrorCode.NOT_FOUND,
        assertThrows(AppException.class, () -> inspect(request())).getErrorCode());
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {"not-a-uuid", " ", "8f4b6a10-8632-4c37-8797-b47f371f14fa-extra"})
  void malformedKeyIs400BeforeLocking(String key) {
    assertEquals(
        ErrorCode.INVALID_DATA,
        assertThrows(AppException.class, () -> service.inspect(300L, key, request(), actor))
            .getErrorCode());
    verifyNoInteractions(returns);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "no-time",
        "future",
        "before-delivery",
        "no-person",
        "no-conclusion",
        "no-items",
        "no-proof",
        "blank-proof",
        "no-identity",
        "no-quantity",
        "no-condition",
        "null-accessories",
        "blank-accessory"
      })
  void invalidReceiptsNeverWrite(String variant) {
    var input = unknown();
    switch (variant) {
      case "no-time" -> input.setNgayTiepNhanThucTe(null);
      case "future" -> input.setNgayTiepNhanThucTe(OffsetDateTime.now().plusDays(1));
      case "before-delivery" -> input.setNgayTiepNhanThucTe(RECEIVED.minusMonths(1));
      case "no-person" -> input.setNguoiGiao(" ");
      case "no-conclusion" -> input.setKetQuaKiemTra(null);
      case "no-items" -> input.setHangThucNhan(List.of());
      case "no-proof" -> input.setBangChungUrls(List.of());
      case "blank-proof" -> input.setBangChungUrls(Collections.singletonList(null));
      case "no-identity" -> input.getHangThucNhan().getFirst().setDauHieuNhanDang(" ");
      case "no-quantity" -> input.getHangThucNhan().getFirst().setSoLuong(null);
      case "no-condition" -> input.getHangThucNhan().getFirst().setTinhTrang(" ");
      case "null-accessories" -> input.getHangThucNhan().getFirst().setPhuKien(null);
      case "blank-accessory" -> input.getHangThucNhan().getFirst().setPhuKien(List.of(" "));
    }
    String before = slip.getDuLieuNhanHang();
    assertEquals(
        ErrorCode.INVALID_DATA,
        assertThrows(AppException.class, () -> inspect(input)).getErrorCode());
    assertEquals(before, slip.getDuLieuNhanHang());
    verify(returns, never()).saveAndFlush(any());
    verify(keys, never()).complete(anyString(), anyString());
  }

  @ParameterizedTest
  @ValueSource(strings = {"HUY", "TU_CHOI"})
  void intakeThenEndRequestThenFullHandoverPreservesAllAudits(String purpose) {
    var received = inspect(unknown());
    if (purpose.equals("HUY")) {
      var cancel = new AdminReturnCancelRequest();
      cancel.setLyDo("Khách yêu cầu lấy lại hàng");
      new AdminReturnCancelService(returns, cash, cashbook, properties, events)
          .cancel(300L, KEY, cancel, actor);
    } else {
      var reject = new AdminReturnRejectRequest();
      reject.setLyDo("Không đúng hàng");
      reject.setCanCu("Biên bản đối chiếu");
      new AdminReturnRejectService(returns, cash, cashbook, properties, events)
          .reject(300L, KEY, reject, actor);
    }
    assertEquals(TrangThaiTraHang.CHO_TRA_KHACH, slip.getTrangThaiTraHang());
    var handover = new AdminReturnHandoverRequest();
    handover.setXacNhanTraDuHang(true);
    handover.setTenNguoiNhan("Nguyễn Văn An");
    handover.setSdtNguoiNhan("0912345678");
    handover.setNgayBanGiao(RECEIVED.plusHours(1));
    handover.setBangChungUrls(List.of("/uploads/handover.jpg"));
    var item = new AdminReturnHandoverRequest.Item();
    item.setMaMucNhan(received.hangThucNhan().getFirst().maMucNhan());
    item.setSoLuong(1);
    item.setTinhTrang("Đã đối chiếu đủ");
    item.setPhuKien(List.of("Hộp"));
    handover.setHangBanGiao(List.of(item));
    var result =
        new AdminReturnHandoverService(returns, cash, cashbook, properties, events)
            .handover(300L, KEY, handover, actor);
    assertEquals(TrangThaiTraHang.valueOf(purpose), result.trangThaiTraHang());
    assertEquals(List.of(), saved().get("hang_dang_giu"));
    assertEquals(1, ((List<?>) saved().get("hang_da_ban_giao")).size());
    assertEquals(1, ((List<?>) saved().get("lich_su_tiep_nhan")).size());
    assertNotNull(saved().get(purpose.equals("HUY") ? "yeu_cau_huy" : "yeu_cau_tu_choi"));
    assertNull(slip.getNgayNhanHang());
  }

  private AdminReturnInspectionResponse inspect(AdminReturnInspectionRequest input) {
    return service.inspect(300L, KEY, input, actor);
  }

  private Map<String, Object> saved() {
    return ReturnSnapshotJson.decode(slip.getDuLieuNhanHang());
  }

  private AdminReturnInspectionRequest unknown() {
    var input = request();
    input.getHangThucNhan().getFirst().setThietBiId(null);
    input.getHangThucNhan().getFirst().setSoSerial(null);
    return input;
  }

  private AdminReturnInspectionRequest request() {
    var input = new AdminReturnInspectionRequest();
    input.setNgayTiepNhanThucTe(RECEIVED);
    input.setNguoiGiao("Nguyễn Văn An");
    input.setKetQuaKiemTra("Chưa kết luận nhận trả");
    input.setBangChungUrls(List.of("/uploads/intake.jpg"));
    var item = new AdminReturnInspectionRequest.Item();
    item.setChiTietTraHangId(500L);
    item.setThietBiId(801L);
    item.setSoLuong(1);
    item.setSoSerial("RAM-SN-501");
    item.setDauHieuNhanDang("Tem cửa hàng");
    item.setTinhTrang("Đang kiểm tra");
    item.setPhuKien(List.of("Hộp"));
    input.setHangThucNhan(List.of(item));
    return input;
  }
}
