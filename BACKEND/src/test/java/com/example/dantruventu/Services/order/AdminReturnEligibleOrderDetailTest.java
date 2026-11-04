package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.order.AdminReturnController;
import com.example.dantruventu.DTO.Response.order.AdminReturnResponse;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.example.dantruventu.Error.AppException;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AdminReturnEligibleOrderDetailTest {

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

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
    when(salesProperties.zone()).thenReturn(ZONE);
    when(salesProperties.getReturnWindowDays()).thenReturn(30);
  }

  @Test
  void f01SimpleOrderKeepsStoredPaymentAndTwoCurrentDevices() {
    DonHang order = eligibleOrder(1001L, "2090000", "0");
    order.setTongTienHang(new BigDecimal("2000000"));
    order.setTienChietKhau(new BigDecimal("100000"));
    ChiTietDonHang line =
        orderLine(2001L, order, 101L, LoaiSanPham.DON, 2, false, "2000000", "2090000");
    line.setTienChietKhau(new BigDecimal("100000"));
    var first =
        device(
            801L,
            "TB000801",
            line,
            line.getPhienBan(),
            serial(501L, "RAM-SN-501", order, line.getPhienBan()));
    var second =
        device(
            802L,
            "TB000802",
            line,
            line.getPhienBan(),
            serial(502L, "RAM-SN-502", order, line.getPhienBan()));
    stubEligible(order, List.of(line));
    stubHistoryAndDevices(order, List.of(line), List.of(first, second));

    var envelope = new AdminReturnController(service).getEligibleOrderDetail(1001L);
    assertEquals(200, envelope.getStatus());
    assertEquals("Lấy dữ liệu lập phiếu trả thành công", envelope.getMessage());
    var response = envelope.getData();

    assertEquals("ORD-001", response.getDonHang().getMaDonHang());
    assertNull(response.getDonHang().getKhachHangId());
    assertSuccessContract(response);
    assertTrue(response.isDuDieuKienLapPhieu());
    assertTrue(response.getLyDoChan().isEmpty());
    assertFalse(response.isChiDuocTraToanBo());
    var item = response.getChiTiet().getFirst();
    assertEquals(2, item.getSoLuongDaGiao());
    assertEquals(0L, item.getSoLuongDaYeuCauTra());
    assertEquals(2L, item.getSoLuongConDuocTra());
    assertEquals(new BigDecimal("2090000"), item.getThanhToanDong());
    assertEquals(new BigDecimal("2090000"), item.getSoTienConDuocHoan());
    assertEquals(new BigDecimal("1045000.00"), item.getDonGiaHoanDuKien());
    assertEquals(
        List.of("TB000801", "TB000802"),
        item.getThietBiHienHanh().stream().map(d -> d.getMaTheoDoi()).toList());
  }

  @Test
  void f02GiftOrderRequiresFullReturnAndGiftRefundIsZero() {
    DonHang order = eligibleOrder(1004L, "1045000", "0");
    ChiTietDonHang paid =
        orderLine(4001L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", "1045000");
    paid.setTienChietKhau(new BigDecimal("50000"));
    ChiTietDonHang gift = orderLine(4002L, order, 301L, LoaiSanPham.DON, 1, true, "0", "0");
    var ram =
        device(
            1101L,
            "TB001101",
            paid,
            paid.getPhienBan(),
            serial(601L, "RAM-SN-601", order, paid.getPhienBan()));
    var mouse = device(1102L, "TB001102", gift, gift.getPhienBan(), null);
    stubEligible(order, List.of(paid, gift));
    stubHistoryAndDevices(order, List.of(paid, gift), List.of(ram, mouse));

    var response = service.getEligibleOrderDetail(1004L);

    assertTrue(response.isDuDieuKienLapPhieu());
    assertTrue(response.isChiDuocTraToanBo());
    assertSuccessContract(response);
    assertEquals(2, response.getChiTiet().size());
    var giftResponse = response.getChiTiet().get(1);
    assertTrue(giftResponse.isLaQuaTang());
    assertEquals(BigDecimal.ZERO.setScale(0), giftResponse.getThanhToanDong());
    assertEquals(BigDecimal.ZERO.setScale(0), giftResponse.getSoTienConDuocHoan());
    assertEquals(BigDecimal.ZERO.setScale(2), giftResponse.getDonGiaHoanDuKien());
    assertNull(giftResponse.getThietBiHienHanh().getFirst().getSoSerialId());
    JsonNode giftJson = json(giftResponse).path("thiet_bi_hien_hanh").get(0);
    assertTrue(giftJson.has("so_serial_id"));
    assertTrue(giftJson.path("so_serial_id").isNull());
    assertTrue(giftJson.has("so_serial"));
    assertTrue(giftJson.path("so_serial").isNull());
    assertEquals("TB001102", giftResponse.getThietBiHienHanh().getFirst().getMaTheoDoi());
  }

  @Test
  void f03ComboReadsRecordedRamAndTwoSsdUnitsWithoutUsingCurrentCatalog() {
    DonHang order = eligibleOrder(1003L, "20900000", "0");
    ChiTietDonHang combo =
        orderLine(3001L, order, 701L, LoaiSanPham.BO_PC, 1, false, "20000000", "20900000");
    combo.setTienChietKhau(new BigDecimal("1000000"));
    Map<String, Object> snapshot =
        Map.of(
            "schema_version", 1,
            "so_luong_bo", 1,
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
                        List.of("BO-1-SSD-1", "BO-1-SSD-2"))));
    combo.setCauHinhDaBan(ReturnSnapshotJson.encode(snapshot));
    PhienBanSanPham ram = variant(101L, LoaiSanPham.DON);
    PhienBanSanPham ssd = variant(102L, LoaiSanPham.DON);
    var ramDevice = device(1201L, "TB001201", combo, ram, serial(701L, "RAM-PC-701", order, ram));
    var ssd1 = device(1202L, "TB001202", combo, ssd, null);
    var ssd2 = device(1203L, "TB001203", combo, ssd, null);
    stubEligible(order, List.of(combo));
    stubHistoryAndDevices(order, List.of(combo), List.of(ramDevice, ssd1, ssd2));
    when(warrantyDeviceRepository.countWarrantyHistoryTables()).thenReturn(1L);
    var identities =
        List.of(
            physicalIdentity(ramDevice, "BO-1-RAM-1"),
            physicalIdentity(ssd1, "BO-1-SSD-1"),
            physicalIdentity(ssd2, "BO-1-SSD-2"));
    when(warrantyDeviceRepository.findRecordedPhysicalIdentities(List.of(3001L)))
        .thenReturn(identities);
    when(warrantyDeviceRepository.findCompletedReplacements(
            List.of(3001L), TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(List.of());
    // Defensive deduplication also protects against overlapping legacy data.
    when(serialRepository.findCurrentLegacyReturnSerials(
            1003L, TrangThaiSerial.DA_BAN, TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(List.of(ramDevice.getSoSerial()));

    var response = service.getEligibleOrderDetail(1003L);

    assertTrue(response.isDuDieuKienLapPhieu());
    assertTrue(response.isChiDuocTraToanBo());
    var item = response.getChiTiet().getFirst();
    assertSuccessContract(response);
    assertEquals(snapshot, item.getCauHinhDaBan());
    assertEquals(
        "BO-1-SSD-2",
        json(item)
            .path("cau_hinh_da_ban")
            .path("thanh_phan")
            .get(1)
            .path("ma_don_vi_vat_ly")
            .get(1)
            .asText());
    assertEquals(3, item.getThietBiHienHanh().size());
    assertEquals(1L, item.getSoLuongConDuocTra());
    assertEquals(new BigDecimal("20900000"), item.getSoTienConDuocHoan());
    assertEquals(
        List.of("BO-1-RAM-1", "BO-1-SSD-1", "BO-1-SSD-2"),
        item.getThietBiHienHanh().stream().map(d -> d.getMaDonViVatLy()).toList());
  }

  @Test
  void f04MissingPaymentHistoryReturnsTheDocumentedStructured422() {
    DonHang order = eligibleOrder(1005L, "1000000", "0");
    ChiTietDonHang line = orderLine(5001L, order, 101L, LoaiSanPham.DON, 1, false, "1000000", null);
    stubEligible(order, List.of(line));
    when(returnLineRepository.sumReturnedQuantityByOrder(
            1005L, Set.of(TrangThaiTraHang.HUY, TrangThaiTraHang.TU_CHOI)))
        .thenReturn(List.of());

    AppException error =
        assertThrows(AppException.class, () -> service.getEligibleOrderDetail(1005L));

    assertStructuredError(
        error,
        422,
        "SALE_PAYMENT_SNAPSHOT_MISSING",
        "Cần xác minh tiền dòng của giao dịch mua trước khi lập phiếu trả");
    verifyNoInteractions(warrantyDeviceRepository, serialRepository);
  }

  @Test
  void f05OpenWarrantyReturnsTheDocumentedStructured409() {
    DonHang order = eligibleOrder(1001L, "2090000", "0");
    when(orderRepository.findById(1001L)).thenReturn(Optional.of(order));
    when(returnOrderRepository.countOpenWarranties(1001L, TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(1L);

    AppException error =
        assertThrows(AppException.class, () -> service.getEligibleOrderDetail(1001L));

    assertStructuredError(
        error, 409, "ORDER_LINE_WARRANTY_OPEN", "Dòng mua đang được xử lý bảo hành");
    verifyNoInteractions(orderLineRepository, warrantyDeviceRepository, serialRepository);
  }

  private void assertStructuredError(AppException error, int status, String code, String message) {
    var response =
        new com.example.dantruventu.Error.GlobalExceptionHandler().handleAppException(error);
    assertEquals(status, response.getStatusCode().value());
    JsonNode body = json(response.getBody());
    assertEquals(message, body.path("message").asText());
    assertEquals(1, body.path("errors").size());
    assertEquals(message, body.path("errors").get(0).path("message").asText());
    assertTrue(body.has("data"));
    assertTrue(body.path("data").isNull());
    assertEquals(code, body.path("errors").get(0).path("code").asText());
    assertEquals("orderId", body.path("errors").get(0).path("field").asText());
  }

  private JsonNode json(Object value) {
    ObjectMapper mapper = new ObjectMapper();
    return mapper.readTree(mapper.writeValueAsString(value));
  }

  private void assertSuccessContract(AdminReturnResponse.EligibleOrderDetailResponse response) {
    JsonNode body = json(response);
    assertTrue(body.has("don_hang"));
    assertTrue(body.path("don_hang").has("khach_hang_id"));
    assertTrue(body.path("don_hang").path("khach_hang_id").isNull());
    assertTrue(body.has("du_dieu_kien_lap_phieu"));
    assertTrue(body.has("ly_do_chan"));
    assertTrue(body.path("ly_do_chan").isArray());
    assertTrue(body.has("chi_duoc_tra_toan_bo"));
    assertTrue(body.path("chi_tiet").isArray());
    assertFalse(body.has("san_pham"));
    assertTrue(body.path("chi_tiet").get(0).has("so_luong_da_giao"));
    assertFalse(body.path("chi_tiet").get(0).has("so_luong_mua"));
  }

  private void stubEligible(DonHang order, List<ChiTietDonHang> lines) {
    when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
    when(returnOrderRepository.countOpenWarranties(order.getId(), TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(0L);
    when(orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId())).thenReturn(lines);
  }

  private void stubHistoryAndDevices(
      DonHang order, List<ChiTietDonHang> lines, List<ThietBiBaoHanh> devices) {
    when(returnLineRepository.sumReturnedQuantityByOrder(
            order.getId(), Set.of(TrangThaiTraHang.HUY, TrangThaiTraHang.TU_CHOI)))
        .thenReturn(List.of());
    when(warrantyDeviceRepository.findCurrentDevices(
            lines.stream().map(ChiTietDonHang::getId).toList(), TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(devices);
    when(serialRepository.findCurrentLegacyReturnSerials(
            order.getId(), TrangThaiSerial.DA_BAN, TrangThaiBaoHanh.HOAN_TAT))
        .thenReturn(List.of());
  }

  private DonHang eligibleOrder(Long id, String totalPayment, String shippingFee) {
    return DonHang.builder()
        .id(id)
        .maDonHang(String.format("ORD-%03d", id - 1000))
        .trangThaiDonHang(TrangThaiDonHang.HOAN_THANH)
        .trangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN)
        .trangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO)
        .ngayHoanThanh(LocalDateTime.now(ZONE).minusDays(7))
        .tongTienHang(new BigDecimal(totalPayment))
        .tienChietKhau(BigDecimal.ZERO)
        .phiGiaoHang(new BigDecimal(shippingFee))
        .tongThanhToan(new BigDecimal(totalPayment).add(new BigDecimal(shippingFee)))
        .build();
  }

  private PhienBanSanPham variant(Long id, LoaiSanPham type) {
    SanPham product =
        SanPham.builder()
            .id(id + 1000)
            .maSanPham("SP-" + id)
            .tenSanPham("Sản phẩm " + id)
            .loaiSanPham(type)
            .build();
    return PhienBanSanPham.builder().id(id).sanPham(product).tenPhienBan("Phiên bản " + id).build();
  }

  private ChiTietDonHang orderLine(
      Long id,
      DonHang order,
      Long variantId,
      LoaiSanPham type,
      int quantity,
      boolean gift,
      String lineTotal,
      String linePayment) {
    BigDecimal amount = new BigDecimal(lineTotal);
    return ChiTietDonHang.builder()
        .id(id)
        .donHang(order)
        .phienBan(variant(variantId, type))
        .soLuong(quantity)
        .donGia(amount.divide(BigDecimal.valueOf(quantity)))
        .thanhTien(amount)
        .laQuaTang(gift)
        .tienChietKhau(BigDecimal.ZERO)
        .thanhToanDong(linePayment == null ? null : new BigDecimal(linePayment))
        .build();
  }

  private SoSerialSanPham serial(Long id, String code, DonHang order, PhienBanSanPham variant) {
    return SoSerialSanPham.builder()
        .id(id)
        .soSerial(code)
        .donHang(order)
        .phienBan(variant)
        .trangThai(TrangThaiSerial.DA_BAN)
        .build();
  }

  private ThietBiBaoHanh device(
      Long id, String code, ChiTietDonHang line, PhienBanSanPham variant, SoSerialSanPham serial) {
    return ThietBiBaoHanh.builder()
        .id(id)
        .maTheoDoi(code)
        .chiTietDonHang(line)
        .phienBan(variant)
        .soSerial(serial)
        .build();
  }

  private ThietBiBaoHanhRepository.RecordedPhysicalIdentity physicalIdentity(
      ThietBiBaoHanh device, String code) {
    var identity = mock(ThietBiBaoHanhRepository.RecordedPhysicalIdentity.class);
    when(identity.getThietBiId()).thenReturn(device.getId());
    when(identity.getChiTietDonHangId()).thenReturn(device.getChiTietDonHang().getId());
    when(identity.getMaDonViVatLy()).thenReturn(code);
    return identity;
  }
}
