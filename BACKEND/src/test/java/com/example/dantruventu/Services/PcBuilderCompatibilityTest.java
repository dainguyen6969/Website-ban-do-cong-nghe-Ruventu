package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.PcBuilderPreviewRequest;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class PcBuilderCompatibilityTest {
  private PcBuilderPreviewRequest pair() {
    return new PcBuilderPreviewRequest(
        List.of(
            new PcBuilderPreviewRequest.Item("CPU", 101L, 1),
            new PcBuilderPreviewRequest.Item("MAIN", 201L, 1)));
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(
      strings = {
        "{}",
        "{\"chipset\":\"B760\",\"loai_ram\":\"DDR5\"}",
        "{\"socket\":\"AM5\"}",
        "{\"socket\":123}",
        "{\"CPU hỗ trợ\":\"AMD Ryzen\"}",
        "không phải JSON"
      })
  void missingOrMismatchedCpuSupportWarnsWithoutBlockingEligibleBuild(String specifications) {
    var f = new PcBuilderExportServiceTest.Fixture();
    f.data.get(201L).getSanPham().setThongSoKyThuat(specifications);
    var preview = f.builder.preview(pair());
    String expected =
        specifications != null && specifications.contains("AMD Ryzen")
            ? "KHONG_KHOP_CPU_HO_TRO"
            : "CHUA_DU_DU_LIEU";
    assertEquals(expected, preview.kiemTraCpuMain().trangThai());
    assertFalse(preview.loi().isEmpty());
    assertTrue(preview.coTheGuiYeuCauThemGio());
    assertTrue(preview.coTheXuatExcel());
    assertTrue(preview.kiemTraTonKho().hopLe());
  }

  @Test
  void ordinarySpecificationsWithoutSupportLineRemainPurchasable() {
    var f = new PcBuilderExportServiceTest.Fixture();
    f.data.get(101L).getSanPham().setThongSoKyThuat("{\"so_nhan\":8,\"tan_so\":\"3.2 GHz\"}");
    f.data.get(201L).getSanPham().setThongSoKyThuat("{\"chipset\":\"B760\",\"loai_ram\":\"DDR5\"}");
    var preview = f.builder.preview(pair());
    assertEquals("CHUA_DU_DU_LIEU", preview.kiemTraCpuMain().trangThai());
    assertEquals("INTEL", preview.kiemTraCpuMain().hangCpu());
    assertNull(preview.kiemTraCpuMain().cpuHoTroMain());
    assertTrue(preview.coTheGuiYeuCauThemGio());
  }

  @Test
  void shortageAndEmptyConfigurationStillBlockWhilePartialBuildCanProceed() {
    var f = new PcBuilderExportServiceTest.Fixture();
    f.data.get(201L).getSanPham().setThongSoKyThuat("{\"CPU hỗ trợ\":\"AMD\"}");
    f.available.put(201L, 0L);
    var preview = f.builder.preview(pair());
    assertEquals("KHONG_KHOP_CPU_HO_TRO", preview.kiemTraCpuMain().trangThai());
    assertFalse(preview.coTheGuiYeuCauThemGio());
    assertFalse(preview.kiemTraTonKho().hopLe());
    assertTrue(preview.coTheXuatExcel());
    assertFalse(f.builder.preview(new PcBuilderPreviewRequest(List.of())).coTheGuiYeuCauThemGio());
    var onlyCpu =
        new PcBuilderPreviewRequest(List.of(new PcBuilderPreviewRequest.Item("CPU", 101L, 1)));
    assertTrue(f.builder.preview(onlyCpu).coTheGuiYeuCauThemGio());
  }

  @Test
  void productsKeepFullTechnicalSpecificationsAndRemainSelectableWithoutSupportLine() {
    var f = new PcBuilderExportServiceTest.Fixture();
    String specifications =
        "{\"chipset\":\"B760\",\"he_so_nhan\":42,"
            + "\"khe_cam\":{\"m2\":2},\"ho_tro\":[\"DDR5\",\"XMP\"]}";
    f.data.get(101L).getSanPham().setThongSoKyThuat("{\"so_nhan\":8}");
    when(f.variants.findById(101L)).thenReturn(Optional.of(f.data.get(101L)));
    var row = mock(PhienBanSanPhamRepository.PcBuilderProduct.class);
    when(row.getPhienBanId()).thenReturn(201L);
    when(row.getThongSoKyThuat()).thenReturn(specifications);
    when(row.getTonCoTheBan()).thenReturn(5L);
    var pageable = PageRequest.of(0, 20);
    when(f.variants.findPcBuilderProducts(
            2L, 1L, null, null, null, null, "TAT_CA", null, null, "MAC_DINH", pageable))
        .thenReturn(new PageImpl<>(List.of(row), pageable, 1));
    var result =
        f.builder.getProducts("MAIN", null, null, null, null, null, null, "0", "20", "101", null);
    var item = result.items().getFirst();
    assertTrue(item.coTheChon());
    assertEquals("CHUA_DU_DU_LIEU", item.ketQuaTuongThich());
    assertFalse(result.boLocTuongThich().dangApDung());
    assertEquals("B760", item.thongSoChinh().get("chipset"));
    assertEquals(42, item.thongSoChinh().get("he_so_nhan"));
    assertEquals(Map.of("m2", 2), item.thongSoChinh().get("khe_cam"));
    assertEquals(List.of("DDR5", "XMP"), item.thongSoChinh().get("ho_tro"));
    assertNull(item.thongSoChinh().get("socket"));
  }
}
