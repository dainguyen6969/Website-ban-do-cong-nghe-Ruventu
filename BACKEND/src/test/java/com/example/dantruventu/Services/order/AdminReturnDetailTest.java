package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Controller.order.AdminReturnController;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuTraHang;
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
import com.example.dantruventu.Repository.order.ThietBiBaoHanhRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AdminReturnDetailTest {

  private static final ObjectMapper JSON = new ObjectMapper();
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
  void configureTimeZone() {
    lenient().when(salesProperties.zone()).thenReturn(ZONE);
  }

  @AfterEach
  void readingNeverChangesRightsStockCashOrStoredRecords() {
    verify(returnRepository, never()).save(any());
    verify(returnRepository, never()).saveAndFlush(any());
    verify(returnLineRepository, never()).save(any());
    verify(returnLineRepository, never()).saveAllAndFlush(any());
    verifyNoInteractions(
        returnOrderRepository,
        warrantyDeviceRepository,
        orderRepository,
        orderLineRepository,
        serialRepository,
        deliveryRepository,
        cashRepository,
        cashTypeRepository,
        cashbookService,
        returnInventoryService);
  }

  @ParameterizedTest(name = "TH06 {0}: exact documented response")
  @ValueSource(strings = {"F01", "F02", "F03", "F04", "F05", "F06", "F07"})
  void returnsEachDocumentedStateWithExplicitNullsAndSavedSnapshots(String caseId) {
    Map<String, Object> expected = fixture(caseId);
    Map<String, Object> data = object(expected.get("data"));
    PhieuTraHang saved = stub(data);
    String before = JSON.writeValueAsString(saved.getDuLieuNhanHang());

    var envelope = new AdminReturnController(service).getReturnDetail(saved.getId());

    assertJson(expected, JSON.readValue(JSON.writeValueAsString(envelope), Map.class));
    assertEquals(before, JSON.writeValueAsString(saved.getDuLieuNhanHang()));
    assertEquals(data.get("trang_thai_tra_hang"), saved.getTrangThaiTraHang().name());
    verify(returnLineRepository).findSavedDetailLines(saved.getId());
    verify(returnRepository).findRefundExpenseByReturnId(saved.getId());
  }

  @Test
  void aReceiptDateAloneDoesNotProveTheStoreStillHoldsCustomerGoods() {
    Map<String, Object> data = data("F05");
    data.put("hang_dang_giu", List.of());
    PhieuTraHang saved = stub(data);

    var result = service.getReturnDetail(saved.getId());

    assertNotNull(result.getNgayTiepNhanThucTe());
    assertEquals(List.of(), result.getHangDangGiu());
    assertEquals(List.of(), result.getThaoTacDuocPhep());
    assertNull(result.getBanGiaoLai());
  }

  @Test
  void receiptSnapshotKeepsTheActualReplacementVariantAndDoesNotReadThePurchaseCatalog() {
    Map<String, Object> data = data("F01");
    Map<String, Object> accepted = object(((List<?>) data.get("hang_da_nhan")).get(0));
    accepted.put("thiet_bi_id", 9901);
    accepted.put("phien_ban_id", 909);
    accepted.put("so_serial_id", 9902);
    PhieuTraHang saved = stub(data);

    var result = service.getReturnDetail(saved.getId());

    assertJson(data.get("hang_da_nhan"), result.getHangDaNhan());
    assertEquals(new BigDecimal("1045000"), result.getTongTienHoan());
    assertEquals(1, result.getChiTietTra().size());
    assertEquals(2001L, result.getChiTietTra().getFirst().getChiTietDonHangId());
  }

  @Test
  void unknownHeldDeviceIdentityEvidenceAndExceptionApprovalAreReadWithoutGuessing() {
    Map<String, Object> data = data("F05");
    Map<String, Object> held = object(((List<?>) data.get("hang_dang_giu")).get(0));
    held.put("thiet_bi_id", null);
    held.put("so_serial", "MA-KHONG-KHOP");
    held.put("bang_chung_urls", List.of("/uploads/kiem-tra.jpg"));
    Map<String, Object> approval =
        Map.of(
            "nguoi_phe_duyet_id",
            7,
            "ly_do",
            "Đã xác minh ngoại lệ",
            "bang_chung_urls",
            List.of("/uploads/phe-duyet.jpg"));
    data.put("phe_duyet_ngoai_le", approval);
    PhieuTraHang saved = stub(data);

    var result = service.getReturnDetail(saved.getId());

    assertJson(data.get("hang_dang_giu"), result.getHangDangGiu());
    assertJson(approval, result.getPheDuyetNgoaiLe());
    assertEquals(List.of("BAN_GIAO_LAI"), result.getThaoTacDuocPhep());
  }

  @Test
  void contactIsTheSavedReturnContactEvenIfTheAccountHasBeenRenamed() {
    PhieuTraHang saved = stub(data("F02"));
    saved.setKhachHang(
        NguoiDung.builder().id(42L).hoTen("Tên tài khoản mới").soDienThoai("0999999999").build());

    var result = service.getReturnDetail(saved.getId());

    assertEquals(42L, result.getKhachHangId());
    assertEquals("Nguyễn Văn An", result.getTenNguoiLienHe());
    assertEquals("0912345678", result.getSdtNguoiLienHe());
  }

  @Test
  void legacyPolicyJsonDoesNotBecomeAReceiptOrAnInspection() {
    PhieuTraHang saved = stub(data("F02"));
    Map<String, Object> policy = Map.of("du_dieu_kien", true, "nguoi_xac_minh_id", 7);
    saved.setDuLieuNhanHang(
        ReturnSnapshotJson.encode(
            new LinkedHashMap<>(Map.of("kiem_tra_chinh_sach_khi_lap", policy))));

    var result = service.getReturnDetail(saved.getId());

    assertNull(result.getKetQuaKiemTra());
    assertNull(result.getNgayTiepNhanThucTe());
    assertEquals(List.of(), result.getHangDangGiu());
    assertEquals(List.of(), result.getHangDaNhan());
    assertEquals(
        policy,
        ReturnSnapshotJson.decode(saved.getDuLieuNhanHang()).get("kiem_tra_chinh_sach_khi_lap"));
  }

  @Test
  void aLinkedExpenseSuppressesRefundEvenIfTheStoredHeaderStateIsStale() {
    Map<String, Object> data = data("F03");
    data.put("trang_thai_tra_hang", "DA_NHAN_HANG");
    data.put("ngay_ket_thuc", null);
    PhieuTraHang saved = stub(data);

    var result = service.getReturnDetail(saved.getId());

    assertNotNull(result.getPhieuChi());
    assertEquals("CHUYEN_KHOAN", result.getPhieuChi().getPhuongThucThanhToan());
    assertEquals("TIEN_MAT", result.getHinhThucHoanTien());
    assertEquals(List.of(), result.getThaoTacDuocPhep());
    assertEquals(TrangThaiTraHang.DA_NHAN_HANG, saved.getTrangThaiTraHang());
  }

  @Test
  void getDoesNotCompleteAnUnpaidZeroReturnOrInventItsReceiptDates() {
    Map<String, Object> data = data("F04");
    data.put("trang_thai_tra_hang", "DA_NHAN_HANG");
    data.put("ngay_ket_thuc", null);
    PhieuTraHang saved = stub(data);
    saved.setNgayNhanHang(null);
    saved.setDuLieuNhanHang(null);

    var result = service.getReturnDetail(saved.getId());

    assertEquals(TrangThaiTraHang.DA_NHAN_HANG, result.getTrangThaiTraHang());
    assertNull(result.getNgayNhanHang());
    assertNull(result.getNgayKetThuc());
    assertNull(result.getPhieuChi());
    assertEquals(List.of(), result.getHangDaNhan());
    assertEquals(List.of(), result.getThaoTacDuocPhep());
    assertNull(saved.getDuLieuNhanHang());
  }

  @Test
  void legacyCompletedStatusIsDisplayedAsCurrentStatusWithoutUpdatingTheEntity() {
    PhieuTraHang saved = stub(data("F03"));
    saved.setTrangThaiTraHang(TrangThaiTraHang.DA_HOAN_TIEN);

    assertEquals(
        TrangThaiTraHang.HOAN_TAT, service.getReturnDetail(saved.getId()).getTrangThaiTraHang());
    assertEquals(TrangThaiTraHang.DA_HOAN_TIEN, saved.getTrangThaiTraHang());
  }

  @ParameterizedTest
  @ValueSource(longs = {0, -1})
  void rejectsNonPositiveIdsBeforeAnyDatabaseRead(long id) {
    assertEquals(
        ErrorCode.INVALID_DATA,
        assertThrows(AppException.class, () -> service.getReturnDetail(id)).getErrorCode());
    verifyNoInteractions(returnRepository, returnLineRepository);
  }

  @Test
  void rejectsMissingIdBeforeAnyDatabaseRead() {
    assertEquals(
        ErrorCode.INVALID_DATA,
        assertThrows(AppException.class, () -> service.getReturnDetail(null)).getErrorCode());
    verifyNoInteractions(returnRepository, returnLineRepository);
  }

  @Test
  void reportsMissingSlipAsNotFound() {
    when(returnRepository.findById(999999L)).thenReturn(Optional.empty());
    assertEquals(
        ErrorCode.NOT_FOUND,
        assertThrows(AppException.class, () -> service.getReturnDetail(999999L)).getErrorCode());
    verifyNoInteractions(returnLineRepository);
  }

  private PhieuTraHang stub(Map<String, Object> data) {
    Map<String, Object> order = object(data.get("don_hang"));
    Map<String, Object> snapshot = new LinkedHashMap<>();
    for (String key :
        List.of(
            "muc_dich_ket_thuc",
            "ket_qua_kiem_tra",
            "hang_dang_giu",
            "hang_da_nhan",
            "ban_giao_lai",
            "phe_duyet_ngoai_le")) {
      snapshot.put(key, data.get(key));
    }
    PhieuTraHang slip =
        PhieuTraHang.builder()
            .id(id(data, "id"))
            .maTraHang((String) data.get("ma_tra_hang"))
            .donHang(
                DonHang.builder()
                    .id(id(order, "id"))
                    .maDonHang((String) order.get("ma_don_hang"))
                    .build())
            .tenNguoiLienHe((String) data.get("ten_nguoi_lien_he"))
            .sdtNguoiLienHe((String) data.get("sdt_nguoi_lien_he"))
            .lyDoTra((String) data.get("ly_do_tra"))
            .hinhThucHoanTien((String) data.get("hinh_thuc_hoan_tien"))
            .tongTienHoan(amount(data, "tong_tien_hoan"))
            .trangThaiTraHang(TrangThaiTraHang.valueOf((String) data.get("trang_thai_tra_hang")))
            .ngayTiepNhanThucTe(date(data, "ngay_tiep_nhan_thuc_te"))
            .ngayNhanHang(date(data, "ngay_nhan_hang"))
            .ngayKetThuc(date(data, "ngay_ket_thuc"))
            .lyDoKetThuc((String) data.get("ly_do_ket_thuc"))
            .duLieuNhanHang(ReturnSnapshotJson.encode(snapshot))
            .build();
    List<ChiTietTraHang> lines = new ArrayList<>();
    for (Object value : (List<?>) data.get("chi_tiet_tra")) {
      Map<String, Object> line = object(value);
      // A changed purchase price and no live variant must not affect saved return values.
      ChiTietDonHang purchase =
          ChiTietDonHang.builder()
              .id(id(line, "chi_tiet_don_hang_id"))
              .donHang(slip.getDonHang())
              .donGia(new BigDecimal("99999999"))
              .thanhToanDong(new BigDecimal("88888888"))
              .build();
      lines.add(
          ChiTietTraHang.builder()
              .id(id(line, "id"))
              .phieuTraHang(slip)
              .chiTietDonHang(purchase)
              .soLuong(((Number) line.get("so_luong")).intValue())
              .donGiaHoan(amount(line, "don_gia_hoan"))
              .thanhTienHoan(amount(line, "thanh_tien_hoan"))
              .build());
    }
    when(returnRepository.findById(slip.getId())).thenReturn(Optional.of(slip));
    when(returnLineRepository.findSavedDetailLines(slip.getId())).thenReturn(lines);
    Map<String, Object> cash = object(data.get("phieu_chi"));
    when(returnRepository.findRefundExpenseByReturnId(slip.getId()))
        .thenReturn(cash == null ? Optional.empty() : Optional.of(expense(cash)));
    return slip;
  }

  private static PhieuTraHangRepository.RefundExpenseProjection expense(Map<String, Object> cash) {
    return new PhieuTraHangRepository.RefundExpenseProjection() {
      public Long getId() {
        return id(cash, "id");
      }

      public String getMaPhieu() {
        return (String) cash.get("ma_phieu");
      }

      public Long getPhieuTraHangId() {
        return id(cash, "phieu_tra_hang_id");
      }

      public String getLoaiPhieu() {
        return (String) cash.get("loai_phieu");
      }

      public BigDecimal getSoTien() {
        return amount(cash, "so_tien");
      }

      public String getPhuongThucThanhToan() {
        return (String) cash.get("phuong_thuc_thanh_toan");
      }

      public String getTenNguoiNopNhan() {
        return (String) cash.get("ten_nguoi_nop_nhan");
      }

      public String getMaChungTuThamChieu() {
        return (String) cash.get("ma_chung_tu_tham_chieu");
      }

      public LocalDateTime getNgayGhiNhan() {
        return date(cash, "ngay_ghi_nhan");
      }

      public String getNguonTao() {
        return (String) cash.get("nguon_tao");
      }

      public String getTrangThai() {
        return (String) cash.get("trang_thai");
      }
    };
  }

  private static Map<String, Object> fixture(String name) {
    try (var input =
        AdminReturnDetailTest.class.getResourceAsStream("/uc027/th06/" + name + ".json")) {
      assertNotNull(input);
      return object(JSON.readValue(input, Map.class));
    } catch (java.io.IOException exception) {
      throw new IllegalStateException(exception);
    }
  }

  private static Map<String, Object> data(String name) {
    return object(fixture(name).get("data"));
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> object(Object value) {
    return (Map<String, Object>) value;
  }

  private static Long id(Map<String, Object> data, String key) {
    return ((Number) data.get(key)).longValue();
  }

  private static BigDecimal amount(Map<String, Object> data, String key) {
    return new BigDecimal(data.get(key).toString());
  }

  private static LocalDateTime date(Map<String, Object> data, String key) {
    return data.get(key) == null
        ? null
        : OffsetDateTime.parse(data.get(key).toString()).toLocalDateTime();
  }

  private static void assertJson(Object expected, Object actual) {
    if (expected instanceof Number left && actual instanceof Number right) {
      assertEquals(0, new BigDecimal(left.toString()).compareTo(new BigDecimal(right.toString())));
    } else if (expected instanceof Map<?, ?> left) {
      assertTrue(actual instanceof Map<?, ?>);
      Map<?, ?> right = (Map<?, ?>) actual;
      assertEquals(left.keySet(), right.keySet());
      left.forEach((key, value) -> assertJson(value, right.get(key)));
    } else if (expected instanceof List<?> left) {
      assertTrue(actual instanceof List<?>);
      List<?> right = (List<?>) actual;
      assertEquals(left.size(), right.size());
      for (int index = 0; index < left.size(); index++) {
        assertJson(left.get(index), right.get(index));
      }
    } else {
      assertEquals(expected, actual);
    }
  }
}
