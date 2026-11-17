package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.PcBuilderPreviewRequest;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import tools.jackson.databind.ObjectMapper;

class PcBuilderCpuSupportTest {
  private final PcBuilderCompatibilitySupport support =
      new PcBuilderCompatibilitySupport(new ObjectMapper());

  @ParameterizedTest
  @CsvSource(
      delimiter = '|',
      value = {
        "CPU AMD Ryzen 7|AMD Ryzen|KHOP_CPU_HO_TRO",
        "CPU Intel Core i5|Intel|KHOP_CPU_HO_TRO",
        "cpu amd Ryzen|aMd|KHOP_CPU_HO_TRO",
        "CPU INTEL Core|intel Core thế hệ mới|KHOP_CPU_HO_TRO",
        "CPU AMD Ryzen|Intel|KHONG_KHOP_CPU_HO_TRO",
        "CPU Intel Core|AMD|KHONG_KHOP_CPU_HO_TRO",
        "CPU AMD Ryzen|AMD và Intel|KHOP_CPU_HO_TRO",
        "CPU Intel Core|AMD và Intel|KHOP_CPU_HO_TRO",
        "CPU không rõ hãng|Intel|CHUA_DU_DU_LIEU",
        "CPU AMD Intel không rõ|AMD và Intel|CHUA_DU_DU_LIEU",
        "CPU Intel Core|LGA1700|CHUA_DU_DU_LIEU"
      })
  void comparesOnlyCpuNameAndMainSupportedCpuLine(String cpu, String supported, String expected) {
    var data = new LinkedHashMap<String, Object>();
    data.put("CPU hỗ trợ", supported);
    data.put("socket", "một socket khác");
    assertEquals(expected, support.compare(cpu, new ObjectMapper().writeValueAsString(data)));
  }

  @Test
  void acceptsVietnameseKeyVariantsAndDoesNotInferFromOtherFields() {
    for (String key : List.of("CPU hỗ trợ", "cpu_ho_tro", "CPU HO TRO", " Cpu-Hỗ-Trợ ")) {
      String data = new ObjectMapper().writeValueAsString(Map.of(key, "Intel Core"));
      assertEquals(PcBuilderCompatibilitySupport.MATCH, support.compare("Intel Core i7", data));
    }
    for (String data :
        Arrays.asList(
            null,
            "{}",
            "[]",
            "{\"socket\":\"AM5\",\"chipset\":\"AMD\"}",
            "{\"CPU hỗ trợ\":123}",
            "{\"CPU hỗ trợ\":\"\"}",
            "not-json")) {
      assertEquals(PcBuilderCompatibilitySupport.UNKNOWN, support.compare("CPU AMD Ryzen", data));
    }
  }

  @Test
  void previewUsesSupportedCpuEvenWhenSocketDiffersAndRemainsAdvisory() {
    var f = new PcBuilderExportServiceTest.Fixture();
    f.data.get(101L).getSanPham().setTenSanPham("Bộ xử lý AMD Ryzen");
    f.data
        .get(201L)
        .getSanPham()
        .setTenSanPham("MAIN có tên chứa Intel nhưng chỉ xét dòng CPU hỗ trợ");
    f.data
        .get(201L)
        .getSanPham()
        .setThongSoKyThuat("{\"CPU hỗ trợ\":\"AMD Ryzen mới\",\"socket\":\"LGA1700\"}");
    var request =
        new PcBuilderPreviewRequest(
            List.of(
                new PcBuilderPreviewRequest.Item("CPU", 101L, 1),
                new PcBuilderPreviewRequest.Item("MAIN", 201L, 1)));
    var preview = f.builder.preview(request);
    assertEquals("KHOP_CPU_HO_TRO", preview.kiemTraCpuMain().trangThai());
    assertEquals("AMD", preview.kiemTraCpuMain().hangCpu());
    assertEquals("AMD Ryzen mới", preview.kiemTraCpuMain().cpuHoTroMain());
    assertEquals("CPU_HO_TRO_MAIN", preview.kiemTraCpuMain().phamVi());
    assertTrue(preview.coTheGuiYeuCauThemGio());
    f.data.get(201L).getSanPham().setThongSoKyThuat("{\"CPU hỗ trợ\":\"Intel\"}");
    preview = f.builder.preview(request);
    assertEquals("KHONG_KHOP_CPU_HO_TRO", preview.kiemTraCpuMain().trangThai());
    assertFalse(preview.loi().isEmpty());
    assertTrue(preview.coTheGuiYeuCauThemGio());
  }

  @Test
  void productsUseDirectionalDatabaseFiltersBeforePaginationAndReportCandidateStatus() {
    var f = new PcBuilderExportServiceTest.Fixture();
    when(f.variants.findById(101L)).thenReturn(Optional.of(f.data.get(101L)));
    when(f.variants.findById(201L)).thenReturn(Optional.of(f.data.get(201L)));
    var page = PageRequest.of(1, 1);
    var main = mock(PhienBanSanPhamRepository.PcBuilderProduct.class);
    when(main.getThongSoKyThuat()).thenReturn("{\"CPU hỗ trợ\":\"Intel thế hệ mới\"}");
    when(main.getTonCoTheBan()).thenReturn(5L);
    when(f.variants.findPcBuilderProducts(
            2L, 1L, null, null, null, null, "TAT_CA", "INTEL", null, "MAC_DINH", page))
        .thenReturn(new PageImpl<>(List.of(main), page, 3));
    var mains =
        f.builder.getProducts("MAIN", null, null, null, null, null, null, "1", "1", "101", "true");
    assertTrue(mains.boLocTuongThich().dangApDung());
    assertEquals("INTEL", mains.boLocTuongThich().hangCpuDoiChieu());
    assertEquals(3, mains.pagination().getTotalElements());
    assertEquals("KHOP_CPU_HO_TRO", mains.items().getFirst().ketQuaTuongThich());
    var cpu = mock(PhienBanSanPhamRepository.PcBuilderProduct.class);
    when(cpu.getTenSanPham()).thenReturn("Intel Core i5");
    when(cpu.getTonCoTheBan()).thenReturn(4L);
    when(f.variants.findPcBuilderProducts(
            1L, 1L, null, null, null, null, "TAT_CA", null, "INTEL", "MAC_DINH", page))
        .thenReturn(new PageImpl<>(List.of(cpu), page, 4));
    var cpus =
        f.builder.getProducts("CPU", null, null, null, null, null, null, "1", "1", "201", "true");
    assertTrue(cpus.boLocTuongThich().dangApDung());
    assertEquals("Intel Core", cpus.boLocTuongThich().cpuHoTroDoiChieu());
    assertEquals("KHOP_CPU_HO_TRO", cpus.items().getFirst().ketQuaTuongThich());
    assertEquals(4, cpus.pagination().getTotalElements());
  }
}
