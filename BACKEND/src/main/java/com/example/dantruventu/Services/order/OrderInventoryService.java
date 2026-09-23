package com.example.dantruventu.Services.order;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminOrderRequest;
import com.example.dantruventu.DTO.Response.order.AdminOrderResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class OrderInventoryService {

  private final ChiTietDonHangRepository lineRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final TheKhoRepository ledgerRepository;
  private final SalesCalculationService calculation;
  private final SalesContext context;
  private final SalesProperties properties;
  private final EntityManager entityManager;

  public record Key(Long lineId, Long variantId) {}

  public record Plan(
      List<ChiTietDonHang> lines,
      Map<Long, Integer> quantities,
      Map<Key, Integer> serials,
      List<AdminOrderResponse.RequirementLine> requirements) {}

  public Plan plan(DonHang order, boolean lockCatalog) {
    context.warehouse(context.defaultWarehouseId());

    var lines = lineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    if (lines.isEmpty()) {
      throw conflict("Đơn hàng không có sản phẩm");
    }

    var catalog =
        calculation.catalog(lines.stream().map(x -> x.getPhienBan().getId()).toList(), lockCatalog);

    Map<Long, Integer> totals = new TreeMap<>();
    Map<Key, Integer> serials = new LinkedHashMap<>();
    Map<Long, Boolean> modes = new HashMap<>();
    List<AdminOrderResponse.RequirementLine> requirements = new ArrayList<>();

    for (var line : lines) {
      if (line.getSoLuong() == null || line.getSoLuong() <= 0) {
        throw conflict("Số lượng dòng đơn không hợp lệ");
      }

      var units = catalog.physicalUnits().get(line.getPhienBan().getId());
      List<AdminOrderResponse.Requirement> groups = new ArrayList<>();

      for (var part : units.entrySet()) {
        int needed = quantity((long) line.getSoLuong() * part.getValue());

        totals.merge(part.getKey(), needed, (a, b) -> quantity((long) a + b));

        boolean managed = modes.computeIfAbsent(part.getKey(), calculation::usesSerial);

        if (managed) {
          serials.put(new Key(line.getId(), part.getKey()), needed);

          groups.add(new AdminOrderResponse.Requirement(part.getKey(), part.getValue(), needed));
        }
      }

      requirements.add(
          new AdminOrderResponse.RequirementLine(
              line.getId(),
              line.getPhienBan().getSanPham().getLoaiSanPham(),
              line.getSoLuong(),
              groups));
    }

    return new Plan(lines, totals, serials, requirements);
  }

  public void checkAvailable(DonHang order) {
    Plan plan = plan(order, true);
    Map<Long, TonKho> stocks = lockStocks(plan, false);

    for (var need : plan.quantities().entrySet()) {
      if (stocks.get(need.getKey()).getTonCoTheBan() < need.getValue()) {
        throw conflict("Không đủ tồn có thể bán của phiên bản " + need.getKey());
      }
    }
  }

  public void reserve(DonHang order) {
    requireNoExport(order);

    Plan plan = plan(order, true);
    Map<Long, TonKho> stocks = lockStocks(plan, false);

    // Kiểm tra toàn bộ trước khi thay đổi bất kỳ bản ghi tồn nào.
    for (var need : plan.quantities().entrySet()) {
      if (stocks.get(need.getKey()).getTonCoTheBan() < need.getValue()) {
        throw conflict("Không đủ tồn có thể bán của phiên bản " + need.getKey());
      }
    }

    for (var need : plan.quantities().entrySet()) {
      TonKho stock = stocks.get(need.getKey());
      stock.setTonCoTheBan(stock.getTonCoTheBan() - need.getValue());
    }

    // Chưa giảm tồn thực tế, chưa ghi thẻ kho, chưa gán serial.
  }

  public void export(DonHang order, AdminOrderRequest.Export request) {

    if (!Objects.equals(request.getKhoHangId(), context.defaultWarehouseId())) {
      throw conflict("Chỉ được xuất tại kho mặc định");
    }

    requireNoExport(order);

    Plan plan = plan(order, true);
    Map<Long, TonKho> stocks = lockStocks(plan, true);

    Set<Long> expectedLineIds = new HashSet<>();
    for (var line : plan.lines()) {
      expectedLineIds.add(line.getId());
    }

    Set<Long> suppliedLineIds = new HashSet<>();
    Set<Key> suppliedGroups = new HashSet<>();
    Map<Long, Long> variantBySerial = new TreeMap<>();

    for (var item : request.getItems()) {
      if (!suppliedLineIds.add(item.getChiTietDonHangId())) {
        throw invalid("Chi tiết đơn hàng bị gửi trùng");
      }

      if (!expectedLineIds.contains(item.getChiTietDonHangId())) {
        throw invalid("Chi tiết đơn hàng không thuộc đơn này");
      }

      for (var group : item.getSerials()) {
        Key key = new Key(item.getChiTietDonHangId(), group.getPhienBanId());

        if (!suppliedGroups.add(key)) {
          throw invalid("Nhóm serial bị gửi trùng");
        }

        Integer required = plan.serials().get(key);

        if (required == null) {
          throw conflict("Phiên bản không thuộc yêu cầu serial của dòng đơn");
        }

        if (group.getSerialIds().size() != required) {
          throw conflict("Thiếu hoặc thừa serial tại dòng " + key.lineId());
        }

        for (Long serialId : group.getSerialIds()) {
          if (variantBySerial.putIfAbsent(serialId, group.getPhienBanId()) != null) {
            throw invalid("Một serial không được dùng nhiều lần trong đơn");
          }
        }
      }
    }

    if (!suppliedLineIds.equals(expectedLineIds)) {
      throw invalid("Phải gửi đầy đủ các dòng đơn hàng");
    }

    if (!suppliedGroups.equals(plan.serials().keySet())) {
      throw conflict("Chưa phân bổ đầy đủ các nhóm serial");
    }

    List<SoSerialSanPham> selected = new ArrayList<>();

    // TreeMap đảm bảo khóa serial theo ID tăng dần.
    for (var entry : variantBySerial.entrySet()) {
      SoSerialSanPham serial =
          serialRepository
              .findByIdForUpdate(entry.getKey())
              .orElseThrow(() -> notFound("Serial không tồn tại: " + entry.getKey()));

      entityManager.refresh(serial);

      if (!Objects.equals(serial.getPhienBan().getId(), entry.getValue())
          || serial.getTrangThai() != TrangThaiSerial.TRONG_KHO
          || serial.getDonHang() != null) {
        throw conflict("Serial không còn khả dụng: " + serial.getSoSerial());
      }

      selected.add(serial);
    }

    LocalDateTime activation = LocalDateTime.now(properties.zone());

    for (SoSerialSanPham serial : selected) {
      serial.setDonHang(order);
      serial.setTrangThai(TrangThaiSerial.DA_BAN);
      serial.setNgayKichHoat(activation);
      // Chưa tính hanBaoHanh.
    }

    for (var need : plan.quantities().entrySet()) {
      TonKho stock = stocks.get(need.getKey());
      int quantity = need.getValue();

      stock.setTonThucTe(stock.getTonThucTe() - quantity);

      // tonCoTheBan đã giảm khi reserve(), không giảm lần hai.
      ledgerRepository.save(
          TheKho.builder()
              .khoHang(stock.getKhoHang())
              .phienBan(stock.getPhienBan())
              .loaiGiaoDich(LoaiGiaoDichKho.XUAT_BAN)
              .maChungTuGoc(order.getId())
              .soLuongThayDoi(-quantity)
              .tonCuoi(stock.getTonThucTe())
              .ghiChu("Xuất đơn " + order.getMaDonHang())
              .build());
    }
  }

  private Map<Long, TonKho> lockStocks(Plan plan, boolean requireHeld) {
    Map<Long, TonKho> stocks = new TreeMap<>();

    for (Long variantId : plan.quantities().keySet()) {
      TonKho stock = calculation.stock(context.defaultWarehouseId(), variantId, true);

      if (stock == null) {
        throw conflict("Chưa có tồn kho của phiên bản " + variantId);
      }

      stocks.put(variantId, stock);
    }

    // Chạy khi chưa thay đổi tồn/trạng thái đơn.
    for (var entry : stocks.entrySet()) {
      TonKho stock = entry.getValue();

      long actualHeld = (long) stock.getTonThucTe() - stock.getHangLoi() - stock.getTonCoTheBan();

      Long expectedHeld = lineRepository.sumReservedQuantity(entry.getKey());

      if (expectedHeld == null || actualHeld != expectedHeld.longValue()) {
        throw conflict("Tồn giữ hàng không nhất quán tại phiên bản " + entry.getKey());
      }

      if (requireHeld && actualHeld < plan.quantities().get(entry.getKey())) {
        throw conflict("Đơn chưa được giữ đủ hàng");
      }
    }

    return stocks;
  }

  public void requireNoExport(DonHang order) {
    if (ledgerRepository.existsByMaChungTuGocAndLoaiGiaoDich(
        order.getId(), LoaiGiaoDichKho.XUAT_BAN)) {
      throw conflict("Đơn đã có chứng từ xuất bán");
    }
  }
}
