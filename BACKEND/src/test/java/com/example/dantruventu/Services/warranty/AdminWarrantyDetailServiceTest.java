package com.example.dantruventu.Services.warranty;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Repository.warranty.WarrantyDetailRepository;
import com.example.dantruventu.Repository.warranty.WarrantyHistoryRepository;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import tools.jackson.databind.ObjectMapper;

class AdminWarrantyDetailServiceTest {
  private final ObjectMapper json = new ObjectMapper();
  private final WarrantyDetailRepository repository = mock(WarrantyDetailRepository.class);
  private final WarrantyHistoryRepository histories = mock(WarrantyHistoryRepository.class);
  private final WarrantyDeviceResolver devices = mock(WarrantyDeviceResolver.class);
  private final List<LichSuBaoHanh> events = new ArrayList<>();
  private final PhieuBaoHanh ticket;
  private final AdminWarrantyDetailService service;

  AdminWarrantyDetailServiceTest() {
    var order = DonHang.builder().id(1001L).build();
    var line = ChiTietDonHang.builder().id(2001L).donHang(order).build();
    var device =
        ThietBiBaoHanh.builder()
            .id(700L)
            .maTheoDoi("TB000700")
            .chiTietDonHang(line)
            .phienBan(PhienBanSanPham.builder().id(101L).build())
            .build();
    ticket =
        PhieuBaoHanh.builder()
            .id(501L)
            .donHang(order)
            .thietBi(device)
            .trangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT)
            .ketQuaXuLy(KetQuaXuLyBaoHanh.SUA_THANH_CONG)
            .build();
    when(repository.findTicket(501L)).thenReturn(Optional.of(ticket));
    when(repository.findFees(501L)).thenReturn(List.of());
    when(repository.findInvoices(501L)).thenReturn(List.of());
    when(repository.findPostedMoney(501L)).thenReturn(List.of());
    when(histories.findByPhieuBaoHanh_IdOrderByNgayTaoAscIdAsc(501L)).thenReturn(events);
    when(histories.findByPhieuBaoHanh_Id(eq(501L), any()))
        .thenAnswer(invocation -> new PageImpl<>(events));
    when(devices.resolve(device))
        .thenReturn(new WarrantyDeviceResolver.DeviceState(true, device, null, List.of()));
    service =
        new AdminWarrantyDetailService(
            repository, histories, new WarrantyHistorySupport(json), devices);
  }

  private void obligation(long id, int required, int supplied, BigDecimal money, boolean versioned) {
    var value = new LinkedHashMap<String, Object>();
    value.put("nghia_vu_lich_su_id", id);
    value.put("nha_cung_cap_id", 3);
    value.put("so_luong_can_bu", required);
    value.put("so_luong_da_bu", supplied);
    value.put("so_luong_con_bu", required - supplied);
    value.put("so_tien_nghia_vu", money);
    value.put("so_tien_da_nhan", BigDecimal.ZERO);
    value.put("so_tien_con_doi_soat", money);
    value.put("da_xac_nhan", true);
    value.put("nghia_vu_gui_thiet_bi_cu_con_mo", false);
    value.put("da_giai_quyet", required == supplied && money.signum() == 0);
    if (versioned) value.put("phien_ban_du_lieu", 1);
    events.add(
        LichSuBaoHanh.builder()
            .id(id)
            .phieuBaoHanh(ticket)
            .loaiSuKien("GHI_NGHIA_VU")
            .duLieuChiTiet(json.writeValueAsString(Map.of("doi_soat_nha_cung_cap", value)))
            .build());
  }

  @Test
  void offersSupplierSettlementForAggregatedOutstandingGoodsWithoutMoney() {
    obligation(880L, 1, 0, BigDecimal.ZERO, true);

    var result = service.getDetail("501", "0", "1");

    assertEquals(1L, result.doiSoatNhaCungCap().get("so_luong_con_bu"));
    assertTrue(result.thaoTacDuocPhep().contains("SUPPLIER_SETTLEMENT"));
  }

  @Test
  void sumsIndependentObligationsBeforeOfferingSupplierSettlement() {
    obligation(880L, 1, 0, BigDecimal.ZERO, true);
    obligation(881L, 2, 0, BigDecimal.ZERO, true);

    var result = service.getDetail("501", "0", "1");

    assertEquals(3L, result.doiSoatNhaCungCap().get("so_luong_con_bu"));
    assertTrue(result.thaoTacDuocPhep().contains("SUPPLIER_SETTLEMENT"));
  }

  @Test
  void stillOffersSupplierSettlementForLegacyIntegerQuantity() {
    obligation(880L, 1, 0, BigDecimal.ZERO, false);

    assertTrue(service.getDetail("501", "0", "1").thaoTacDuocPhep().contains("SUPPLIER_SETTLEMENT"));
  }

  @Test
  void stillOffersSupplierSettlementForOutstandingMoneyOnly() {
    obligation(880L, 0, 0, new BigDecimal("50000.00"), true);

    assertTrue(service.getDetail("501", "0", "1").thaoTacDuocPhep().contains("SUPPLIER_SETTLEMENT"));
  }

  @Test
  void doesNotOfferSupplierSettlementOnceAllObligationsAreResolved() {
    obligation(880L, 1, 1, BigDecimal.ZERO, true);

    assertFalse(service.getDetail("501", "0", "1").thaoTacDuocPhep().contains("SUPPLIER_SETTLEMENT"));
  }

  @Test
  void doesNotOfferSupplierSettlementWithoutAnObligation() {
    assertFalse(service.getDetail("501", "0", "1").thaoTacDuocPhep().contains("SUPPLIER_SETTLEMENT"));
  }
}
