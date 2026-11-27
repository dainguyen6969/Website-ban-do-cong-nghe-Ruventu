package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.order.AdminReturnController;
import com.example.dantruventu.DTO.Request.order.AdminReturnPreviewRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnResponse;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhienBanSanPham;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AdminReturnPreviewTest {

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

  @InjectMocks AdminReturnService service;

  @BeforeEach
  void configurePolicy() {
    lenient().when(salesProperties.zone()).thenReturn(ZONE);
    lenient().when(salesProperties.getReturnWindowDays()).thenReturn(30);
  }

  @AfterEach
  void previewNeverWritesOrAcquiresCreationLocks() {
    verifyNoInteractions(
        returnRepository,
        deliveryRepository,
        cashRepository,
        cashTypeRepository,
        cashbookService,
        returnInventoryService);
    verify(orderRepository, never()).findByIdForUpdate(anyLong());
    verify(orderLineRepository, never()).findByDonHangIdForUpdate(anyLong());
    verify(orderRepository, never()).save(any());
    verify(orderLineRepository, never()).save(any());
    verify(returnLineRepository, never()).saveAllAndFlush(any());
    verify(warrantyDeviceRepository, never()).save(any());
    verify(serialRepository, never()).save(any());
  }

  @Test
  void f01PartialSimpleOrderUsesStoredPayment() {
    DonHang order = order(1001L, "2090000", "0");
    ChiTietDonHang line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    stubDevices(order, List.of(line), List.of(device(801L, line), device(802L, line)));

    var envelope = new AdminReturnController(service).preview(request(1001L, selection(2001L, 1)));
    assertEquals(200, envelope.getStatus());
    assertEquals("Tính thử phiếu trả thành công", envelope.getMessage());
    var result = envelope.getData();
    assertSuccess(result, 1001L, "1045000");
    assertLine(result.getChiTietTra().getFirst(), 2001L, 1, "1045000", "1045000", "0");
  }

  @Test
  void f02FullGiftOrderKeepsGiftAtZero() {
    DonHang order = order(1004L, "1045000", "0");
    ChiTietDonHang paid = line(4001L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", "1045000");
    ChiTietDonHang gift = line(4002L, order, 301L, LoaiSanPham.DON, 1, true, "0", "0");
    stubOrder(order, List.of(paid, gift));
    stubDevices(order, List.of(paid, gift), List.of(device(1101L, paid), device(1102L, gift)));

    var result = service.preview(request(1004L, selection(4001L, 1), selection(4002L, 1)));
    assertSuccess(result, 1004L, "1045000");
    assertEquals(2, result.getChiTietTra().size());
    assertLine(result.getChiTietTra().get(0), 4001L, 1, "1045000", "1045000", "0");
    assertLine(result.getChiTietTra().get(1), 4002L, 1, "0", "0", "0");
  }

  @Test
  void f03FullComboUsesStoredSetPaymentAndRecordedIdentities() {
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

    var result = service.preview(request(1003L, selection(3001L, 1)));
    assertSuccess(result, 1003L, "20900000");
    assertLine(result.getChiTietTra().getFirst(), 3001L, 1, "20900000", "20900000", "0");
  }

  @Test
  void f04LastUnitGetsTheRemainingVndRatherThanTheRoundedUnitPrice() {
    DonHang order = order(1006L, "100000", "0");
    ChiTietDonHang line = line(6001L, order, 101L, LoaiSanPham.DON, 3, false, "120000", "100000");
    stubOrder(order, List.of(line));
    when(returnLineRepository.sumReturnedQuantityByOrder(1006L, RELEASED))
        .thenReturn(List.of(previous(6001L, 2L, "66666")));
    stubDevices(order, List.of(line), List.of(device(1603L, line)));

    var result = service.preview(request(1006L, selection(6001L, 1)));
    assertSuccess(result, 1006L, "33334");
    assertLine(result.getChiTietTra().getFirst(), 6001L, 1, "33333", "33334", "1");
  }

  @Test
  void f05MissingGiftReturnsTheExactDocumentedStructured422() {
    DonHang order = order(1004L, "1045000", "0");
    ChiTietDonHang paid = line(4001L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", "1045000");
    ChiTietDonHang gift = line(4002L, order, 301L, LoaiSanPham.DON, 1, true, "0", "0");
    stubOrder(order, List.of(paid, gift));

    AppException error =
        assertThrows(
            AppException.class, () -> service.preview(request(1004L, selection(4001L, 1))));
    var response = new GlobalExceptionHandler().handleAppException(error);
    assertEquals(422, response.getStatusCode().value());
    Map<?, ?> body = (Map<?, ?>) response.getBody();
    assertEquals("Đơn có quà phải chọn trả toàn bộ hàng đã giao", body.get("message"));
    assertNull(body.get("data"));
    Map<?, ?> detail = (Map<?, ?>) ((List<?>) body.get("errors")).getFirst();
    assertEquals("chi_tiet_tra", detail.get("field"));
    assertEquals("FULL_ORDER_RETURN_REQUIRED", detail.get("code"));
    assertEquals(body.get("message"), detail.get("message"));
    verifyNoInteractions(warrantyDeviceRepository, serialRepository);
  }

  @Test
  void duplicateLinesAre400BeforeAnyDatabaseRead() {
    AppException error =
        assertThrows(
            AppException.class,
            () -> service.preview(request(1001L, selection(2001L, 1), selection(2001L, 1))));
    assertEquals(ErrorCode.INVALID_DATA, error.getErrorCode());
    verifyNoInteractions(orderRepository, orderLineRepository, returnLineRepository);
  }

  @Test
  void aLineFromAnotherOrderIs404() {
    DonHang order = order(1001L, "2090000", "0");
    ChiTietDonHang line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    AppException error =
        assertThrows(
            AppException.class, () -> service.preview(request(1001L, selection(4001L, 1))));
    assertEquals(ErrorCode.NOT_FOUND, error.getErrorCode());
  }

  @Test
  void quantityAlreadyHeldByAnEffectiveReturnCannotBePreviewedAgain() {
    DonHang order = order(1001L, "2090000", "0");
    ChiTietDonHang line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    when(returnLineRepository.sumReturnedQuantityByOrder(1001L, RELEASED))
        .thenReturn(List.of(previous(2001L, 1L, "1045000")));
    AppException error =
        assertThrows(
            AppException.class, () -> service.preview(request(1001L, selection(2001L, 2))));
    assertEquals(ErrorCode.UNPROCESSABLE_ENTITY, error.getErrorCode());
    verifyNoInteractions(warrantyDeviceRepository);
  }

  @Test
  void aLaterPreviewReadsChangesMadeByAnotherRequest() {
    DonHang order = order(1001L, "2090000", "0");
    ChiTietDonHang line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    stubDevices(order, List.of(line), List.of(device(801L, line), device(802L, line)));
    when(returnLineRepository.sumReturnedQuantityByOrder(1001L, RELEASED))
        .thenReturn(List.of())
        .thenReturn(List.of(previous(2001L, 2L, "2090000")));
    assertSuccess(service.preview(request(1001L, selection(2001L, 1))), 1001L, "1045000");
    AppException error =
        assertThrows(
            AppException.class, () -> service.preview(request(1001L, selection(2001L, 1))));
    assertEquals(ErrorCode.UNPROCESSABLE_ENTITY, error.getErrorCode());
    verify(orderRepository, times(2)).findById(1001L);
    verify(returnLineRepository, times(2)).sumReturnedQuantityByOrder(1001L, RELEASED);
  }

  @Test
  void openWarrantyOnASelectedLineIs409() {
    DonHang order = order(1001L, "2090000", "0");
    ChiTietDonHang line = line(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    stubOrder(order, List.of(line));
    when(returnOrderRepository.countOpenWarrantiesForOrderLines(
            Set.of(2001L), TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(1L);
    AppException error =
        assertThrows(
            AppException.class, () -> service.preview(request(1001L, selection(2001L, 1))));
    assertEquals(ErrorCode.CONFLICT, error.getErrorCode());
    assertEquals("ORDER_LINE_WARRANTY_OPEN", error.getCode());
  }

  @Test
  void missingStoredPaymentIs422InsteadOfRepricingTheSale() {
    DonHang order = order(1005L, "1000000", "0");
    ChiTietDonHang line = line(5001L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", null);
    stubOrder(order, List.of(line));
    AppException error =
        assertThrows(
            AppException.class, () -> service.preview(request(1005L, selection(5001L, 1))));
    assertEquals(ErrorCode.UNPROCESSABLE_ENTITY, error.getErrorCode());
    assertEquals("SALE_PAYMENT_SNAPSHOT_MISSING", error.getCode());
  }

  @Test
  void aVerifiedZeroPaymentRemainsAnEligibleZeroRefund() {
    DonHang order = order(1007L, "0", "0");
    ChiTietDonHang line = line(2007L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", "0");
    stubOrder(order, List.of(line));
    stubDevices(order, List.of(line), List.of(device(1701L, line)));
    assertSuccess(service.preview(request(1007L, selection(2007L, 1))), 1007L, "0");
  }

  @Test
  void anUnverifiedApprovalObjectCannotBypassPolicy() {
    var request = request(1001L, selection(2001L, 1));
    request.setPheDuyetNgoaiLe(Map.of("da_duyet", true));
    AppException error = assertThrows(AppException.class, () -> service.preview(request));
    assertEquals(ErrorCode.UNPROCESSABLE_ENTITY, error.getErrorCode());
    verifyNoInteractions(orderRepository);
  }

  private void stubOrder(DonHang order, List<ChiTietDonHang> lines) {
    when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
    when(orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId())).thenReturn(lines);
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

  private AdminReturnPreviewRequest request(
      Long orderId, AdminReturnPreviewRequest.ReturnLine... lines) {
    var request = new AdminReturnPreviewRequest();
    request.setDonHangId(orderId);
    request.setChiTietTra(List.of(lines));
    return request;
  }

  private AdminReturnPreviewRequest.ReturnLine selection(Long lineId, int quantity) {
    var result = new AdminReturnPreviewRequest.ReturnLine();
    result.setChiTietDonHangId(lineId);
    result.setSoLuong(quantity);
    return result;
  }

  private void assertSuccess(
      AdminReturnResponse.PreviewResponse result, Long orderId, String amount) {
    assertEquals(orderId, result.getDonHangId());
    assertTrue(result.isDuDieuKien());
    assertFalse(result.isDaGiuQuyenTra());
    assertTrue(result.isCanKiemTraLaiKhiTao());
    assertEquals(0, result.getTongTienHoan().compareTo(new BigDecimal(amount)));
    var body = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(result));
    assertTrue(body.has("don_hang_id"));
    assertTrue(body.has("chi_tiet_tra"));
    assertTrue(body.has("du_dieu_kien"));
    assertFalse(body.path("da_giu_quyen_tra").asBoolean());
    assertTrue(body.path("can_kiem_tra_lai_khi_tao").asBoolean());
  }

  private void assertLine(
      AdminReturnResponse.PreviewLine line,
      Long id,
      int quantity,
      String unit,
      String amount,
      String adjustment) {
    assertEquals(id, line.getChiTietDonHangId());
    assertEquals(quantity, line.getSoLuong());
    assertEquals(new BigDecimal(unit), line.getDonGiaHoan());
    assertEquals(new BigDecimal(amount), line.getThanhTienHoan());
    assertEquals(new BigDecimal(adjustment), line.getDieuChinhLamTron());
  }
}
