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
import com.example.dantruventu.Services.order.sales.OrderSaleSnapshotService;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Services.order.sales.SoldDeviceService;
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
  private final OrderSaleSnapshotService saleSnapshots;
  private final SoldDeviceService soldDevices;

  public record Key(Long lineId, Long variantId) {}

  public record Plan(
      List<ChiTietDonHang> lines,
      Map<Long, Integer> quantities,
      Map<Key, Integer> serials,
      List<AdminOrderResponse.RequirementLine> requirements) {}

  public Plan plan(DonHang order, boolean lockCatalog) {
    context.warehouse(context.defaultWarehouseId());

    var lines =
        lockCatalog
            ? lineRepository.findByDonHangIdForUpdate(order.getId())
            : lineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    if (lines.isEmpty()) {
      throw conflict("Đơn hàng không có sản phẩm");
    }

    Map<Long, Integer> totals = new TreeMap<>();
    Map<Key, Integer> serials = new LinkedHashMap<>();
    List<AdminOrderResponse.RequirementLine> requirements = new ArrayList<>();

    for (var line : lines) {
      var snapshot = saleSnapshots.requireSnapshot(line);

      List<AdminOrderResponse.Requirement> groups = new ArrayList<>();
      List<Map<String, Object>> physicalRows = new ArrayList<>();

      for (var physical : saleSnapshots.physical(line).values()) {
        totals.merge(physical.variantId(), physical.quantity(), (a, b) -> quantity((long) a + b));

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("phien_ban_id", physical.variantId());
        row.put("ten_san_pham", physical.productName());
        row.put("ten_phien_ban", physical.variantName());
        row.put("so_luong", physical.quantity());
        row.put("quan_ly_serial", physical.serialManaged());
        physicalRows.add(row);

        if (physical.serialManaged()) {
          serials.put(new Key(line.getId(), physical.variantId()), physical.quantity());

          groups.add(
              new AdminOrderResponse.Requirement(
                  physical.variantId(),
                  physical.perUnit(),
                  physical.quantity(),
                  physical.productName(),
                  physical.variantName()));
        }
      }

      requirements.add(
          new AdminOrderResponse.RequirementLine(
              line.getId(),
              snapshot.productType(),
              line.getSoLuong(),
              List.copyOf(groups),
              snapshot.lineKey(),
              Boolean.TRUE.equals(line.getLaQuaTang()),
              snapshot.productName(),
              List.copyOf(physicalRows)));
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
      serial.setNgayKichHoat(null);
      serial.setHanBaoHanh(null);
    }

    Map<Long, SoSerialSanPham> selectedById = new HashMap<>();

    for (var serial : selected) {
      selectedById.put(serial.getId(), serial);
    }

    Map<SoldDeviceService.Key, List<SoSerialSanPham>> bindings = new HashMap<>();

    for (var item : request.getItems()) {
      for (var group : item.getSerials()) {
        bindings.put(
            new SoldDeviceService.Key(item.getChiTietDonHangId(), group.getPhienBanId()),
            group.getSerialIds().stream().map(selectedById::get).toList());
      }
    }

    soldDevices.prepare(order, plan.lines(), bindings);

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

  public List<Map<String, Object>> reservationRows(DonHang order, boolean released) {

    Plan plan = plan(order, false);
    List<Map<String, Object>> result = new ArrayList<>();

    if (!released) {
      for (var line : plan.lines()) {
        for (var item : saleSnapshots.physical(line).values()) {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("chi_tiet_don_hang_id", line.getId());
          row.put("phien_ban_id", item.variantId());
          row.put("so_luong", item.quantity());
          row.put("la_qua_tang", Boolean.TRUE.equals(line.getLaQuaTang()));
          result.add(row);
        }
      }
    } else {
      for (var entry : plan.quantities().entrySet()) {
        TonKho stock = calculation.stock(context.defaultWarehouseId(), entry.getKey(), false);

        if (stock == null) {
          throw conflict("Không tìm thấy tồn sau giải phóng giữ hàng");
        }

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("phien_ban_id", entry.getKey());
        row.put("so_luong_da_giu", entry.getValue());
        row.put("ton_thuc_te_sau", stock.getTonThucTe());
        row.put("ton_co_the_ban_sau", stock.getTonCoTheBan());
        result.add(row);
      }
    }

    return List.copyOf(result);
  }

  public long expectedHeld(Long variantId) {
    long total = 0;

    for (var line : lineRepository.findHeldLines()) {
      // physical() bắt buộc có bản chụp hợp lệ.
      // Không lấy cấu hình combo hiện tại để dựng lại đơn cũ.
      var item = saleSnapshots.physical(line).get(variantId);

      if (item != null) {
        try {
          total = Math.addExact(total, item.quantity());
        } catch (ArithmeticException exception) {
          throw conflict("Số lượng giữ hàng vượt giới hạn");
        }
      }
    }

    return total;
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

      long actualHeld =
          (long) stock.getTonThucTe()
              - stock.getHangLoi()
              - stock.getSoLuongGiuChoBaoHanh()
              - stock.getTonCoTheBan();
      Long expectedHeld = expectedHeld(entry.getKey());

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
