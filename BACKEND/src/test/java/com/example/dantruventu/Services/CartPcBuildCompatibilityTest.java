package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.CartPcBuildRequest;
import com.example.dantruventu.DTO.Request.PcBuilderPreviewRequest;
import com.example.dantruventu.DTO.Response.CartPcBuildResponse;
import com.example.dantruventu.Entity.GioHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.TonKho;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.GioHangRepository;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

class CartPcBuildCompatibilityTest {
  private static final String KEY = "8f4b6a10-8632-4c37-8797-b47f371f14fa";
  private static final String GUEST = "d8844334-8ef8-477d-965c-4e730568a78b";
  private static final String PAIR =
      """
      {"items":[
        {"ma_hang_muc":"CPU","phien_ban_id":101,"so_luong":1,"don_gia_xac_nhan":12490000},
        {"ma_hang_muc":"MAIN","phien_ban_id":201,"so_luong":1,"don_gia_xac_nhan":5990000}
      ]}
      """;

  private static class Fixture {
    final PcBuilderExportServiceTest.Fixture catalog = new PcBuilderExportServiceTest.Fixture();
    final GioHangRepository carts = mock(GioHangRepository.class);
    final NguoiDungRepository users = mock(NguoiDungRepository.class);
    final EntityManager entities = mock(EntityManager.class);
    final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
    final SalesIdempotencyRepository dedup = mock(SalesIdempotencyRepository.class);
    final SalesCalculationService sales = mock(SalesCalculationService.class);
    final CartGuestStore guests = mock(CartGuestStore.class);
    final NguoiDung user =
        NguoiDung.builder().id(8L).trangThai(TrangThaiCoBanEnum.HOAT_DONG).build();
    final List<GioHang> rows = new ArrayList<>();
    final Map<String, String> guestRows = new LinkedHashMap<>();
    final Map<String, SalesIdempotencyRepository.Entry> entries = new HashMap<>();
    final Map<String, CartPcBuildResponse> guestResults = new HashMap<>();
    final Map<String, String> guestHashes = new HashMap<>();
    final CartService service;

    Fixture() {
      when(transactions.getTransaction(any())).thenAnswer(a -> new SimpleTransactionStatus());
      when(users.findForCartUpdate(user.getId())).thenReturn(Optional.of(user));
      when(carts.findByNguoiDungIdOrderByNgayCapNhatDesc(user.getId())).thenAnswer(a -> rows);
      when(catalog.variants.getReferenceById(anyLong()))
          .thenAnswer(a -> catalog.data.get(a.getArgument(0)));
      when(carts.save(any()))
          .thenAnswer(
              a -> {
                GioHang row = a.getArgument(0);
                if (!rows.contains(row)) rows.add(row);
                return row;
              });
      when(dedup.acquire(anyString(), anyLong(), anyString()))
          .thenAnswer(
              a -> {
                String key = a.getArgument(0);
                return entries.computeIfAbsent(
                    key,
                    ignored ->
                        new SalesIdempotencyRepository.Entry(
                            a.getArgument(1), a.getArgument(2), null));
              });
      doAnswer(
              a -> {
                String key = a.getArgument(0);
                var prior = entries.get(key);
                entries.put(
                    key,
                    new SalesIdempotencyRepository.Entry(
                        prior.actorId(), prior.requestHash(), a.getArgument(1)));
                return null;
              })
          .when(dedup)
          .complete(anyString(), anyString());
      var units =
          Map.of(
              101L,
              Map.of(101L, 1),
              201L,
              Map.of(201L, 1),
              301L,
              Map.of(301L, 1),
              901L,
              Map.of(301L, 2));
      when(sales.catalog(anyCollection(), anyBoolean()))
          .thenReturn(new SalesCalculationService.Catalog(catalog.data, units));
      when(sales.physicalDemand(any(), anyMap())).thenCallRealMethod();
      when(sales.stock(eq(1L), anyLong(), anyBoolean()))
          .thenAnswer(
              a -> {
                Long available = catalog.available.get(a.getArgument(1));
                return available == null
                    ? null
                    : TonKho.builder().tonCoTheBan(available.intValue()).build();
              });
      when(guests.prepare(GUEST, true)).thenReturn(GUEST);
      when(guests.snapshot(GUEST)).thenAnswer(a -> new LinkedHashMap<>(guestRows));
      when(guests.replay(eq(GUEST), anyString(), anyString()))
          .thenAnswer(
              a -> {
                String key = a.getArgument(1);
                if (guestHashes.containsKey(key) && !guestHashes.get(key).equals(a.getArgument(2)))
                  throw new AppException(ErrorCode.CART_PC_BUILD_IDEMPOTENCY_CONFLICT);
                return guestResults.get(key);
              });
      when(guests.commit(eq(GUEST), anyString(), anyString(), anyMap(), any()))
          .thenAnswer(
              a -> {
                assertEquals(guestRows, a.getArgument(3));
                CartPcBuildResponse result = a.getArgument(4);
                result
                    .items()
                    .forEach(
                        item ->
                            guestRows.put(
                                item.phienBanId().toString(), Integer.toString(item.soLuongSau())));
                guestHashes.put(a.getArgument(1), a.getArgument(2));
                guestResults.put(a.getArgument(1), result);
                return result;
              });
      service =
          new CartService(
              carts,
              catalog.variants,
              mock(StringRedisTemplate.class),
              users,
              entities,
              transactions,
              dedup,
              catalog.builder,
              new PcBuilderStockSupport(catalog.stocks),
              sales,
              guests,
              catalog.json);
    }

    CartPcBuildRequest request(String body) {
      return catalog.json.readValue(body, CartPcBuildRequest.class);
    }

    CartPcBuildResponse add(boolean loggedIn, String body) {
      return service.addPcBuild(
          loggedIn ? user : null, loggedIn ? null : GUEST, KEY, request(body));
    }

    void existing(boolean loggedIn, long id, int quantity) {
      if (loggedIn) {
        var variant =
            id == 901L
                ? com.example.dantruventu.Entity.PhienBanSanPham.builder().id(id).build()
                : catalog.data.get(id);
        rows.add(
            GioHang.builder().id(id).nguoiDung(user).phienBan(variant).soLuong(quantity).build());
      } else guestRows.put(Long.toString(id), Integer.toString(quantity));
    }

    void noCartWrite() {
      verify(carts, never()).save(any());
      verify(carts, never()).flush();
      verify(dedup, never()).complete(anyString(), anyString());
      verify(guests, never()).commit(anyString(), anyString(), anyString(), anyMap(), any());
      verify(transactions).rollback(any());
      verify(transactions, never()).commit(any());
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void mismatchedCpuSupportIsAdvisoryForBothCartOwners(boolean loggedIn) {
    var f = new Fixture();
    f.catalog.data.get(201L).getSanPham().setThongSoKyThuat("{\"CPU hỗ trợ\":\"AMD Ryzen\"}");
    var preview =
        f.catalog.builder.preview(
            new PcBuilderPreviewRequest(
                List.of(
                    new PcBuilderPreviewRequest.Item("CPU", 101, 1),
                    new PcBuilderPreviewRequest.Item("MAIN", 201, 1))));
    assertEquals("KHONG_KHOP_CPU_HO_TRO", preview.kiemTraCpuMain().trangThai());
    assertFalse(preview.loi().isEmpty());
    assertTrue(preview.coTheGuiYeuCauThemGio());
    var result = f.add(loggedIn, PAIR);
    assertEquals(2, result.soHangMucDaThem());
    assertEquals(2, result.soPhienBanDaCapNhat());
    assertEquals(2, result.tongSoLuongDaThem());
    assertTrue(result.items().stream().allMatch(item -> item.soLuongSau() == 1));
    verify(f.transactions).commit(any());
    verify(f.transactions, never()).rollback(any());
    if (loggedIn) verify(f.carts, times(2)).save(any());
    else verify(f.guests).commit(eq(GUEST), eq(KEY), anyString(), anyMap(), eq(result));
    verify(f.catalog.stocks, never()).save(any());
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void ordinarySpecificationsAndMissingJsonDoNotBlockPurchase(boolean loggedIn) {
    for (String specifications :
        Arrays.asList(null, "{}", "{\"loai_ram\":\"DDR5\",\"chipset\":\"B760\"}", "not-json")) {
      var f = new Fixture();
      f.catalog.data.get(201L).getSanPham().setThongSoKyThuat(specifications);
      assertEquals(2, f.add(loggedIn, PAIR).items().size());
      verify(f.transactions).commit(any());
      verify(f.transactions, never()).rollback(any());
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void changedPriceStillRejectsEntireConfigurationBeforeAnyWrite(boolean loggedIn) {
    var f = new Fixture();
    f.catalog.data.get(201L).getSanPham().setThongSoKyThuat("{}");
    var error =
        assertThrows(AppException.class, () -> f.add(loggedIn, PAIR.replace("5990000", "1")));
    assertEquals(ErrorCode.CART_PC_BUILD_PRICE_CHANGED, error.getErrorCode());
    f.noCartWrite();
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void repeatedSsdDemandIncludesExistingCartQuantityAndRollsBack(boolean loggedIn) {
    var f = new Fixture();
    f.existing(loggedIn, 301L, 1);
    f.catalog.available.put(301L, 2L);
    var error =
        assertThrows(AppException.class, () -> f.add(loggedIn, PcBuilderExportServiceTest.BODY));
    assertEquals(ErrorCode.CART_PC_BUILD_INSUFFICIENT_STOCK, error.getErrorCode());
    f.noCartWrite();
    if (loggedIn) assertEquals(1, f.rows.getFirst().getSoLuong());
    else assertEquals(Map.of("301", "1"), f.guestRows);
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void comboComponentsShareStockWithSsdSelections(boolean loggedIn) {
    var f = new Fixture();
    f.existing(loggedIn, 901L, 1);
    f.catalog.available.put(301L, 3L);
    var error =
        assertThrows(AppException.class, () -> f.add(loggedIn, PcBuilderExportServiceTest.BODY));
    assertEquals(ErrorCode.CART_PC_BUILD_INSUFFICIENT_STOCK, error.getErrorCode());
    f.noCartWrite();
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void replayDoesNotApplyAnIncompatibleBuildTwice(boolean loggedIn) {
    var f = new Fixture();
    f.catalog.data.get(201L).getSanPham().setThongSoKyThuat("{\"CPU hỗ trợ\":\"AMD Ryzen\"}");
    var first = f.add(loggedIn, PAIR);
    var replay = f.add(loggedIn, PAIR);
    assertEquals(first, replay);
    verify(f.sales, times(1)).catalog(anyCollection(), anyBoolean());
    if (loggedIn) {
      verify(f.carts, times(2)).save(any());
      verify(f.dedup, times(1)).complete(anyString(), anyString());
    } else verify(f.guests, times(1)).commit(eq(GUEST), eq(KEY), anyString(), anyMap(), any());
    verify(f.transactions, never()).rollback(any());
  }
}
