package com.example.dantruventu.Services.warranty;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyEventRequest;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyEventResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.warranty.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import tools.jackson.databind.ObjectMapper;

class AdminWarrantyEventServiceTest {
  static final ObjectMapper JSON = new ObjectMapper();
  static final String KEY = "66c0b95f-4c94-4379-866c-224c5dab0001";
  static final List<Map<String, Object>> BOX = List.of(m("ten", "Hộp", "so_luong", 1));

  static Map<String, Object> m(Object... pairs) {
    return WarrantyEventWorkAuthorization.fields(pairs);
  }

  static BigDecimal money(long value) {
    return BigDecimal.valueOf(value);
  }

  static AdminWarrantyEventRequest dto(Map<String, Object> body) {
    return JSON.readValue(JSON.writeValueAsString(body), AdminWarrantyEventRequest.class);
  }

  static void error(ErrorCode code, Runnable call) {
    var failure = assertThrows(AppException.class, call::run);
    assertEquals(code, failure.getErrorCode());
    messageWithoutNumbers(failure.getMessage());
    if (failure instanceof WarrantyReadException structured)
      structured.getErrors().forEach(e -> messageWithoutNumbers(e.message()));
  }

  static void messageWithoutNumbers(String message) {
    assertNotNull(message);
    assertFalse(message.codePoints().anyMatch(Character::isDigit), message);
  }

  static class Fixture {
    WarrantyWorkflowRepository workflow = mock(WarrantyWorkflowRepository.class);
    WarrantyIntakeRepository locks = mock(WarrantyIntakeRepository.class);
    WarrantyHistoryRepository histories = mock(WarrantyHistoryRepository.class);
    WarrantyEventRepository repository = mock(WarrantyEventRepository.class);
    WarrantyDetailRepository details = mock(WarrantyDetailRepository.class);
    SalesIdempotencyRepository dedup = mock(SalesIdempotencyRepository.class);
    WarrantyHistorySupport history = new WarrantyHistorySupport(JSON);
    DonHang order = DonHang.builder().id(1001L).build();
    ChiTietDonHang line = ChiTietDonHang.builder().id(2001L).donHang(order).build();
    SoSerialSanPham serial =
        SoSerialSanPham.builder()
            .id(51L)
            .soSerial("RAM-SN-001")
            .trangThai(TrangThaiSerial.DANG_BAO_HANH)
            .build();
    ThietBiBaoHanh device =
        ThietBiBaoHanh.builder().id(700L).chiTietDonHang(line).soSerial(serial).build();
    PhieuBaoHanh ticket =
        PhieuBaoHanh.builder()
            .id(501L)
            .donHang(order)
            .thietBi(device)
            .soSerial(serial)
            .ngayTiepNhan(LocalDateTime.of(2026, 10, 12, 9, 0))
            .trangThaiXuLy(TrangThaiBaoHanh.DANG_KIEM_TRA)
            .ketQuaXuLy(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA)
            .build();
    List<LichSuBaoHanh> events = new ArrayList<>();
    List<ChiTietPhiBaoHanh> fees = new ArrayList<>();
    List<HoaDonBaoHanh> invoices = new ArrayList<>();
    List<SoQuyThuChi> cash = new ArrayList<>();
    Map<String, SalesIdempotencyRepository.Entry> entries = new HashMap<>();
    AdminWarrantyEventService service;
    long nextId = 2000;

    Fixture() {
      add(
          1001,
          "TIEP_NHAN",
          m(
              "noi_dang_giu",
              m("loai", "CUA_HANG", "thiet_bi_id", 700),
              "giao_nhan",
              m("su_kien", "TIEP_NHAN", "ngay", "2026-10-12T09:00:00+07:00")));
      when(workflow.ticketOrigin(501L))
          .thenReturn(new WarrantyWorkflowRepository.TicketOrigin(1001L, 2001L));
      when(workflow.lockTicket(501L)).thenReturn(ticket);
      when(locks.lockOrder(1001L)).thenReturn(order);
      when(locks.lockLine(2001L)).thenReturn(line);
      when(locks.lockDevice(700L)).thenReturn(device);
      when(locks.lockSerial(51L)).thenReturn(serial);
      when(workflow.deviceExists(700L)).thenReturn(true);
      when(histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(501L))
          .thenAnswer(a -> new ArrayList<>(events));
      when(repository.supplier(eq(3L), anyBoolean()))
          .thenReturn(NhaCungCap.builder().id(3L).tenNhaCungCap("Trung tâm A").build());
      when(details.findFees(501L)).thenAnswer(a -> fees);
      when(details.findInvoices(501L)).thenAnswer(a -> invoices);
      when(details.findPostedMoney(501L)).thenAnswer(a -> cash);
      when(dedup.acquire(anyString(), anyLong(), anyString()))
          .thenAnswer(
              a ->
                  entries.computeIfAbsent(
                      a.getArgument(0),
                      k ->
                          new SalesIdempotencyRepository.Entry(
                              a.getArgument(1), a.getArgument(2), null)));
      doAnswer(
              a -> {
                var old = entries.get(a.getArgument(0));
                entries.put(
                    a.getArgument(0),
                    new SalesIdempotencyRepository.Entry(
                        old.actorId(), old.requestHash(), a.getArgument(1)));
                return null;
              })
          .when(dedup)
          .complete(anyString(), anyString());
      when(workflow.append(any(), anyLong(), anyString(), anyString(), anyString()))
          .thenAnswer(
              a -> {
                var event =
                    LichSuBaoHanh.builder()
                        .id(nextId++)
                        .phieuBaoHanh(ticket)
                        .nguoiThucHien(NguoiDung.builder().id(a.getArgument(1)).build())
                        .loaiSuKien(a.getArgument(2))
                        .noiDung(a.getArgument(3))
                        .duLieuChiTiet(a.getArgument(4))
                        .ngayTao(LocalDateTime.now())
                        .build();
                events.add(event);
                return event;
              });
      service =
          new AdminWarrantyEventService(
              workflow,
              locks,
              histories,
              history,
              new WarrantyMutationSupport(dedup, JSON),
              repository,
              details,
              new WarrantyEventWorkAuthorization(history, details),
              JSON);
    }

    void add(long id, String type, Map<String, Object> data) {
      events.add(
          LichSuBaoHanh.builder()
              .id(id)
              .phieuBaoHanh(ticket)
              .loaiSuKien(type)
              .ngayTao(LocalDateTime.of(2026, 10, 12, 9, 0))
              .duLieuChiTiet(JSON.writeValueAsString(data))
              .build());
    }

    AdminWarrantyEventResponse call(Map<String, Object> body) {
      var response = service.save("501", dto(body), UUID.randomUUID().toString(), 8L);
      messageWithoutNumbers(response.getMessage());
      return response.getData();
    }

    void expense(long value) {
      ticket.setChiPhiNccXacNhan(money(value));
      add(
          1003,
          "GHI_CHI_PHI_DON_VI",
          m(
              "bao_phi_don_vi",
              m(
                  "nha_cung_cap_id",
                  3,
                  "da_xac_nhan",
                  true,
                  "hang_muc",
                  List.of(
                      m("ma_hang_muc", "HM01", "chi_phi", value, "ben_chiu_phi", "KHACH_HANG")))));
    }

    void sent(boolean received) {
      expense(100000);
      add(
          1005,
          "GUI_DON_VI",
          m(
              "giao_nhan",
              m(
                  "su_kien",
                  "GUI_DON_VI",
                  "lan_gui_lich_su_id",
                  1005,
                  "thiet_bi_id",
                  700,
                  "nha_cung_cap_id",
                  3,
                  "phu_kien",
                  BOX,
                  "ngay",
                  "2026-10-12T10:00:00+07:00"),
              "noi_dang_giu",
              m("loai", "DANG_VAN_CHUYEN", "thiet_bi_id", 700, "nha_cung_cap_id", 3)));
      ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DA_GUI_BAO_HANH);
      if (received) {
        add(
            1006,
            "DON_VI_TIEP_NHAN",
            m(
                "noi_dang_giu",
                m("loai", "DON_VI_BAO_HANH", "thiet_bi_id", 700, "nha_cung_cap_id", 3),
                "giao_nhan",
                m(
                    "lan_gui_lich_su_id",
                    1005,
                    "thiet_bi_id",
                    700,
                    "ngay",
                    "2026-10-12T10:30:00+07:00",
                    "da_tiep_nhan",
                    true)));
        ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DANG_BAO_HANH);
      }
    }

    void quote() {
      ticket.setPhienBanBaoGia(1);
      ticket.setTrangThaiBaoGia(TrangThaiBaoGiaBaoHanh.DONG_Y);
      fees.add(
          ChiTietPhiBaoHanh.builder()
              .id(1101L)
              .phieuBaoHanh(ticket)
              .phienBanBaoGia(1)
              .noiDung("Sửa chân tiếp xúc")
              .soLuong(1)
              .donGiaKhach(money(100000))
              .thanhTienKhach(money(100000))
              .build());
      var invoice =
          HoaDonBaoHanh.builder()
              .id(1201L)
              .maHoaDon("BH-TEST-INVOICE")
              .phieuBaoHanh(ticket)
              .phienBanBaoGia(1)
              .tongTien(money(100000))
              .trangThai(TrangThaiHoaDonBaoHanh.HIEU_LUC)
              .build();
      invoices.add(invoice);
      cash.add(
          SoQuyThuChi.builder()
              .id(1301L)
              .hoaDonBaoHanh(invoice)
              .phieuBaoHanh(ticket)
              .soTien(money(50000))
              .loaiPhieu(LoaiPhieuThuChi.THU)
              .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
              .build());
      add(
          1004,
          "BAO_GIA",
          m(
              "bao_gia",
              m(
                  "phien_ban",
                  1,
                  "trang_thai",
                  "DONG_Y",
                  "tong_tien_khach",
                  100000,
                  "han_phan_hoi",
                  "2026-10-12T10:35:00+07:00",
                  "dieu_kien_dat_coc",
                  m("so_tien_toi_thieu", 50000),
                  "quyet_dinh",
                  m(
                      "quyet_dinh",
                      "DONG_Y",
                      "thoi_diem",
                      "2026-10-12T10:32:00+07:00",
                      "kenh",
                      "TAI_QUAY",
                      "bang_chung_urls",
                      List.of("/test/consent.jpg")),
                  "hang_muc",
                  List.of(
                      m(
                          "id",
                          1101,
                          "ma_hang_muc",
                          "HM01",
                          "ben_chiu_phi",
                          "KHACH_HANG",
                          "noi_dung",
                          "Sửa chân tiếp xúc",
                          "so_luong",
                          1,
                          "don_gia_khach",
                          100000,
                          "thanh_tien_khach",
                          100000)))));
    }

    void finished(long paid) {
      expense(100000);
      ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
      ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
      serial.setTrangThai(TrangThaiSerial.DA_BAN);
      add(1050, "HANDOVER", m("noi_dang_giu", m("loai", "KHACH_HANG", "thiet_bi_id", 700)));
      cash.add(
          SoQuyThuChi.builder()
              .id(1302L)
              .phieuBaoHanh(ticket)
              .nhaCungCap(NhaCungCap.builder().id(3L).build())
              .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.NHA_CUNG_CAP)
              .loaiPhieu(LoaiPhieuThuChi.CHI)
              .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
              .soTien(money(paid))
              .build());
    }
  }

  static Map<String, Object> conclusion(boolean mixed) {
    var items = new ArrayList<Map<String, Object>>();
    items.add(
        m(
            "ma_hang_muc",
            "HM01",
            "loi",
            "Hỏng chân tiếp xúc",
            "dieu_kien_bao_hanh",
            "KHONG_DU_DIEU_KIEN",
            "noi_dung_xu_ly",
            "Sửa chân tiếp xúc",
            "ben_chiu_phi",
            "KHACH_HANG",
            "ly_do",
            "Ngoài miễn phí",
            "can_cu",
            "Biên bản kiểm tra",
            "don_vi_ket_luan",
            "Trung tâm A"));
    if (mixed)
      items.add(
          m(
              "ma_hang_muc",
              "HM_FREE",
              "loi",
              "Lỗi trong chính sách",
              "dieu_kien_bao_hanh",
              "DU_DIEU_KIEN",
              "noi_dung_xu_ly",
              "Xử lý miễn phí",
              "ben_chiu_phi",
              "DON_VI_BAO_HANH",
              "ly_do",
              "Đủ điều kiện",
              "can_cu",
              "Biên bản miễn phí",
              "don_vi_ket_luan",
              "Trung tâm A"));
    return m(
        "su_kien",
        "GHI_KET_LUAN",
        "noi_dung",
        "Kết luận",
        "hang_muc",
        items,
        "bang_chung_urls",
        List.of("/check.jpg"));
  }

  static Map<String, Object> cost(boolean confirmed, long value) {
    return m(
        "su_kien",
        "GHI_CHI_PHI_DON_VI",
        "nha_cung_cap_id",
        3,
        "hang_muc",
        List.of(m("ma_hang_muc", "HM01", "chi_phi", value, "ben_chiu_phi", "KHACH_HANG")),
        "xac_nhan_nghia_vu",
        confirmed,
        "can_cu",
        "Báo phí",
        "chung_tu_urls",
        List.of("/quote.jpg"));
  }

  static Map<String, Object> start(String place) {
    return m(
        "su_kien",
        "BAT_DAU_CONG_VIEC",
        "noi_xu_ly",
        place,
        "phien_ban_bao_gia",
        1,
        "chi_tiet_phi_ids",
        List.of(1101),
        "thoi_diem",
        "2026-10-12T10:40:00+07:00",
        "ghi_chu",
        "Bắt đầu");
  }

  static Map<String, Object> returned(String serial, boolean box) {
    return m(
        "su_kien",
        "NHAN_LAI",
        "lan_gui_lich_su_id",
        1005,
        "loai_thiet_bi",
        "THIET_BI_CU",
        "thiet_bi_id",
        700,
        "so_serial_thuc_nhan",
        serial,
        "tinh_trang",
        "Đã mô tả",
        "phu_kien",
        box ? BOX : List.of(),
        "thoi_diem",
        "2026-10-12T14:00:00+07:00",
        "chung_tu_urls",
        List.of("/back.jpg"),
        "sai_lech",
        List.of());
  }

  @TestFactory
  Stream<DynamicTest> allSixteenInputs() {
    return java.util.stream.IntStream.rangeClosed(1, 16)
        .mapToObj(
            n ->
                DynamicTest.dynamicTest(
                    "E" + n,
                    () -> {
                      Fixture f = new Fixture();
                      Map<String, Object> body;
                      switch (n) {
                        case 1, 16 -> body = conclusion(n == 16);
                        case 2 -> body = cost(true, 100000);
                        case 3 -> {
                          f.expense(100000);
                          body =
                              m(
                                  "su_kien",
                                  "GUI_DON_VI",
                                  "nha_cung_cap_id",
                                  3,
                                  "ten_don_vi",
                                  "Trung tâm A",
                                  "thiet_bi_id",
                                  700,
                                  "noi_dung_yeu_cau",
                                  "Kiểm tra",
                                  "phu_kien",
                                  BOX,
                                  "thoi_diem",
                                  "2026-10-12T10:00:00+07:00",
                                  "chung_tu_urls",
                                  List.of("/send.jpg"));
                        }
                        case 4 -> {
                          f.sent(false);
                          body =
                              m(
                                  "su_kien",
                                  "DON_VI_TIEP_NHAN",
                                  "lan_gui_lich_su_id",
                                  1005,
                                  "nguoi_nhan",
                                  "Nhân viên A",
                                  "thoi_diem",
                                  "2026-10-12T10:30:00+07:00",
                                  "chung_tu_urls",
                                  List.of("/received.jpg"));
                        }
                        case 5, 15 -> {
                          if (n == 5) f.sent(true);
                          f.quote();
                          body = start(n == 5 ? "DON_VI_BAO_HANH" : "CUA_HANG");
                        }
                        case 6 -> {
                          f.add(
                              1002,
                              "GHI_KET_LUAN",
                              m(
                                  "ket_luan",
                                  m(
                                      "hang_muc",
                                      ((List<?>) conclusion(true).get("hang_muc")).subList(1, 2))));
                          body =
                              m(
                                  "su_kien",
                                  "BAT_DAU_CONG_VIEC",
                                  "noi_xu_ly",
                                  "CUA_HANG",
                                  "phien_ban_bao_gia",
                                  null,
                                  "ket_luan_lich_su_id",
                                  1002,
                                  "ma_hang_muc",
                                  List.of("HM_FREE"),
                                  "thoi_diem",
                                  "2026-10-12T10:40:00+07:00",
                                  "ghi_chu",
                                  "Miễn phí");
                        }
                        case 7 -> {
                          f.sent(true);
                          f.quote();
                          f.add(
                              1007,
                              "BAT_DAU_CONG_VIEC",
                              m(
                                  "cong_viec_da_bat_dau",
                                  m(
                                      "noi_xu_ly",
                                      "DON_VI_BAO_HANH",
                                      "phien_ban_bao_gia",
                                      1,
                                      "chi_tiet_phi_ids",
                                      List.of(1101),
                                      "thoi_diem",
                                      "2026-10-12T10:40:00+07:00")));
                          body =
                              m(
                                  "su_kien",
                                  "CAP_NHAT_TIEN_DO",
                                  "noi_dung",
                                  "Đã sửa, chờ thử",
                                  "chi_tiet_phi_ids",
                                  List.of(1101),
                                  "thoi_diem",
                                  "2026-10-12T13:00:00+07:00",
                                  "bang_chung_urls",
                                  List.of("/progress.jpg"));
                        }
                        case 8 -> {
                          f.sent(true);
                          body =
                              m(
                                  "su_kien",
                                  "YEU_CAU_DUNG",
                                  "ly_do",
                                  "Dừng phần chưa thực hiện",
                                  "thoi_diem",
                                  "2026-10-12T13:00:00+07:00",
                                  "bang_chung_urls",
                                  List.of("/stop.jpg"));
                        }
                        case 9 -> {
                          f.sent(true);
                          body =
                              m(
                                  "su_kien",
                                  "YEU_CAU_THU_HOI",
                                  "ly_do",
                                  "Không tiếp tục",
                                  "lan_gui_lich_su_id",
                                  1005,
                                  "thoi_diem",
                                  "2026-10-12T13:10:00+07:00",
                                  "chung_tu_urls",
                                  List.of("/recall.jpg"));
                        }
                        case 10, 11, 12 -> {
                          f.sent(true);
                          body = returned(n == 11 ? "RAM-SN-OTHER-001" : "RAM-SN-001", n != 12);
                        }
                        case 13 -> body = cost(false, 100000);
                        case 14 -> {
                          f.finished(100000);
                          body = cost(true, 80000);
                        }
                        default -> throw new AssertionError();
                      }
                      var response = f.call(body);
                      assertNotNull(response.get("lich_su_id"));
                      assertEquals(501L, response.get("id"));
                      if (n == 1 || n == 16) {
                        assertTrue(
                            ((Map<?, ?>) response.get("ket_luan")).containsKey("lich_su_id"));
                        assertEquals(
                            n == 16 ? 2 : 1,
                            ((List<?>) ((Map<?, ?>) response.get("ket_luan")).get("hang_muc"))
                                .size());
                      }
                      if (n == 3)
                        assertEquals(
                            response.get("lich_su_id"),
                            ((Map<?, ?>) response.get("giao_nhan")).get("lan_gui_lich_su_id"));
                      if (n == 10 || n == 12)
                        assertEquals("DA_NHAN_LAI", response.get("trang_thai_xu_ly"));
                      if (n == 11) {
                        assertFalse((Boolean) response.get("da_nhan_dung_thiet_bi"));
                        assertEquals("DANG_BAO_HANH", response.get("trang_thai_xu_ly"));
                        assertNull(((Map<?, ?>) response.get("hang_thuc_nhan")).get("thiet_bi_id"));
                      }
                      if (n == 11 || n == 12) {
                        var persisted =
                            f.history.object(
                                f.history.payload(f.events.getLast()).get("giao_nhan"));
                        assertTrue(
                            ((Map<?, ?>) ((List<?>) persisted.get("sai_lech")).getFirst())
                                .containsKey("id"));
                      }
                      if (n == 13) {
                        assertNull(response.get("chi_phi_ncc_xac_nhan"));
                        assertTrue(
                            JSON.writeValueAsString(response)
                                .contains("\"phieu_thu_chi_id\":null"));
                      }
                      if (n == 14) {
                        assertEquals("HOAN_TAT", response.get("trang_thai_xu_ly"));
                        assertEquals(
                            0,
                            money(20000)
                                .compareTo(
                                    (BigDecimal)
                                        ((Map<?, ?>) response.get("chi_phi_don_vi"))
                                            .get("con_phai_nhan_hoan")));
                      }
                      if (n == 5 || n == 15)
                        assertEquals(
                            true, ((Map<?, ?>) response.get("dieu_kien_dat_coc")).get("da_dat"));
                      assertEquals(
                          n == 14 ? TrangThaiSerial.DA_BAN : TrangThaiSerial.DANG_BAO_HANH,
                          f.serial.getTrangThai());
                      verify(f.workflow, times(1))
                          .append(any(), eq(8L), anyString(), anyString(), anyString());
                    }));
  }

  @Test
  void missingConsentOrDepositNeverStartsWork() {
    Fixture missing = new Fixture();
    error(ErrorCode.WARRANTY_PAID_WORK_NOT_AUTHORIZED, () -> missing.call(start("CUA_HANG")));
    verify(missing.workflow, never())
        .append(any(), anyLong(), anyString(), anyString(), anyString());
    Fixture shortDeposit = new Fixture();
    shortDeposit.quote();
    shortDeposit.cash.getFirst().setSoTien(money(49999));
    error(ErrorCode.WARRANTY_PAID_WORK_NOT_AUTHORIZED, () -> shortDeposit.call(start("CUA_HANG")));
    Fixture changed = new Fixture();
    changed.quote();
    changed.fees.getFirst().setNoiDung("Thay đổi chưa consent");
    error(ErrorCode.WARRANTY_PAID_WORK_NOT_AUTHORIZED, () -> changed.call(start("CUA_HANG")));
  }

  @Test
  void idempotentRetryAndDifferentContent() {
    Fixture f = new Fixture();
    var request = dto(conclusion(false));
    var first = f.service.save("501", request, KEY, 8L);
    var second = f.service.save("501", request, KEY, 8L);
    assertEquals(JSON.writeValueAsString(first), JSON.writeValueAsString(second));
    verify(f.workflow, times(1)).append(any(), anyLong(), anyString(), anyString(), anyString());
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.service.save("501", dto(conclusion(true)), KEY, 8L));
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.service.save("501", request, KEY, 9L));
  }

  @Test
  void completedPhysicalEventsBlockedButCostsAllowed() {
    Fixture f = new Fixture();
    f.finished(80000);
    error(ErrorCode.WARRANTY_ALREADY_COMPLETED, () -> f.call(conclusion(false)));
    var result = f.call(cost(true, 100000));
    assertEquals(
        0,
        money(20000)
            .compareTo(
                (BigDecimal) ((Map<?, ?>) result.get("chi_phi_don_vi")).get("con_phai_chi")));
    assertEquals("HOAN_TAT", result.get("trang_thai_xu_ly"));
  }

  @Test
  void monetaryReplayPreservesDecimalsAndExplicitNulls() {
    Fixture f = new Fixture();
    var request = dto(cost(true, 100000));
    var first = f.service.save("501", request, KEY, 8L);
    var replay = f.service.save("501", request, KEY, 8L);
    assertEquals(JSON.writeValueAsString(first), JSON.writeValueAsString(replay));
    assertTrue(JSON.writeValueAsString(replay).contains("\"phieu_thu_chi_id\":null"));
    verify(f.workflow, times(1)).append(any(), anyLong(), anyString(), anyString(), anyString());
  }

  @Test
  void noSerialReturnDoesNotManufactureSerial() {
    Fixture f = new Fixture();
    f.device.setSoSerial(null);
    f.ticket.setSoSerial(null);
    f.sent(true);
    var response = f.call(returned(null, true));
    assertTrue((Boolean) response.get("da_nhan_dung_thiet_bi"));
    assertNull(((Map<?, ?>) response.get("hang_thuc_nhan")).get("so_serial"));
    assertEquals("DA_NHAN_LAI", response.get("trang_thai_xu_ly"));
  }

  @Test
  void receiptDiscrepanciesRemainVisibleToExistingStatusGuard() {
    for (boolean wrongSerial : List.of(true, false)) {
      Fixture f = new Fixture();
      f.sent(true);
      f.call(returned(wrongSerial ? "OTHER-SERIAL" : "RAM-SN-001", wrongSerial));
      var status =
          new AdminWarrantyStatusService(
              f.workflow,
              f.locks,
              f.histories,
              f.history,
              new WarrantyMutationSupport(f.dedup, JSON),
              JSON);
      var ready =
          m(
              "su_kien",
              "SAN_SANG_TRA",
              "thiet_bi_se_tra_id",
              700,
              "ket_qua_xu_ly",
              "SUA_THANH_CONG",
              "tinh_trang",
              "Đã kiểm tra",
              "phu_kien",
              BOX,
              "can_cu_kiem_tra",
              "Đã thử",
              "sai_lech_da_xu_ly",
              List.of());
      var request =
          JSON.readValue(
              JSON.writeValueAsString(ready),
              com.example.dantruventu.DTO.Request.warranty.AdminWarrantyStatusRequest.class);
      error(
          ErrorCode.WARRANTY_HANDOVER_DEVICE_NOT_READY,
          () -> status.update("501", request, UUID.randomUUID().toString(), 8L));
    }
  }

  @Test
  void merelyReturningFromProviderDoesNotGrantPaidWork() {
    Fixture f = new Fixture();
    f.sent(true);
    error(ErrorCode.WARRANTY_PAID_WORK_NOT_AUTHORIZED, () -> f.call(start("DON_VI_BAO_HANH")));
    assertEquals(TrangThaiBaoHanh.DANG_BAO_HANH, f.ticket.getTrangThaiXuLy());
    verify(f.workflow, never()).append(any(), anyLong(), anyString(), anyString(), anyString());
  }

  @Test
  void quoteOnlyDoesNotClearConfirmedCostAndUpdatesDoNotAccumulate() {
    Fixture f = new Fixture();
    f.expense(100000);
    f.call(cost(false, 80000));
    assertEquals(0, money(100000).compareTo(f.ticket.getChiPhiNccXacNhan()));
    f.call(cost(true, 80000));
    assertEquals(0, money(80000).compareTo(f.ticket.getChiPhiNccXacNhan()));
    f.call(cost(true, 80000));
    assertEquals(0, money(80000).compareTo(f.ticket.getChiPhiNccXacNhan()));
  }

  @Test
  void strictFieldsAndStructuralValidation() {
    for (Object invalid : List.of("3", 0, -1, 3.5, true)) {
      var body = cost(true, 1);
      body.put("nha_cung_cap_id", invalid);
      Fixture f = new Fixture();
      error(ErrorCode.INVALID_WARRANTY_EVENT, () -> f.call(body));
      verifyNoInteractions(f.dedup);
    }
    var body = conclusion(false);
    body.put("nguoi_thuc_hien_id", null);
    Fixture f = new Fixture();
    error(ErrorCode.INVALID_WARRANTY_EVENT, () -> f.call(body));
    var wrong = returned("RAM-SN-001", true);
    wrong.put("loai_thiet_bi", "SAN_PHAM_THAY_THE");
    error(ErrorCode.INVALID_WARRANTY_EVENT, () -> new Fixture().call(wrong));
  }

  @Test
  void historyFailureIsTransactionalAndDoesNotCompleteDedup() {
    Fixture f = new Fixture();
    when(f.workflow.append(any(), anyLong(), anyString(), anyString(), anyString()))
        .thenThrow(new IllegalStateException("simulated persistence failure"));
    var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
    var status = mock(org.springframework.transaction.TransactionStatus.class);
    when(manager.getTransaction(any())).thenReturn(status);
    var factory = new org.springframework.aop.framework.ProxyFactory(f.service);
    factory.addAdvice(
        new org.springframework.transaction.interceptor.TransactionInterceptor(
            manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
    var proxy = (AdminWarrantyEventService) factory.getProxy();
    error(
        ErrorCode.WARRANTY_EVENT_FAILED, () -> proxy.save("501", dto(conclusion(false)), KEY, 8L));
    verify(manager).rollback(status);
    verify(manager, never()).commit(any());
    verify(f.dedup, never()).complete(anyString(), anyString());
  }
}
