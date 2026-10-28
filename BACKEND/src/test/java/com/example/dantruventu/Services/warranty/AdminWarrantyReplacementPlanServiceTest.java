package com.example.dantruventu.Services.warranty;

import static com.example.dantruventu.Services.warranty.AdminWarrantyEventServiceTest.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyReplacementPlanRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyReplacementPlanResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.warranty.WarrantyReplacementRepository;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import org.springframework.security.core.context.SecurityContextHolder;

class AdminWarrantyReplacementPlanServiceTest {
  static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
  static final String EXPIRY = "2027-10-01T10:00:00+07:00";

  static class Fixture extends AdminWarrantyMoneyServiceTest.Fixture {
    WarrantyReplacementRepository replacementRepository = mock(WarrantyReplacementRepository.class);
    WarrantyReplacementResources resources =
        new WarrantyReplacementResources(history, replacementRepository);
    WarrantyReplacementTransactions replacementTransactions;
    AdminWarrantyReplacementPlanService replacementService;
    List<TheKho> issues = new ArrayList<>();
    KhoHang warehouse = KhoHang.builder().id(1L).build();
    PhienBanSanPham variant =
        PhienBanSanPham.builder()
            .id(101L)
            .coQuanLySerial(true)
            .sanPham(
                SanPham.builder()
                    .id(10L)
                    .loaiSanPham(LoaiSanPham.DON)
                    .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
                    .build())
            .build();
    TonKho stock =
        TonKho.builder()
            .id(901L)
            .khoHang(warehouse)
            .phienBan(variant)
            .tonThucTe(10)
            .tonCoTheBan(10)
            .soLuongGiuChoBaoHanh(0)
            .hangLoi(0)
            .build();
    SoSerialSanPham replacementSerial =
        SoSerialSanPham.builder()
            .id(601L)
            .phienBan(variant)
            .trangThai(TrangThaiSerial.GIU_CHO_BAO_HANH)
            .build();

    Fixture() {
      serial.setPhienBan(variant);
      serial.setHanBaoHanh(OffsetDateTime.parse(EXPIRY).toLocalDateTime());
      device.setPhienBan(variant);
      when(replacementRepository.activeVariant(anyLong()))
          .thenAnswer(
              a -> {
                Long id = a.getArgument(0);
                if (!Set.of(101L, 103L).contains(id))
                  throw WarrantyReadException.notFound(
                      ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
                      "phien_ban_thay_the_id",
                      "PRODUCT_VARIANT_NOT_FOUND");
                return variant;
              });
      when(replacementRepository.issues(501L)).thenAnswer(a -> issues);
      when(replacementRepository.stock(901L)).thenReturn(stock);
      when(replacementRepository.serial(601L)).thenReturn(replacementSerial);
      when(replacementRepository.activeHolds(901L))
          .thenReturn(List.of(new WarrantyReplacementRepository.HoldOwner(501L, 1L, 601L, 1)));
      replacementTransactions =
          new WarrantyReplacementTransactions(
              workflow,
              locks,
              histories,
              history,
              details,
              replacementRepository,
              resources,
              new WarrantyMutationSupport(dedup, JSON),
              JSON);
      replacementService = new AdminWarrantyReplacementPlanService(replacementTransactions);
    }

    ApiResponse<AdminWarrantyReplacementPlanResponse> save(Map<String, Object> body) {
      return save(body, UUID.randomUUID().toString(), 8L);
    }

    ApiResponse<AdminWarrantyReplacementPlanResponse> save(
        Map<String, Object> body, String key, Long actor) {
      var r = replacementService.save("501", dto(body), key, actor);
      messageWithoutNumbers(r.getMessage());
      return r;
    }

    Map<String, Object> plan() {
      return history.latestSection(events, "phuong_an_doi");
    }

    void accepted(String source) {
      var body = make();
      body.put("nguon", source);
      save(body);
      save(approve(1));
      save(decision(1, "DONG_Y"));
    }

    void held(boolean managed) {
      stock.setTonCoTheBan(9);
      stock.setSoLuongGiuChoBaoHanh(1);
      variant.setCoQuanLySerial(managed);
      when(replacementRepository.activeHolds(901L))
          .thenReturn(
              List.of(
                  new WarrantyReplacementRepository.HoldOwner(501L, 1L, managed ? 601L : null, 1)));
      add(
          3000,
          "GIU_CHO_HANG_DOI",
          m(
              "giu_cho_hang_doi",
              m(
                  "phien_ban_phuong_an",
                  1,
                  "ton_kho_id",
                  901,
                  "kho_hang_id",
                  1,
                  "phien_ban_id",
                  101,
                  "so_luong",
                  1,
                  "so_serial_id",
                  managed ? 601 : null,
                  "dang_giu",
                  true)));
    }

    void received(boolean shopIssued) {
      var replacement =
          ThietBiBaoHanh.builder()
              .id(701L)
              .chiTietDonHang(line)
              .phienBan(variant)
              .soSerial(replacementSerial)
              .build();
      ticket.setThietBiThayThe(replacement);
      var plan = new LinkedHashMap<>(plan());
      plan.put("thiet_bi_thay_the_id", 701);
      if (shopIssued) {
        issues.add(
            TheKho.builder()
                .id(12001L)
                .phieuBaoHanh(ticket)
                .khoHang(warehouse)
                .phienBan(variant)
                .loaiGiaoDich(LoaiGiaoDichKho.XUAT_DOI_BAO_HANH)
                .soLuongThayDoi(-1)
                .tonCuoi(9)
                .build());
        plan.put("giao_dich_xuat_the_kho_id", 12001);
        stock.setTonThucTe(9);
        stock.setTonCoTheBan(9);
      }
      add(
          3002,
          "NHAN_HANG_DOI",
          m("phuong_an_doi", plan, "noi_dang_giu", m("loai", "CUA_HANG", "thiet_bi_id", 701)));
      ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DA_NHAN_LAI);
    }
  }

  @BeforeEach
  void admin() {
    AdminWarrantyInvoiceServiceTest.role("ADMIN");
  }

  @AfterEach
  void cleanup() {
    SecurityContextHolder.clearContext();
  }

  static AdminWarrantyReplacementPlanRequest dto(Map<String, Object> body) {
    return JSON.readValue(JSON.writeValueAsString(body), AdminWarrantyReplacementPlanRequest.class);
  }

  static Map<String, Object> make() {
    return m(
        "hanh_dong",
        "LAP_PHIEN_BAN",
        "thay_the_phien_ban",
        null,
        "ket_luan_lich_su_id",
        1002,
        "ly_do",
        "Lỗi nhà sản xuất đủ chính sách đổi",
        "can_cu",
        "Biên bản xác minh chính sách",
        "don_vi_phe_duyet",
        "Trung tâm A",
        "phien_ban_thay_the_id",
        101,
        "tinh_trang_hang",
        "Mới",
        "phu_kien",
        BOX,
        "nguon",
        "TON_KHO_CUA_HANG",
        "cach_tinh_han",
        "GIU_HAN_CON_LAI",
        "han_moi_xac_nhan",
        null,
        "can_cu_han",
        "Tiếp tục hạn giao dịch gốc",
        "bao_gia_phien_ban",
        null,
        "huong_xu_ly_thiet_bi_cu",
        "Gửi NCC bù hàng",
        "chung_tu_urls",
        List.of("/media/bh/exchange.jpg"));
  }

  static Map<String, Object> approve(int version) {
    return m(
        "hanh_dong",
        "PHE_DUYET",
        "phien_ban_phuong_an",
        version,
        "ly_do",
        "Cho phép dùng hàng cửa hàng",
        "can_cu",
        "Đủ chính sách đổi");
  }

  static Map<String, Object> decision(int version, String decision) {
    var body =
        m(
            "hanh_dong",
            "QUYET_DINH_KHACH",
            "phien_ban_phuong_an",
            version,
            "quyet_dinh",
            decision,
            "thoi_diem",
            OffsetDateTime.now(VN).toString(),
            "kenh",
            "TAI_QUAY",
            "bang_chung_urls",
            List.of("/media/bh/consent.jpg"));
    if (decision.equals("TU_CHOI")) body.put("ly_do", "Khách không tiếp tục phương án");
    return body;
  }

  static Map<String, Object> cancel(int version) {
    return m(
        "hanh_dong",
        "HUY",
        "phien_ban_phuong_an",
        version,
        "ly_do",
        "Không tiếp tục phương án trước bàn giao");
  }

  static void common(
      AdminWarrantyReplacementPlanResponse data,
      boolean approved,
      boolean accepted,
      String source,
      TrangThaiBaoHanh state) {
    assertEquals(501L, data.get("phieu_bao_hanh_id"));
    assertEquals(1L, data.get("phien_ban_phuong_an"));
    assertEquals(approved, data.get("da_duyet"));
    assertEquals(accepted, data.get("khach_dong_y"));
    assertEquals(source, data.get("nguon"));
    assertEquals(state, data.get("trang_thai_xu_ly"));
    assertEquals(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA, data.get("ket_qua_xu_ly"));
    assertEquals(OffsetDateTime.parse(EXPIRY), data.get("han_bao_hanh_ap_dung"));
    assertEquals(false, data.get("da_ban_giao"));
  }

  @Test
  void e01F01CreationIsOnlyAProposalWithoutStockInvoiceMoneyOrApproval() {
    var f = new Fixture();
    var r = f.save(make()).getData();
    common(r, false, false, "TON_KHO_CUA_HANG", TrangThaiBaoHanh.DANG_KIEM_TRA);
    assertNull(r.get("quyet_dinh_khach"));
    assertNull(r.get("nguoi_phe_duyet_id"));
    assertNull(r.get("phien_ban_truoc"));
    assertNull(r.get("thiet_bi_thay_the_id"));
    assertEquals(10, f.stock.getTonCoTheBan());
    assertTrue(f.cash.isEmpty());
    assertTrue(f.invoices.isEmpty());
    assertEquals(TrangThaiSerial.DANG_BAO_HANH, f.serial.getTrangThai());
    verify(f.replacementRepository, never()).stock(anyLong());
    verify(f.replacementRepository, never()).serial(anyLong());
  }

  @Test
  void e02F02ApprovalRecordsActorAndHistoryButDoesNotReserveOrWaitForGoods() {
    var f = new Fixture();
    f.save(make());
    var r = f.save(approve(1)).getData();
    common(r, true, false, "TON_KHO_CUA_HANG", TrangThaiBaoHanh.DANG_KIEM_TRA);
    assertEquals(8L, r.get("nguoi_phe_duyet_id"));
    assertEquals(f.events.getLast().getId(), r.get("lich_su_phe_duyet_id"));
    assertEquals(r.get("lich_su_phe_duyet_id"), f.history.id(f.plan().get("lich_su_phe_duyet_id")));
    verify(f.replacementRepository, never()).stock(anyLong());
    assertTrue(f.invoices.isEmpty());
  }

  @Test
  void e03F03ApprovedAndAcceptedWithoutGoodsWaitsButNeverFinalizesExchange() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    assertEquals(TrangThaiBaoHanh.CHO_DOI_SAN_PHAM, f.ticket.getTrangThaiXuLy());
    assertEquals(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA, f.ticket.getKetQuaXuLy());
    common(
        f.save(cancel(1)).getData(),
        true,
        true,
        "TON_KHO_CUA_HANG",
        TrangThaiBaoHanh.DANG_KIEM_TRA);
    var previous =
        f.history.object(f.history.payload(f.events.get(f.events.size() - 2)).get("phuong_an_doi"));
    assertEquals("DONG_Y", previous.get("quyet_dinh_khach"));
    assertTrue(Boolean.TRUE.equals(previous.get("khach_dong_y")));
    var accepted =
        f.events.stream()
            .map(f.history::payload)
            .map(p -> f.history.object(p.get("phuong_an_doi")))
            .filter(Objects::nonNull)
            .filter(
                p ->
                    Boolean.TRUE.equals(p.get("khach_dong_y"))
                        && !Boolean.TRUE.equals(p.get("da_huy")))
            .findFirst()
            .orElseThrow();
    assertNull(accepted.get("thiet_bi_thay_the_id"));
    assertEquals(false, accepted.get("da_ban_giao"));
    assertEquals(0, f.stock.getSoLuongGiuChoBaoHanh());
  }

  @Test
  void e05F04RefusalIsImmutableAndKeepsTicketOpen() {
    var f = new Fixture();
    f.save(make());
    f.save(approve(1));
    var r = f.save(decision(1, "TU_CHOI")).getData();
    common(r, true, false, "TON_KHO_CUA_HANG", TrangThaiBaoHanh.DANG_KIEM_TRA);
    assertEquals("TU_CHOI", r.get("quyet_dinh_khach"));
    assertNotNull(r.get("quyet_dinh"));
    error(ErrorCode.WARRANTY_REPLACEMENT_CONFLICT, () -> f.save(decision(1, "DONG_Y")));
    assertEquals(10, f.stock.getTonCoTheBan());
  }

  @Test
  void e06F05NewConfigurationVersionDoesNotInheritApprovalOrDecision() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    String old = JSON.writeValueAsString(f.plan());
    var body = make();
    body.put("thay_the_phien_ban", 1);
    body.put("phien_ban_thay_the_id", 103);
    var r = f.save(body).getData();
    assertEquals(2L, r.get("phien_ban_phuong_an"));
    assertEquals(false, r.get("da_duyet"));
    assertEquals(false, r.get("khach_dong_y"));
    assertNull(r.get("quyet_dinh_khach"));
    assertNull(r.get("nguoi_phe_duyet_id"));
    assertEquals(true, r.get("can_phe_duyet_lai"));
    assertEquals(true, r.get("can_khach_xac_nhan_lai"));
    assertEquals(TrangThaiBaoHanh.DANG_KIEM_TRA, r.get("trang_thai_xu_ly"));
    assertEquals(
        JSON.readTree(old),
        JSON.readTree(
            JSON.writeValueAsString(
                f.history.object(
                    f.history.payload(f.events.get(f.events.size() - 2)).get("phuong_an_doi")))));
    error(ErrorCode.WARRANTY_REPLACEMENT_NOT_APPROVED, () -> f.save(decision(2, "DONG_Y")));
    error(ErrorCode.WARRANTY_REPLACEMENT_CONFLICT, () -> f.save(cancel(1)));
  }

  @Test
  void e07F06SupplierSourceDoesNotClaimFactoryNewOrIncreaseInventory() {
    var f = new Fixture();
    var body = make();
    body.put("nguon", "DON_VI_BAO_HANH");
    body.put("tinh_trang_hang", "Hàng hãng cấp đã kiểm tra");
    var r = f.save(body).getData();
    common(r, false, false, "DON_VI_BAO_HANH", TrangThaiBaoHanh.DANG_KIEM_TRA);
    assertEquals("Hàng hãng cấp đã kiểm tra", r.get("tinh_trang_hang"));
    assertEquals(true, r.get("khong_mac_dinh_hang_moi_nguyen_seal"));
    assertTrue(f.issues.isEmpty());
  }

  @Test
  void e08F07ConfirmedNewExpiryIsOnlyAPlanAndDoesNotRewriteOriginalRights() {
    var f = new Fixture();
    var body = make();
    body.put("nguon", "DON_VI_BAO_HANH");
    body.put("cach_tinh_han", "HAN_MOI_XAC_NHAN");
    body.put("han_moi_xac_nhan", "2029-10-12T14:30:00+07:00");
    var before = f.serial.getHanBaoHanh();
    var r = f.save(body).getData();
    assertEquals(OffsetDateTime.parse("2029-10-12T14:30:00+07:00"), r.get("han_bao_hanh_ap_dung"));
    assertEquals(before, f.serial.getHanBaoHanh());
    assertNull(f.device.getHanBaoHanh());
    assertEquals("HAN_MOI_XAC_NHAN", r.get("cach_tinh_han"));
  }

  @Test
  void e04F08CancelBeforeAssetsPreservesDecisionWithoutInventingStock() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    var r = f.save(cancel(1)).getData();
    common(r, true, true, "TON_KHO_CUA_HANG", TrangThaiBaoHanh.DANG_KIEM_TRA);
    assertEquals(true, r.get("da_huy"));
    assertEquals(true, r.get("da_giai_phong_giu_cho"));
    assertEquals(false, r.get("da_hoan_xuat"));
    assertEquals(false, r.get("hang_can_thu_hoi"));
    assertNull(r.get("thao_tac_tiep_theo"));
    verify(f.replacementRepository, never()).stock(anyLong());
  }

  @TestFactory
  Stream<DynamicTest> e04F09CancelReservedSerialAndNonSerialReleasesExactlyOneUnit() {
    return Stream.of(false, true)
        .map(
            managed ->
                DynamicTest.dynamicTest(
                    "unreserve-" + managed,
                    () -> {
                      var f = new Fixture();
                      f.accepted("TON_KHO_CUA_HANG");
                      f.held(managed);
                      var r = f.save(cancel(1)).getData();
                      assertEquals(10, f.stock.getTonThucTe());
                      assertEquals(10, f.stock.getTonCoTheBan());
                      assertEquals(0, f.stock.getSoLuongGiuChoBaoHanh());
                      assertEquals(
                          m("ton_thuc_te", 0, "ton_co_the_ban", 1, "so_luong_giu_cho_bao_hanh", -1),
                          r.get("bien_dong_ton"));
                      assertNull(r.get("the_kho"));
                      assertEquals(true, r.get("da_giai_phong_giu_cho"));
                      if (managed)
                        assertEquals(TrangThaiSerial.TRONG_KHO, f.replacementSerial.getTrangThai());
                      assertEquals(
                          false,
                          f.history.latestSection(f.events, "giu_cho_hang_doi").get("dang_giu"));
                      error(ErrorCode.WARRANTY_REPLACEMENT_CONFLICT, () -> f.save(cancel(1)));
                      assertEquals(10, f.stock.getTonCoTheBan());
                    }));
  }

  @Test
  void e04F10CancelIssuedItemsCreatesFollowupWithoutRestoringStockOrSerial() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.received(true);
    var r = f.save(cancel(1)).getData();
    assertEquals(9, f.stock.getTonThucTe());
    assertEquals(9, f.stock.getTonCoTheBan());
    assertEquals(0, f.stock.getSoLuongGiuChoBaoHanh());
    assertEquals(TrangThaiSerial.GIU_CHO_BAO_HANH, f.replacementSerial.getTrangThai());
    assertEquals(true, r.get("hang_can_thu_hoi"));
    assertEquals(false, r.get("da_giai_phong_giu_cho"));
    assertEquals("HOAN_XUAT_HANG_DOI", r.get("thao_tac_tiep_theo"));
    assertEquals(12001L, r.get("giao_dich_xuat_the_kho_id"));
    assertEquals(701L, r.get("thiet_bi_thay_the_id"));
    assertEquals(
        m("ton_thuc_te", 0, "ton_co_the_ban", 0, "so_luong_giu_cho_bao_hanh", 0),
        r.get("bien_dong_ton"));
    assertEquals(1, f.issues.size());
    error(
        ErrorCode.WARRANTY_REPLACEMENT_CONFLICT,
        () -> {
          var b = make();
          b.put("thay_the_phien_ban", 1);
          f.save(b);
        });
  }

  @Test
  void e04F11SupplierIssuedItemNeverBecomesShopStock() {
    var f = new Fixture();
    f.accepted("DON_VI_BAO_HANH");
    f.received(false);
    var r = f.save(cancel(1)).getData();
    assertEquals("TRA_HANG_CAP_RIENG_DON_VI", r.get("thao_tac_tiep_theo"));
    assertEquals(true, r.get("hang_can_thu_hoi"));
    assertEquals(10, f.stock.getTonCoTheBan());
    assertEquals(TrangThaiSerial.GIU_CHO_BAO_HANH, f.replacementSerial.getTrangThai());
    assertTrue(f.issues.isEmpty());
    verify(f.replacementRepository, never()).stock(anyLong());
  }

  @Test
  void f12ConsentCannotReplaceApproval() {
    var f = new Fixture();
    f.save(make());
    int size = f.events.size();
    var e = assertThrows(WarrantyReadException.class, () -> f.save(decision(1, "DONG_Y")));
    assertEquals("REPLACEMENT_NOT_APPROVED", e.getErrors().getFirst().code());
    assertEquals("phien_ban_phuong_an", e.getErrors().getFirst().field());
    assertEquals(size, f.events.size());
  }

  @TestFactory
  Stream<DynamicTest> f13CannotCancelAfterHandoverRegardlessOfReportedPlanFlags() {
    return Stream.of("ticket", "history", "plan")
        .map(
            kind ->
                DynamicTest.dynamicTest(
                    kind,
                    () -> {
                      var f = new Fixture();
                      f.accepted("TON_KHO_CUA_HANG");
                      if (kind.equals("ticket"))
                        f.ticket.setTrangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT);
                      if (kind.equals("history"))
                        f.add(3003, "HANDOVER", m("giao_nhan", m("thiet_bi_id", 701)));
                      if (kind.equals("plan")) {
                        var p = new LinkedHashMap<>(f.plan());
                        p.put("da_ban_giao", true);
                        f.add(3003, "HANDOVER_PLAN", m("phuong_an_doi", p));
                      }
                      var e = assertThrows(WarrantyReadException.class, () -> f.save(cancel(1)));
                      assertEquals(
                          "REPLACEMENT_ALREADY_HANDED_OVER", e.getErrors().getFirst().code());
                      verify(f.replacementRepository, never()).stock(anyLong());
                    }));
  }

  @Test
  void f14ReplayDoesNotCreateAnotherVersionOrReleaseAgainAndChangedContentActorPathIsRejected() {
    var f = new Fixture();
    var body = make();
    var first = f.save(body, KEY, 8L);
    int n = f.events.size();
    assertEquals(
        JSON.readTree(JSON.writeValueAsString(first)),
        JSON.readTree(JSON.writeValueAsString(f.save(body, KEY, 8L))));
    assertEquals(n, f.events.size());
    var changed = make();
    changed.put("ly_do", "Đổi lý do");
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.save(changed, KEY, 8L));
    error(ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED, () -> f.save(body, KEY, 9L));
    error(
        ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
        () -> f.replacementService.save("502", dto(body), KEY, 8L));
    f.save(approve(1));
    f.save(decision(1, "DONG_Y"));
    f.held(true);
    String cancelKey = UUID.randomUUID().toString();
    var cancelled = f.save(cancel(1), cancelKey, 8L);
    f.save(cancel(1), cancelKey, 8L);
    assertEquals(10, f.stock.getTonCoTheBan());
    assertEquals(true, cancelled.getData().get("da_giai_phong_giu_cho"));
    verify(f.replacementRepository, times(1)).stock(901L);
  }

  @Test
  void newlyQuotedFeesRequireIndependentQuoteConsentAndInvoiceNotMarketPrice() {
    var f = new Fixture();
    f.create(AdminWarrantyQuoteServiceTest.first());
    var body = make();
    body.put("bao_gia_phien_ban", 1);
    f.save(body);
    f.save(approve(1));
    error(ErrorCode.WARRANTY_REPLACEMENT_QUOTE_NOT_APPROVED, () -> f.save(decision(1, "DONG_Y")));
    f.event(1, AdminWarrantyQuoteEventServiceTest.send());
    f.event(1, AdminWarrantyQuoteEventServiceTest.decision("DONG_Y"));
    var r = f.save(decision(1, "DONG_Y")).getData();
    assertEquals(TrangThaiBaoHanh.CHO_DOI_SAN_PHAM, r.get("trang_thai_xu_ly"));
    assertEquals(1, f.invoices.size());
    assertTrue(f.cash.isEmpty());
    assertEquals(150000, f.invoices.getFirst().getTongTien().intValueExact());
  }

  @Test
  void pendingQuoteVersionCanBeProposedButNeverAcceptedUsingOldConsent() {
    var f = new Fixture();
    f.approved(false);
    f.create(AdminWarrantyQuoteServiceTest.second());
    var body = make();
    body.put("bao_gia_phien_ban", 2);
    f.save(body);
    f.save(approve(1));
    error(ErrorCode.WARRANTY_REPLACEMENT_QUOTE_NOT_APPROVED, () -> f.save(decision(1, "DONG_Y")));
  }

  @Test
  void noSerialOriginalUsesItsSavedExpiryAndMissingExpiryIsNotInvented() {
    var f = new Fixture();
    f.device.setSoSerial(null);
    f.ticket.setSoSerial(null);
    f.device.setHanBaoHanh(OffsetDateTime.parse(EXPIRY).toLocalDateTime());
    assertEquals(
        OffsetDateTime.parse(EXPIRY), f.save(make()).getData().get("han_bao_hanh_ap_dung"));
    var missing = new Fixture();
    missing.serial.setHanBaoHanh(null);
    error(ErrorCode.WARRANTY_REPLACEMENT_POLICY_INVALID, () -> missing.save(make()));
  }

  @Test
  void expiryIsJudgedAtValidIntakeNotAtTheDateRepairFinishes() {
    var f = new Fixture();
    f.serial.setHanBaoHanh(LocalDateTime.of(2026, 10, 13, 9, 0));
    var r = f.save(make()).getData();
    assertEquals(OffsetDateTime.parse("2026-10-13T09:00:00+07:00"), r.get("han_bao_hanh_ap_dung"));
  }

  @Test
  void oldDeviceStillAtProviderIsNotFalselyMarkedBackAtShopOnCancellation() {
    var f = new Fixture();
    f.add(3000, "GUI_DON_VI", m("noi_dang_giu", m("loai", "DON_VI_BAO_HANH", "thiet_bi_id", 700)));
    f.ticket.setTrangThaiXuLy(TrangThaiBaoHanh.DANG_BAO_HANH);
    f.accepted("TON_KHO_CUA_HANG");
    var r = f.save(cancel(1)).getData();
    assertEquals(TrangThaiBaoHanh.DANG_BAO_HANH, r.get("trang_thai_xu_ly"));
    assertEquals("DON_VI_BAO_HANH", f.history.latestSection(f.events, "noi_dang_giu").get("loai"));
  }

  @TestFactory
  Stream<DynamicTest> malformedDtosNeverStartTransaction() {
    List<Map<String, Object>> cases = new ArrayList<>();
    for (String field :
        List.of(
            "ket_luan_lich_su_id",
            "ly_do",
            "can_cu",
            "don_vi_phe_duyet",
            "phien_ban_thay_the_id",
            "tinh_trang_hang",
            "phu_kien",
            "nguon",
            "cach_tinh_han",
            "can_cu_han",
            "huong_xu_ly_thiet_bi_cu",
            "chung_tu_urls")) {
      var b = make();
      b.remove(field);
      cases.add(b);
    }
    for (String field :
        List.of(
            "nguoi_phe_duyet_id",
            "tong_tien",
            "thiet_bi_thay_the_id",
            "han_bao_hanh_ap_dung",
            "da_duyet")) {
      var b = make();
      b.put(field, null);
      cases.add(b);
    }
    var wrongSource = make();
    wrongSource.put("nguon", "NHA_CUNG_CAP");
    cases.add(wrongSource);
    var wrongDeadline = make();
    wrongDeadline.put("han_moi_xac_nhan", EXPIRY);
    cases.add(wrongDeadline);
    var missingDeadline = make();
    missingDeadline.put("cach_tinh_han", "HAN_MOI_XAC_NHAN");
    cases.add(missingDeadline);
    var empty = make();
    empty.put("chung_tu_urls", List.of());
    cases.add(empty);
    var floatId = make();
    floatId.put("phien_ban_thay_the_id", 101.5);
    cases.add(floatId);
    var fractional = make();
    fractional.put("phu_kien", List.of(m("ten", "Hộp", "so_luong", 0.5)));
    cases.add(fractional);
    var missingEvidence = decision(1, "DONG_Y");
    missingEvidence.put("bang_chung_urls", List.of());
    cases.add(missingEvidence);
    var noReason = decision(1, "TU_CHOI");
    noReason.remove("ly_do");
    cases.add(noReason);
    var invalidDate = decision(1, "DONG_Y");
    invalidDate.put("thoi_diem", "2026-02-30T10:00:00+07:00");
    cases.add(invalidDate);
    return cases.stream()
        .map(
            body ->
                DynamicTest.dynamicTest(
                    body.toString(),
                    () -> {
                      var txn = mock(WarrantyReplacementTransactions.class);
                      var service = new AdminWarrantyReplacementPlanService(txn);
                      error(
                          ErrorCode.INVALID_WARRANTY_REPLACEMENT,
                          () -> service.save("501", dto(body), KEY, 8L));
                      verifyNoInteractions(txn);
                    }));
  }

  @Test
  void approvalAndNewExpiryNeedAdminAndActorAlwaysComesFromAuthentication() {
    var f = new Fixture();
    f.save(make());
    AdminWarrantyInvoiceServiceTest.role("EMPLOYEE");
    error(ErrorCode.WARRANTY_REPLACEMENT_APPROVAL_FORBIDDEN, () -> f.save(approve(1)));
    var body = make();
    body.put("cach_tinh_han", "HAN_MOI_XAC_NHAN");
    body.put("han_moi_xac_nhan", EXPIRY);
    error(ErrorCode.WARRANTY_REPLACEMENT_APPROVAL_FORBIDDEN, () -> f.save(body));
    error(ErrorCode.UNAUTHORIZED, () -> f.save(make(), KEY, null));
  }

  @Test
  void missingKeyUnknownVersionsOrVariantDoNotWriteHistory() {
    var f = new Fixture();
    error(ErrorCode.INVALID_WARRANTY_REPLACEMENT, () -> f.save(make(), null, 8L));
    error(ErrorCode.NOT_FOUND, () -> f.save(approve(1)));
    var b = make();
    b.put("phien_ban_thay_the_id", 999);
    error(ErrorCode.PRODUCT_VARIANT_NOT_FOUND, () -> f.save(b));
    var missing = make();
    missing.put("ket_luan_lich_su_id", 999);
    error(ErrorCode.NOT_FOUND, () -> f.save(missing));
    f.save(make());
    error(ErrorCode.WARRANTY_REPLACEMENT_CONFLICT, () -> f.save(make()));
  }

  @Test
  void unsupportedOrSupersededConclusionAndPastNewExpiryAreRejected() {
    var f = new Fixture();
    var payload = f.history.payload(f.events.getLast());
    var report = f.history.object(payload.get("ket_luan"));
    for (Object raw : f.history.array(report.get("hang_muc")))
      ((Map<String, Object>) raw).put("dieu_kien_bao_hanh", "KHONG_DU_DIEU_KIEN");
    payload.put("ket_luan", report);
    f.events.getLast().setDuLieuChiTiet(JSON.writeValueAsString(payload));
    error(ErrorCode.WARRANTY_REPLACEMENT_POLICY_INVALID, () -> f.save(make()));
    var old = new Fixture();
    old.add(
        1003,
        "GHI_KET_LUAN",
        m(
            "ket_luan",
            old.history.object(old.history.payload(old.events.getLast()).get("ket_luan"))));
    error(ErrorCode.WARRANTY_REPLACEMENT_POLICY_INVALID, () -> old.save(make()));
    var expired = new Fixture();
    var body = make();
    body.put("cach_tinh_han", "HAN_MOI_XAC_NHAN");
    body.put("han_moi_xac_nhan", "2000-01-01T00:00:00+07:00");
    error(ErrorCode.WARRANTY_REPLACEMENT_POLICY_INVALID, () -> expired.save(body));
  }

  @TestFactory
  Stream<DynamicTest> heldCounterOrOwnershipMismatchNeverReleasesStock() {
    return Stream.of(
            "counter", "owner", "serial", "warehouse", "duplicate-owner", "other-stock-owner")
        .map(
            kind ->
                DynamicTest.dynamicTest(
                    kind,
                    () -> {
                      var f = new Fixture();
                      f.accepted("TON_KHO_CUA_HANG");
                      f.held(true);
                      switch (kind) {
                        case "counter" -> f.stock.setSoLuongGiuChoBaoHanh(0);
                        case "owner" ->
                            when(f.replacementRepository.activeHolds(901L))
                                .thenReturn(
                                    List.of(
                                        new WarrantyReplacementRepository.HoldOwner(
                                            502L, 1L, 601L, 1)));
                        case "serial" -> f.replacementSerial.setTrangThai(TrangThaiSerial.DA_BAN);
                        case "other-stock-owner" ->
                            when(f.replacementRepository.serialHeldByAnotherPlan(601L, 501L, 1L))
                                .thenReturn(true);
                        case "warehouse" -> f.stock.setKhoHang(KhoHang.builder().id(2L).build());
                        case "duplicate-owner" ->
                            when(f.replacementRepository.activeHolds(901L))
                                .thenReturn(
                                    List.of(
                                        new WarrantyReplacementRepository.HoldOwner(
                                            501L, 1L, 601L, 1),
                                        new WarrantyReplacementRepository.HoldOwner(
                                            502L, 1L, 601L, 1)));
                      }
                      error(ErrorCode.INVALID_WARRANTY_HISTORY, () -> f.save(cancel(1)));
                      assertEquals(9, f.stock.getTonCoTheBan());
                      assertFalse(Boolean.TRUE.equals(f.plan().get("da_huy")));
                    }));
  }

  @Test
  void cannotReplacePlanWhileHoldingOrHavingReceivedPhysicalItems() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.held(true);
    var body = make();
    body.put("thay_the_phien_ban", 1);
    error(ErrorCode.WARRANTY_REPLACEMENT_CONFLICT, () -> f.save(body));
    assertEquals(9, f.stock.getTonCoTheBan());
  }

  @Test
  void auditPersistenceFailureRollsBackReleaseAndDoesNotCompleteIdempotency() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    f.held(true);
    doThrow(new IllegalStateException("simulated plan persistence failure"))
        .when(f.replacementRepository)
        .flush();
    var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
    var status = mock(org.springframework.transaction.TransactionStatus.class);
    when(manager.getTransaction(any())).thenReturn(status);
    var proxy = new org.springframework.aop.framework.ProxyFactory(f.replacementTransactions);
    proxy.addAdvice(
        new org.springframework.transaction.interceptor.TransactionInterceptor(
            manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
    var service =
        new AdminWarrantyReplacementPlanService((WarrantyReplacementTransactions) proxy.getProxy());
    clearInvocations(f.dedup);
    error(
        ErrorCode.WARRANTY_REPLACEMENT_FAILED, () -> service.save("501", dto(cancel(1)), KEY, 8L));
    verify(manager).rollback(status);
    verify(manager, never()).commit(any());
    verify(f.dedup, never()).complete(any(), any());
  }

  @Test
  void concurrentProposalsUsingTheSamePreviousVersionCannotLoseAnUpdate() {
    var f = new Fixture();
    f.save(make());
    var first = make();
    first.put("thay_the_phien_ban", 1);
    f.save(first);
    var stale = make();
    stale.put("thay_the_phien_ban", 1);
    stale.put("tinh_trang_hang", "Một phương án đồng thời khác");
    error(ErrorCode.WARRANTY_REPLACEMENT_CONFLICT, () -> f.save(stale));
    assertEquals(2L, f.history.id(f.plan().get("phien_ban")));
  }

  @Test
  void planApprovalCannotContinueAfterTheReplacementVariantStopsSelling() {
    var f = new Fixture();
    f.save(make());
    int count = f.events.size();
    when(f.replacementRepository.activeVariant(101L))
        .thenThrow(new AppException(ErrorCode.WARRANTY_REPLACEMENT_POLICY_INVALID));
    error(ErrorCode.WARRANTY_REPLACEMENT_POLICY_INVALID, () -> f.save(approve(1)));
    assertEquals(count, f.events.size());
    assertEquals(false, f.plan().get("da_duyet"));
  }

  @Test
  void cannotRewriteApprovedConfigurationOrConsentInsideTheSameVersion() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    var changed = new LinkedHashMap<>(f.plan());
    changed.put("phien_ban_thay_the_id", 103);
    f.add(3000, "BROKEN_PLAN", m("phuong_an_doi", changed));
    error(ErrorCode.INVALID_WARRANTY_HISTORY, () -> f.save(cancel(1)));
    assertEquals(10, f.stock.getTonCoTheBan());
  }

  @Test
  void missingReservationEvidenceOrUntrackedIssueNeverPretendsNothingWasAllocated() {
    var f = new Fixture();
    f.accepted("TON_KHO_CUA_HANG");
    var changed = new LinkedHashMap<>(f.plan());
    changed.put("da_giu_cho", true);
    f.add(3000, "BROKEN_HOLD", m("phuong_an_doi", changed));
    error(ErrorCode.INVALID_WARRANTY_HISTORY, () -> f.save(cancel(1)));
    var other = new Fixture();
    other.issues.add(TheKho.builder().id(12001L).build());
    error(ErrorCode.INVALID_WARRANTY_HISTORY, () -> other.save(make()));
  }

  @Test
  void creatingAPlanInvalidatesPreviousReadinessAndDetailExposesCancellation() throws Exception {
    var f = new Fixture();
    f.ticket.setTrangThaiXuLy(TrangThaiBaoHanh.CHO_TRA_KHACH);
    f.ticket.setKetQuaXuLy(KetQuaXuLyBaoHanh.SUA_THANH_CONG);
    f.add(1999, "SAN_SANG_TRA", m("san_sang_tra", m("thiet_bi_se_tra_id", 700)));
    var created = f.save(make()).getData();
    assertEquals(TrangThaiBaoHanh.DANG_KIEM_TRA, created.get("trang_thai_xu_ly"));
    assertEquals(KetQuaXuLyBaoHanh.CHUA_CO_KET_QUA, created.get("ket_qua_xu_ly"));
    assertNull(f.history.latestSection(f.events, "san_sang_tra"));
    f.save(cancel(1));
    var detail =
        new AdminWarrantyDetailService(
            f.details, f.histories, f.history, mock(WarrantyDeviceResolver.class));
    var method =
        AdminWarrantyDetailService.class.getDeclaredMethod(
            "exchange", Map.class, PhieuBaoHanh.class);
    method.setAccessible(true);
    var output = (Map<?, ?>) method.invoke(detail, f.plan(), f.ticket);
    assertEquals(true, output.get("da_huy"));
    assertEquals(101, output.get("phien_ban_thay_the_id"));
    assertTrue(f.cash.isEmpty());
    assertTrue(f.invoices.isEmpty());
  }

  @Test
  void devicesAlreadyReturnedOrSerialsNoLongerInWarrantyCannotBeProposed() {
    var returned = new Fixture();
    returned.device.setChiTietTraHang(ChiTietTraHang.builder().id(90L).build());
    error(ErrorCode.WARRANTY_REPLACEMENT_CONFLICT, () -> returned.save(make()));
    var serial = new Fixture();
    serial.serial.setTrangThai(TrangThaiSerial.DA_THAY_THE_BAO_HANH);
    error(ErrorCode.WARRANTY_REPLACEMENT_CONFLICT, () -> serial.save(make()));
  }
}
