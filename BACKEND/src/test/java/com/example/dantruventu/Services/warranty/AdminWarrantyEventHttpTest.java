package com.example.dantruventu.Services.warranty;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Config.*;
import com.example.dantruventu.Controller.warranty.AdminWarrantyController;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.*;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.warranty.WarrantyQuoteEventRepository;
import com.example.dantruventu.Repository.warranty.WarrantyQuoteRepository;
import com.example.dantruventu.Services.JwtService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.core.env.MapPropertySource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;

class AdminWarrantyEventHttpTest {
  @Configuration
  @EnableWebMvc
  @org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
  @Import(SecurityConfig.class)
  static class Web {
    @Bean
    AdminWarrantyEventServiceTest.Fixture fixture() {
      return new AdminWarrantyHandoverServiceTest.Fixture();
    }

    @Bean
    JwtService jwt() {
      return mock(JwtService.class);
    }

    @Bean
    NguoiDungRepository users() {
      return mock(NguoiDungRepository.class);
    }

    @Bean
    JwtAuthFilter filter(JwtService jwt, NguoiDungRepository users) {
      return new JwtAuthFilter(jwt, users);
    }

    @Bean
    JwtAuthenticationEntryPoint entry() {
      return new JwtAuthenticationEntryPoint(new ObjectMapper());
    }

    @Bean
    JwtAccessDeniedHandler denied() {
      return new JwtAccessDeniedHandler(new ObjectMapper());
    }

    @Bean
    GlobalExceptionHandler errors() {
      return new GlobalExceptionHandler();
    }

    @Bean
    AdminWarrantyQuoteService quotes(AdminWarrantyEventServiceTest.Fixture f) {
      var repository = mock(WarrantyQuoteRepository.class);
      doAnswer(
              a -> {
                ChiTietPhiBaoHanh fee = a.getArgument(0);
                fee.setId(5000L + f.fees.size());
                f.fees.add(fee);
                return null;
              })
          .when(repository)
          .insert(any());
      return new AdminWarrantyQuoteService(
          f.workflow,
          f.locks,
          f.histories,
          f.history,
          f.details,
          repository,
          new WarrantyMutationSupport(f.dedup, AdminWarrantyEventServiceTest.JSON),
          AdminWarrantyEventServiceTest.JSON);
    }

    @Bean
    AdminWarrantyQuoteEventService quoteEvents(AdminWarrantyEventServiceTest.Fixture f) {
      var repository = mock(WarrantyQuoteEventRepository.class);
      doAnswer(
              a -> {
                HoaDonBaoHanh invoice = a.getArgument(0);
                invoice.setId(801L);
                invoice.setMaHoaDon("HDBH-801");
                f.invoices.add(invoice);
                return null;
              })
          .when(repository)
          .insertInvoice(any(), anyLong());
      return new AdminWarrantyQuoteEventService(
          new WarrantyQuoteEventTransactions(
              f.workflow,
              f.locks,
              f.histories,
              f.history,
              f.details,
              repository,
              new WarrantyMutationSupport(f.dedup, AdminWarrantyEventServiceTest.JSON),
              AdminWarrantyEventServiceTest.JSON));
    }

    @Bean
    AdminWarrantyController controller(
        AdminWarrantyEventServiceTest.Fixture f,
        AdminWarrantyQuoteService quotes,
        AdminWarrantyQuoteEventService quoteEvents) {
      return new AdminWarrantyController(
          mock(AdminWarrantyService.class),
          mock(AdminWarrantyLookupService.class),
          mock(AdminWarrantyDetailService.class),
          mock(AdminWarrantyCreateService.class),
          mock(AdminWarrantyIntakeResultService.class),
          mock(AdminWarrantyStatusService.class),
          f.service,
          quotes,
          quoteEvents,
          new AdminWarrantyInvoiceService(
              new WarrantyInvoiceTransactions(
                  f.workflow,
                  f.locks,
                  f.histories,
                  f.history,
                  f.details,
                  mock(WarrantyQuoteEventRepository.class),
                  new WarrantyMutationSupport(f.dedup, AdminWarrantyEventServiceTest.JSON),
                  AdminWarrantyEventServiceTest.JSON)),
          ((AdminWarrantyMoneyServiceTest.Fixture) f).moneyService,
          ((AdminWarrantyReplacementPlanServiceTest.Fixture) f).replacementService,
          ((AdminWarrantyReplacementItemsServiceTest.Fixture) f).itemsService,
          ((AdminWarrantySupplierSettlementServiceTest.Fixture) f).settlementsService,
          ((AdminWarrantyHandoverServiceTest.Fixture) f).handoverService);
    }
  }

  private static MockHttpServletResponse request(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post("/api/v1/admin/warranties/" + id + "/events")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  @Test
  void routeUsesExistingJwtAndRoleRulesAndGlobalErrors() throws Exception {
    try (var context = new AnnotationConfigWebApplicationContext()) {
      context.setServletContext(new MockServletContext());
      context
          .getEnvironment()
          .getPropertySources()
          .addFirst(
              new MapPropertySource(
                  "offline",
                  Map.of(
                      "jwt.secret",
                      "test-only-offline-secret",
                      "jwt.access-token-expiration",
                      "3600000",
                      "jwt.refresh-token-expiration",
                      "86400000",
                      "jwt.refresh-token-remember-expiration",
                      "172800000")));
      context.register(Web.class);
      context.refresh();
      var jwt = context.getBean(JwtService.class);
      var users = context.getBean(NguoiDungRepository.class);
      for (int n = 0; n < 3; n++) {
        String token = List.of("admin", "user", "blocked").get(n);
        long id = 8L + n;
        when(jwt.isAccessTokenValid(token)).thenReturn(true);
        when(jwt.getUserIdFromToken(token)).thenReturn(id);
        when(users.findByIdWithVaiTro(id))
            .thenReturn(
                Optional.of(
                    NguoiDung.builder()
                        .id(id)
                        .trangThai(
                            n == 2
                                ? TrangThaiCoBanEnum.NGUNG_HOAT_DONG
                                : TrangThaiCoBanEnum.HOAT_DONG)
                        .vaiTro(
                            VaiTro.builder()
                                .id((long) n + 1)
                                .tenVaiTro(n == 1 ? "USER" : "ADMIN")
                                .build())
                        .build()));
      }
      var mvc =
          MockMvcBuilders.webAppContextSetup(context)
              .apply(SecurityMockMvcConfigurers.springSecurity())
              .build();
      var body = AdminWarrantyEventServiceTest.conclusion(false);
      String key = AdminWarrantyEventServiceTest.KEY;
      assertEquals(401, request(mvc, null, key, "501", body).getStatus());
      assertEquals(401, request(mvc, "expired", key, "501", body).getStatus());
      assertEquals(403, request(mvc, "user", key, "501", body).getStatus());
      assertEquals(403, request(mvc, "blocked", key, "501", body).getStatus());
      assertEquals(400, request(mvc, "admin", null, "501", body).getStatus());
      var forbidden = new LinkedHashMap<>(body);
      forbidden.put("trang_thai_xu_ly", null);
      assertEquals(400, request(mvc, "admin", key, "501", forbidden).getStatus());
      var f = context.getBean(AdminWarrantyEventServiceTest.Fixture.class);
      when(f.workflow.ticketOrigin(999L))
          .thenThrow(
              WarrantyReadException.notFound(
                  ErrorCode.WARRANTY_NOT_FOUND, "path.id", "WARRANTY_NOT_FOUND"));
      var notFound = request(mvc, "admin", UUID.randomUUID().toString(), "999", body);
      assertEquals(404, notFound.getStatus());
      assertTrue(notFound.getContentAsString().contains("WARRANTY_NOT_FOUND"));
      var success = request(mvc, "admin", key, "501", body);
      assertEquals(200, success.getStatus(), success.getContentAsString());
      var json = AdminWarrantyEventServiceTest.JSON.readTree(success.getContentAsString());
      assertEquals(200, json.get("status").asInt());
      assertEquals("DANG_KIEM_TRA", json.at("/data/trang_thai_xu_ly").asString());
      assertTrue(json.at("/data/chi_phi_ncc_xac_nhan").isNull());
      var conflict =
          request(mvc, "admin", key, "501", AdminWarrantyEventServiceTest.conclusion(true));
      assertEquals(409, conflict.getStatus());
      assertTrue(conflict.getContentAsString().contains("IDEMPOTENCY_KEY_REUSED"));

      var quote = AdminWarrantyQuoteServiceTest.first();
      quote.put("ket_luan_lich_su_id", 2000);
      String quoteKey = UUID.randomUUID().toString();
      assertEquals(401, quote(mvc, null, quoteKey, "501", quote).getStatus());
      assertEquals(401, quote(mvc, "expired", quoteKey, "501", quote).getStatus());
      assertEquals(403, quote(mvc, "user", quoteKey, "501", quote).getStatus());
      assertEquals(403, quote(mvc, "blocked", quoteKey, "501", quote).getStatus());
      assertEquals(400, quote(mvc, "admin", null, "501", quote).getStatus());
      assertEquals(400, quote(mvc, "admin", quoteKey, "invalid", quote).getStatus());
      assertEquals(
          404, quote(mvc, "admin", UUID.randomUUID().toString(), "999", quote).getStatus());
      var invalidQuote = new LinkedHashMap<>(quote);
      invalidQuote.put("tong_tien", null);
      assertEquals(400, quote(mvc, "admin", quoteKey, "501", invalidQuote).getStatus());
      var draft = quote(mvc, "admin", quoteKey, "501", quote);
      assertEquals(201, draft.getStatus(), draft.getContentAsString());
      var draftJson = AdminWarrantyEventServiceTest.JSON.readTree(draft.getContentAsString());
      assertEquals(201, draftJson.path("status").asInt());
      assertEquals("NHAP", draftJson.at("/data/trang_thai_bao_gia").asString());
      assertTrue(draftJson.at("/data/hoa_don_id").isNull());
      assertTrue(draftJson.at("/data/quyet_dinh_khach").isNull());
      assertTrue(draftJson.at("/data/thay_the_phien_ban").isNull());
      assertFalse(draftJson.at("/data/da_tao_giao_dich_tien").asBoolean());
      assertEquals(1, f.fees.size());
      var retry = quote(mvc, "admin", quoteKey, "501", quote);
      assertEquals(draft.getContentAsString(), retry.getContentAsString());
      assertEquals(1, f.fees.size());
      var different = new LinkedHashMap<>(quote);
      different.put("ly_do", "Nội dung khác");
      var reused = quote(mvc, "admin", quoteKey, "501", different);
      assertEquals(409, reused.getStatus());
      assertTrue(reused.getContentAsString().contains("IDEMPOTENCY_KEY_REUSED"));

      var sendQuote = AdminWarrantyQuoteEventServiceTest.send();
      String eventKey = UUID.randomUUID().toString();
      assertEquals(401, quoteEvent(mvc, null, eventKey, "501", "1", sendQuote).getStatus());
      assertEquals(401, quoteEvent(mvc, "expired", eventKey, "501", "1", sendQuote).getStatus());
      assertEquals(403, quoteEvent(mvc, "user", eventKey, "501", "1", sendQuote).getStatus());
      assertEquals(403, quoteEvent(mvc, "blocked", eventKey, "501", "1", sendQuote).getStatus());
      assertEquals(400, quoteEvent(mvc, "admin", null, "501", "1", sendQuote).getStatus());
      assertEquals(
          400, quoteEvent(mvc, "admin", eventKey, "501", "invalid", sendQuote).getStatus());
      assertEquals(
          404,
          quoteEvent(mvc, "admin", UUID.randomUUID().toString(), "501", "99", sendQuote)
              .getStatus());
      var sent = quoteEvent(mvc, "admin", eventKey, "501", "1", sendQuote);
      assertEquals(200, sent.getStatus(), sent.getContentAsString());
      var sentJson = AdminWarrantyEventServiceTest.JSON.readTree(sent.getContentAsString());
      assertEquals("CHO_PHAN_HOI", sentJson.at("/data/trang_thai_bao_gia").asString());
      assertEquals("DANG_KIEM_TRA", sentJson.at("/data/trang_thai_xu_ly").asString());
      assertTrue(sentJson.at("/data/hoa_don").isNull());
      var accept = AdminWarrantyQuoteEventServiceTest.decision("DONG_Y");
      String acceptKey = UUID.randomUUID().toString();
      var accepted = quoteEvent(mvc, "admin", acceptKey, "501", "1", accept);
      assertEquals(200, accepted.getStatus(), accepted.getContentAsString());
      var acceptedJson = AdminWarrantyEventServiceTest.JSON.readTree(accepted.getContentAsString());
      assertEquals(801L, acceptedJson.at("/data/hoa_don/id").asLong());
      assertEquals(150000, acceptedJson.at("/data/hoa_don/tong_tien").asInt());
      assertEquals(
          "CHUA_THANH_TOAN", acceptedJson.at("/data/hoa_don/trang_thai_thanh_toan").asString());
      assertTrue(acceptedJson.at("/data/phieu_thu_chi_id").isNull());
      var acceptedRetry = quoteEvent(mvc, "admin", acceptKey, "501", "1", accept);
      assertEquals(accepted.getContentAsString(), acceptedRetry.getContentAsString());
      assertEquals(1, f.invoices.size());
      var decided =
          quoteEvent(
              mvc,
              "admin",
              UUID.randomUUID().toString(),
              "501",
              "1",
              AdminWarrantyQuoteEventServiceTest.withdraw());
      assertEquals(409, decided.getStatus());
      assertTrue(decided.getContentAsString().contains("QUOTE_ALREADY_DECIDED"));
      var reusedEvent =
          quoteEvent(
              mvc, "admin", acceptKey, "501", "1", AdminWarrantyQuoteEventServiceTest.withdraw());
      assertEquals(409, reusedEvent.getStatus());
      assertTrue(reusedEvent.getContentAsString().contains("IDEMPOTENCY_KEY_REUSED"));

      var invoiceBody = AdminWarrantyInvoiceServiceTest.debt(150000);
      String invoiceKey = UUID.randomUUID().toString();
      assertEquals(401, invoice(mvc, null, invoiceKey, "501", invoiceBody).getStatus());
      assertEquals(401, invoice(mvc, "expired", invoiceKey, "501", invoiceBody).getStatus());
      assertEquals(403, invoice(mvc, "user", invoiceKey, "501", invoiceBody).getStatus());
      assertEquals(403, invoice(mvc, "blocked", invoiceKey, "501", invoiceBody).getStatus());
      assertEquals(400, invoice(mvc, "admin", null, "501", invoiceBody).getStatus());
      assertEquals(400, invoice(mvc, "admin", invoiceKey, "bad", invoiceBody).getStatus());
      assertEquals(
          404, invoice(mvc, "admin", UUID.randomUUID().toString(), "999", invoiceBody).getStatus());
      var wrongInvoice = new LinkedHashMap<>(invoiceBody);
      wrongInvoice.put("hoa_don_id", 999);
      assertEquals(
          404,
          invoice(mvc, "admin", UUID.randomUUID().toString(), "501", wrongInvoice).getStatus());
      var arbitraryTotal = new LinkedHashMap<>(invoiceBody);
      arbitraryTotal.put("tong_tien", 1);
      assertEquals(400, invoice(mvc, "admin", invoiceKey, "501", arbitraryTotal).getStatus());
      var noOp =
          invoice(
              mvc,
              "admin",
              UUID.randomUUID().toString(),
              "501",
              AdminWarrantyInvoiceServiceTest.apply(1));
      assertEquals(200, noOp.getStatus(), noOp.getContentAsString());
      assertFalse(
          AdminWarrantyEventServiceTest.JSON
              .readTree(noOp.getContentAsString())
              .at("/data/co_thay_doi")
              .asBoolean());
      var approvedDebt = invoice(mvc, "admin", invoiceKey, "501", invoiceBody);
      assertEquals(200, approvedDebt.getStatus(), approvedDebt.getContentAsString());
      var debtJson = AdminWarrantyEventServiceTest.JSON.readTree(approvedDebt.getContentAsString());
      assertEquals(150000, debtJson.at("/data/con_phai_thu").asInt());
      assertEquals(8, debtJson.at("/data/phe_duyet_cong_no/nguoi_phe_duyet_id").asInt());
      assertTrue(debtJson.at("/data/phe_duyet_cong_no/duoc_ban_giao_khi_con_no").asBoolean());
      var reduced =
          invoice(
              mvc,
              "admin",
              UUID.randomUUID().toString(),
              "501",
              AdminWarrantyInvoiceServiceTest.discount(50000));
      assertEquals(200, reduced.getStatus(), reduced.getContentAsString());
      var reducedJson = AdminWarrantyEventServiceTest.JSON.readTree(reduced.getContentAsString());
      assertEquals(100000, reducedJson.at("/data/tong_tien").asInt());
      assertEquals(8, reducedJson.at("/data/phe_duyet_mien_giam/nguoi_phe_duyet_id").asInt());
      assertTrue(reducedJson.at("/data/phieu_thu_chi_moi_id").isNull());
      String cancelKey = UUID.randomUUID().toString();
      var cancelled =
          invoice(mvc, "admin", cancelKey, "501", AdminWarrantyInvoiceServiceTest.cancel());
      assertEquals(200, cancelled.getStatus(), cancelled.getContentAsString());
      var cancelledJson =
          AdminWarrantyEventServiceTest.JSON.readTree(cancelled.getContentAsString());
      assertEquals("HUY", cancelledJson.at("/data/trang_thai").asString());
      assertEquals(100000, cancelledJson.at("/data/tong_tien").asInt());
      assertEquals(0, cancelledJson.at("/data/khoan_phai_thu_hieu_luc").asInt());
      assertTrue(cancelledJson.at("/data/trang_thai_thanh_toan").isNull());
      assertEquals(
          cancelled.getContentAsString(),
          invoice(mvc, "admin", cancelKey, "501", AdminWarrantyInvoiceServiceTest.cancel())
              .getContentAsString());
      var changedCancel = AdminWarrantyInvoiceServiceTest.cancel();
      changedCancel.put("ly_do", "Nội dung khác");
      var conflictInvoice = invoice(mvc, "admin", cancelKey, "501", changedCancel);
      assertEquals(409, conflictInvoice.getStatus());
      assertTrue(conflictInvoice.getContentAsString().contains("IDEMPOTENCY_KEY_REUSED"));
      assertTrue(f.cash.isEmpty());
      var moneyFixture = (AdminWarrantyMoneyServiceTest.Fixture) f;
      moneyFixture.cost(1003, 100000);
      org.springframework.transaction.support.TransactionSynchronizationManager
          .setActualTransactionActive(true);
      var moneyBody = AdminWarrantyMoneyServiceTest.input("CHI_DON_VI", 50000);
      String moneyKey = UUID.randomUUID().toString();
      assertEquals(401, money(mvc, null, moneyKey, "501", moneyBody).getStatus());
      assertEquals(401, money(mvc, "expired", moneyKey, "501", moneyBody).getStatus());
      assertEquals(403, money(mvc, "user", moneyKey, "501", moneyBody).getStatus());
      assertEquals(403, money(mvc, "blocked", moneyKey, "501", moneyBody).getStatus());
      assertEquals(400, money(mvc, "admin", null, "501", moneyBody).getStatus());
      assertEquals(400, money(mvc, "admin", moneyKey, "bad", moneyBody).getStatus());
      assertEquals(
          404, money(mvc, "admin", UUID.randomUUID().toString(), "999", moneyBody).getStatus());
      var moneyResult = money(mvc, "admin", moneyKey, "501", moneyBody);
      assertEquals(201, moneyResult.getStatus(), moneyResult.getContentAsString());
      var moneyJson = AdminWarrantyEventServiceTest.JSON.readTree(moneyResult.getContentAsString());
      assertEquals(201, moneyJson.at("/status").asInt());
      assertEquals("CHI", moneyJson.at("/data/phieu_thu_chi/loai_phieu").asString());
      assertEquals(8, moneyJson.at("/data/phieu_thu_chi/nguoi_tao_id").asInt());
      assertEquals("TU_DONG", moneyJson.at("/data/phieu_thu_chi/nguon_tao").asString());
      assertTrue(moneyJson.at("/data/phieu_thu_chi/hoa_don_bao_hanh_id").isNull());
      assertTrue(moneyJson.at("/data/hoa_don").isNull());
      assertEquals(50000, moneyJson.at("/data/chi_phi_don_vi/con_phai_chi").asInt());
      assertEquals(
          moneyResult.getContentAsString(),
          money(mvc, "admin", moneyKey, "501", moneyBody).getContentAsString());
      assertEquals(1, f.cash.size());
      var planFixture = (AdminWarrantyReplacementPlanServiceTest.Fixture) f;
      planFixture.add(
          4000,
          "GHI_KET_LUAN",
          AdminWarrantyEventServiceTest.m(
              "ket_luan",
              AdminWarrantyEventServiceTest.m(
                  "hang_muc", AdminWarrantyEventServiceTest.conclusion(true).get("hang_muc"))));
      var planBody = AdminWarrantyReplacementPlanServiceTest.make();
      planBody.put("ket_luan_lich_su_id", 4000);
      String planKey = UUID.randomUUID().toString();
      assertEquals(401, plan(mvc, null, planKey, "501", planBody).getStatus());
      assertEquals(401, plan(mvc, "expired", planKey, "501", planBody).getStatus());
      assertEquals(403, plan(mvc, "user", planKey, "501", planBody).getStatus());
      assertEquals(403, plan(mvc, "blocked", planKey, "501", planBody).getStatus());
      assertEquals(400, plan(mvc, "admin", null, "501", planBody).getStatus());
      assertEquals(400, plan(mvc, "admin", planKey, "bad", planBody).getStatus());
      assertEquals(
          404, plan(mvc, "admin", UUID.randomUUID().toString(), "999", planBody).getStatus());
      var proposal = plan(mvc, "admin", planKey, "501", planBody);
      assertEquals(200, proposal.getStatus(), proposal.getContentAsString());
      var proposalJson = AdminWarrantyEventServiceTest.JSON.readTree(proposal.getContentAsString());
      assertEquals(false, proposalJson.at("/data/da_duyet").asBoolean());
      assertTrue(proposalJson.at("/data/nguoi_phe_duyet_id").isNull());
      assertEquals(
          proposal.getContentAsString(),
          plan(mvc, "admin", planKey, "501", planBody).getContentAsString());
      var premature =
          plan(
              mvc,
              "admin",
              UUID.randomUUID().toString(),
              "501",
              AdminWarrantyReplacementPlanServiceTest.decision(1, "DONG_Y"));
      assertEquals(409, premature.getStatus());
      assertTrue(premature.getContentAsString().contains("REPLACEMENT_NOT_APPROVED"));
      var approval =
          plan(
              mvc,
              "admin",
              UUID.randomUUID().toString(),
              "501",
              AdminWarrantyReplacementPlanServiceTest.approve(1));
      assertEquals(200, approval.getStatus(), approval.getContentAsString());
      assertEquals(
          8,
          AdminWarrantyEventServiceTest.JSON
              .readTree(approval.getContentAsString())
              .at("/data/nguoi_phe_duyet_id")
              .asInt());
      var agreed =
          plan(
              mvc,
              "admin",
              UUID.randomUUID().toString(),
              "501",
              AdminWarrantyReplacementPlanServiceTest.decision(1, "DONG_Y"));
      assertEquals(200, agreed.getStatus(), agreed.getContentAsString());
      assertEquals(
          "CHO_DOI_SAN_PHAM",
          AdminWarrantyEventServiceTest.JSON
              .readTree(agreed.getContentAsString())
              .at("/data/trang_thai_xu_ly")
              .asString());
      var cancelledPlan =
          plan(
              mvc,
              "admin",
              UUID.randomUUID().toString(),
              "501",
              AdminWarrantyReplacementPlanServiceTest.cancel(1));
      assertEquals(200, cancelledPlan.getStatus(), cancelledPlan.getContentAsString());
      assertEquals(
          true,
          AdminWarrantyEventServiceTest.JSON
              .readTree(cancelledPlan.getContentAsString())
              .at("/data/da_huy")
              .asBoolean());
      assertEquals(1, f.cash.size());
      assertEquals(10, planFixture.stock.getTonCoTheBan());
      var changedMoney = new LinkedHashMap<>(moneyBody);
      changedMoney.put("so_tien", 1);
      assertTrue(
          money(mvc, "admin", moneyKey, "501", changedMoney)
              .getContentAsString()
              .contains("IDEMPOTENCY_KEY_REUSED"));
      assertEquals(
          409, money(mvc, "admin", UUID.randomUUID().toString(), "501", moneyBody).getStatus());
      var itemsFixture = (AdminWarrantyReplacementItemsServiceTest.Fixture) f;
      var revised = new LinkedHashMap<>(planBody);
      revised.put("thay_the_phien_ban", 1);
      assertEquals(
          200, plan(mvc, "admin", UUID.randomUUID().toString(), "501", revised).getStatus());
      assertEquals(
          200,
          plan(
                  mvc,
                  "admin",
                  UUID.randomUUID().toString(),
                  "501",
                  AdminWarrantyReplacementPlanServiceTest.approve(2))
              .getStatus());
      assertEquals(
          200,
          plan(
                  mvc,
                  "admin",
                  UUID.randomUUID().toString(),
                  "501",
                  AdminWarrantyReplacementPlanServiceTest.decision(2, "DONG_Y"))
              .getStatus());
      var holdBody =
          AdminWarrantyEventServiceTest.m(
              "hanh_dong", "GIU_CHO_HANG_CUA_HANG", "phien_ban_phuong_an", 2, "so_serial_id", 601);
      String holdKey = UUID.randomUUID().toString();
      assertEquals(401, items(mvc, null, holdKey, "501", holdBody).getStatus());
      assertEquals(401, items(mvc, "expired", holdKey, "501", holdBody).getStatus());
      assertEquals(403, items(mvc, "user", holdKey, "501", holdBody).getStatus());
      assertEquals(403, items(mvc, "blocked", holdKey, "501", holdBody).getStatus());
      assertEquals(400, items(mvc, "admin", null, "501", holdBody).getStatus());
      assertEquals(400, items(mvc, "admin", holdKey, "bad", holdBody).getStatus());
      assertEquals(
          404, items(mvc, "admin", UUID.randomUUID().toString(), "999", holdBody).getStatus());
      var holdResponse = items(mvc, "admin", holdKey, "501", holdBody);
      assertEquals(200, holdResponse.getStatus(), holdResponse.getContentAsString());
      assertEquals(
          holdResponse.getContentAsString(),
          items(mvc, "admin", holdKey, "501", holdBody).getContentAsString());
      var holdJson = AdminWarrantyEventServiceTest.JSON.readTree(holdResponse.getContentAsString());
      assertTrue(holdJson.at("/data/the_kho").isNull());
      assertTrue(holdJson.at("/data/thiet_bi_thay_the_id").isNull());
      assertEquals(-1, holdJson.at("/data/bien_dong_ton/ton_co_the_ban").asInt());
      var changedHold = new LinkedHashMap<>(holdBody);
      changedHold.put("so_serial_id", 602);
      assertEquals(409, items(mvc, "admin", holdKey, "501", changedHold).getStatus());
      var exportBody = AdminWarrantyReplacementItemsServiceTest.timed("XUAT_HANG_DOI");
      exportBody.put("phien_ban_phuong_an", 2);
      exportBody.put("giu_cho_lich_su_id", holdJson.at("/data/giu_cho_lich_su_id").asLong());
      var issued = items(mvc, "admin", UUID.randomUUID().toString(), "501", exportBody);
      assertEquals(200, issued.getStatus(), issued.getContentAsString());
      assertEquals(
          "GIU_CHO_BAO_HANH",
          AdminWarrantyEventServiceTest.JSON
              .readTree(issued.getContentAsString())
              .at("/data/trang_thai_serial")
              .asString());
      assertEquals(1, itemsFixture.cards.size());
      assertEquals(1, f.cash.size());
      var tooMuch = AdminWarrantyMoneyServiceTest.input("CHI_DON_VI", 50001);
      var exceededMoney = money(mvc, "admin", UUID.randomUUID().toString(), "501", tooMuch);
      assertEquals(409, exceededMoney.getStatus());
      assertTrue(exceededMoney.getContentAsString().contains("MONEY_EXCEEDS_OUTSTANDING"));
      assertEquals(1, f.cash.size());
    } finally {
      SecurityContextHolder.clearContext();
      org.springframework.transaction.support.TransactionSynchronizationManager.clear();
    }
  }

  private static MockHttpServletResponse quote(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post("/api/v1/admin/warranties/" + id + "/quotes")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  @Test
  void supplierSettlementRouteEnforcesJwtRoleHeaderAndIdempotency() throws Exception {
    try (var context = new AnnotationConfigWebApplicationContext()) {
      context.setServletContext(new MockServletContext());
      context
          .getEnvironment()
          .getPropertySources()
          .addFirst(
              new MapPropertySource(
                  "offline",
                  Map.of(
                      "jwt.secret",
                      "test-only-offline-secret",
                      "jwt.access-token-expiration",
                      "3600000",
                      "jwt.refresh-token-expiration",
                      "86400000",
                      "jwt.refresh-token-remember-expiration",
                      "172800000")));
      context.register(Web.class);
      context.refresh();
      var jwt = context.getBean(JwtService.class);
      var users = context.getBean(NguoiDungRepository.class);
      for (int i = 0; i < 3; i++) {
        String token = List.of("admin", "user", "blocked").get(i);
        long id = 8L + i;
        when(jwt.isAccessTokenValid(token)).thenReturn(true);
        when(jwt.getUserIdFromToken(token)).thenReturn(id);
        when(users.findByIdWithVaiTro(id))
            .thenReturn(
                Optional.of(
                    NguoiDung.builder()
                        .id(id)
                        .trangThai(
                            i == 2
                                ? TrangThaiCoBanEnum.NGUNG_HOAT_DONG
                                : TrangThaiCoBanEnum.HOAT_DONG)
                        .vaiTro(
                            VaiTro.builder()
                                .id((long) i + 1)
                                .tenVaiTro(i == 1 ? "USER" : "ADMIN")
                                .build())
                        .build()));
      }
      AdminWarrantyInvoiceServiceTest.role("ADMIN");
      var fixture =
          (AdminWarrantySupplierSettlementServiceTest.Fixture)
              context.getBean(AdminWarrantyEventServiceTest.Fixture.class);
      when(fixture.workflow.ticketOrigin(999L))
          .thenThrow(
              WarrantyReadException.notFound(
                  ErrorCode.WARRANTY_NOT_FOUND, "path.id", "WARRANTY_NOT_FOUND"));
      fixture.ready(true);
      var body =
          AdminWarrantyEventServiceTest.m(
              "hanh_dong",
              "GHI_NGHIA_VU",
              "nha_cung_cap_id",
              3,
              "giao_dich_xuat_the_kho_id",
              12001,
              "so_luong_can_bu",
              1,
              "can_cu",
              "NCC xác nhận bù hàng",
              "chung_tu_urls",
              List.of("/media/bh/comp.jpg"));
      var mvc =
          MockMvcBuilders.webAppContextSetup(context)
              .apply(SecurityMockMvcConfigurers.springSecurity())
              .build();
      String key = UUID.randomUUID().toString();
      assertEquals(401, settlement(mvc, null, key, "501", body).getStatus());
      assertEquals(401, settlement(mvc, "expired", key, "501", body).getStatus());
      assertEquals(403, settlement(mvc, "user", key, "501", body).getStatus());
      assertEquals(403, settlement(mvc, "blocked", key, "501", body).getStatus());
      assertEquals(400, settlement(mvc, "admin", null, "501", body).getStatus());
      assertEquals(400, settlement(mvc, "admin", key, "bad", body).getStatus());
      assertEquals(
          404, settlement(mvc, "admin", UUID.randomUUID().toString(), "999", body).getStatus());
      var response = settlement(mvc, "admin", key, "501", body);
      assertEquals(200, response.getStatus(), response.getContentAsString());
      assertEquals(
          response.getContentAsString(),
          settlement(mvc, "admin", key, "501", body).getContentAsString());
      var changed = new LinkedHashMap<>(body);
      changed.put("can_cu", "Căn cứ khác");
      assertEquals(409, settlement(mvc, "admin", key, "501", changed).getStatus());
      assertTrue(
          AdminWarrantyEventServiceTest.JSON
              .readTree(response.getContentAsString())
              .at("/data/the_kho")
              .isNull());
    } finally {
      SecurityContextHolder.clearContext();
    }
  }

  @Test
  void handoverRouteEnforcesAuthAndPreservesStructuredPaymentError() throws Exception {
    try (var context = new AnnotationConfigWebApplicationContext()) {
      context.setServletContext(new MockServletContext());
      context
          .getEnvironment()
          .getPropertySources()
          .addFirst(
              new MapPropertySource(
                  "offline",
                  Map.of(
                      "jwt.secret",
                      "test-only-offline-secret",
                      "jwt.access-token-expiration",
                      "3600000",
                      "jwt.refresh-token-expiration",
                      "86400000",
                      "jwt.refresh-token-remember-expiration",
                      "172800000")));
      context.register(Web.class);
      context.refresh();
      var jwt = context.getBean(JwtService.class);
      var users = context.getBean(NguoiDungRepository.class);
      for (int i = 0; i < 3; i++) {
        String token = List.of("admin", "user", "blocked").get(i);
        long id = 8L + i;
        when(jwt.isAccessTokenValid(token)).thenReturn(true);
        when(jwt.getUserIdFromToken(token)).thenReturn(id);
        when(users.findByIdWithVaiTro(id))
            .thenReturn(
                Optional.of(
                    NguoiDung.builder()
                        .id(id)
                        .trangThai(
                            i == 2
                                ? TrangThaiCoBanEnum.NGUNG_HOAT_DONG
                                : TrangThaiCoBanEnum.HOAT_DONG)
                        .vaiTro(
                            VaiTro.builder()
                                .id((long) i + 1)
                                .tenVaiTro(i == 1 ? "USER" : "ADMIN")
                                .build())
                        .build()));
      }
      var f =
          (AdminWarrantyHandoverServiceTest.Fixture)
              context.getBean(AdminWarrantyEventServiceTest.Fixture.class);
      AdminWarrantyInvoiceServiceTest.role("ADMIN");
      f.paid(50000);
      f.readyToReturn(com.example.dantruventu.Enum.KetQuaXuLyBaoHanh.SUA_THANH_CONG);
      when(f.workflow.ticketOrigin(999L))
          .thenThrow(
              WarrantyReadException.notFound(
                  ErrorCode.WARRANTY_NOT_FOUND, "path.id", "WARRANTY_NOT_FOUND"));
      var mvc =
          MockMvcBuilders.webAppContextSetup(context)
              .apply(SecurityMockMvcConfigurers.springSecurity())
              .build();
      var body = f.input();
      String key = UUID.randomUUID().toString();
      assertEquals(401, handover(mvc, null, key, "501", body).getStatus());
      assertEquals(401, handover(mvc, "expired", key, "501", body).getStatus());
      assertEquals(403, handover(mvc, "user", key, "501", body).getStatus());
      assertEquals(403, handover(mvc, "blocked", key, "501", body).getStatus());
      assertEquals(400, handover(mvc, "admin", null, "501", body).getStatus());
      assertEquals(
          404, handover(mvc, "admin", UUID.randomUUID().toString(), "999", body).getStatus());
      var response = handover(mvc, "admin", key, "501", body);
      assertEquals(409, response.getStatus(), response.getContentAsString());
      var json = AdminWarrantyEventServiceTest.JSON.readTree(response.getContentAsString());
      assertEquals(100000, json.at("/data/con_phai_thu").asInt());
      assertFalse(json.at("/data/da_ban_giao").asBoolean());
      assertEquals("HANDOVER_PAYMENT_REQUIRED", json.at("/errors/0/code").asString());
      f.cash.clear();
      f.invoices.clear();
      f.fees.clear();
      f.events.removeIf(e -> f.history.object(f.history.payload(e).get("bao_gia")) != null);
      body = f.input();
      key = UUID.randomUUID().toString();
      response = handover(mvc, "admin", key, "501", body);
      assertEquals(200, response.getStatus(), response.getContentAsString());
      assertEquals(
          response.getContentAsString(),
          handover(mvc, "admin", key, "501", body).getContentAsString());
      var changed = new LinkedHashMap<>(body);
      changed.put("ghi_chu", "Khác");
      assertEquals(409, handover(mvc, "admin", key, "501", changed).getStatus());
    } finally {
      SecurityContextHolder.clearContext();
    }
  }

  private static MockHttpServletResponse handover(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post("/api/v1/admin/warranties/" + id + "/handover")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  private static MockHttpServletResponse settlement(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post("/api/v1/admin/warranties/" + id + "/supplier-settlements")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  private static MockHttpServletResponse items(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post("/api/v1/admin/warranties/" + id + "/replacement-items")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  private static MockHttpServletResponse money(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post("/api/v1/admin/warranties/" + id + "/money-transactions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  private static MockHttpServletResponse plan(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post("/api/v1/admin/warranties/" + id + "/replacement-plan")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  private static MockHttpServletResponse invoice(
      MockMvc mvc, String token, String key, String id, Map<String, Object> body) throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.patch("/api/v1/admin/warranties/" + id + "/invoice")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }

  private static MockHttpServletResponse quoteEvent(
      MockMvc mvc, String token, String key, String id, String version, Map<String, Object> body)
      throws Exception {
    SecurityContextHolder.clearContext();
    var request =
        MockMvcRequestBuilders.post(
                "/api/v1/admin/warranties/" + id + "/quotes/" + version + "/events")
            .contentType(MediaType.APPLICATION_JSON)
            .content(AdminWarrantyEventServiceTest.JSON.writeValueAsString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    return mvc.perform(request).andReturn().getResponse();
  }
}
