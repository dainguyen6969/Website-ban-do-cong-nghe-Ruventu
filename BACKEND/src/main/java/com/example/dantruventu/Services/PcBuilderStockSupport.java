package com.example.dantruventu.Services;

import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Gộp nhu cầu theo phiên bản; dùng chung cho preview và thêm cấu hình vào giỏ sau này. */
@Component
@RequiredArgsConstructor
public class PcBuilderStockSupport {
  private final TonKhoRepository stockRepository;

  public record DemandInput(Long variantId, int quantity) {}

  public Map<Long, Long> aggregateDemand(Collection<DemandInput> inputs) {
    Map<Long, Long> demand = new LinkedHashMap<>();
    for (DemandInput input : inputs) {
      if (input.variantId() == null || input.variantId() <= 0 || input.quantity() <= 0) {
        throw new IllegalArgumentException("Nhu cầu phải có phiên bản và số lượng nguyên dương.");
      }
      demand.merge(input.variantId(), (long) input.quantity(), Math::addExact);
    }
    return demand;
  }

  public Map<Long, Long> availableStock(Collection<Long> variantIds, Long warehouseId) {
    Map<Long, Long> available = new LinkedHashMap<>();
    variantIds.forEach(id -> available.put(id, 0L));
    if (!variantIds.isEmpty()) {
      for (var row : stockRepository.tongTonCoTheBanTheoKhoVaPhienBan(warehouseId, variantIds)) {
        available.put(
            row.getPhienBanId(), row.getTonCoTheBan() == null ? 0L : row.getTonCoTheBan());
      }
    }
    return available;
  }
}
