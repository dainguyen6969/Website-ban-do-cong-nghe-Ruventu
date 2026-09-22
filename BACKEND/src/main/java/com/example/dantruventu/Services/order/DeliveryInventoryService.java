package com.example.dantruventu.Services.order;

import com.example.dantruventu.DTO.Request.order.AdminDeliveryReturnRequest;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.warehouse.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class DeliveryInventoryService {

  private final ChiTietDonHangRepository orderLineRepository;
  private final ThanhPhanComboRepository componentRepository;
  private final KhoHangRepository warehouseRepository;
  private final TonKhoRepository stockRepository;
  private final TheKhoRepository ledgerRepository;
  private final SoSerialSanPhamRepository serialRepository;

  @Value("${ruventu.inventory.default-warehouse-id:1}")
  private Long defaultWarehouseId;

  private record Key(Long lineId, Long variantId) {}

  private record Expected(ChiTietDonHang line, PhienBanSanPham variant, int quantity) {}

  public boolean usesSerial(PhienBanSanPham variant) {
    if (variant.getSanPham().getLoaiSanPham() == LoaiSanPham.DON) {
      return serialRepository.countByPhienBanId(variant.getId()) > 0;
    }

    return componentRepository.findByComboIds(List.of(variant.getSanPham().getId())).stream()
        .anyMatch(
            component ->
                serialRepository.countByPhienBanId(component.getPhienBanThanhPhan().getId()) > 0);
  }

  public void releaseReservation(DonHang order) {
    requireWarehouse();

    if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DANG_DONG_GOI
        && order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI) {
      throw conflict("Đơn không ở trạng thái có giữ hàng để hủy đóng gói");
    }

    if (ledgerRepository.existsByMaChungTuGocAndLoaiGiaoDich(
        order.getId(), LoaiGiaoDichKho.XUAT_BAN)) {
      throw conflict("Đơn đã có chứng từ xuất bán, không được giải phóng giữ hàng");
    }

    Map<Long, Integer> quantities = totals(expected(order.getId()));

    for (var entry : quantities.entrySet()) {
      Long variantId = entry.getKey();
      int quantity = entry.getValue();

      TonKho stock = lockStock(variantId);
      validateStock(stock);

      long held = (long) stock.getTonThucTe() - stock.getHangLoi() - stock.getTonCoTheBan();

      Long expectedHeld = orderLineRepository.sumReservedQuantity(variantId);

      if (expectedHeld == null || held != expectedHeld || held < quantity) {
        throw conflict(
            "Số lượng giữ hàng không khớp tại phiên bản "
                + variantId
                + ". Cần đối chiếu luồng giữ hàng trước khi hủy");
      }

      stock.setTonCoTheBan(bounded((long) stock.getTonCoTheBan() + quantity));
    }

    // Không đổi tồn thực tế, không sinh thẻ kho.
  }

  public void receiveAll(
      DonHang order, PhieuTraHang returnDocument, AdminDeliveryReturnRequest request) {

    KhoHang warehouse = requireWarehouse();
    Map<Key, Expected> expected = expected(order.getId());
    Map<Long, Integer> expectedTotals = totals(expected);

    verifyExport(order.getId(), expectedTotals);

    Map<Key, AdminDeliveryReturnRequest.Item> received = new HashMap<>();

    for (var item : request.getHangNhan()) {
      if (!Objects.equals(item.getKhoHangId(), defaultWarehouseId)) {
        throw conflict("Chỉ được nhận về kho mặc định đã cấu hình");
      }

      Key key = new Key(item.getChiTietDonHangId(), item.getPhienBanId());

      if (received.putIfAbsent(key, item) != null) {
        throw conflict("Trùng dòng nhận hàng");
      }

      Expected requirement = expected.get(key);

      if (requirement == null) {
        throw conflict("Dòng đơn hoặc phiên bản nhận không thuộc hàng đã bán");
      }

      long total = (long) item.getSoLuongNguyenVen() + item.getSoLuongLoi();

      if (total != requirement.quantity()) {
        throw conflict(
            "Phải nhận đủ "
                + requirement.quantity()
                + " sản phẩm tại dòng "
                + item.getChiTietDonHangId()
                + ", phiên bản "
                + item.getPhienBanId());
      }
    }

    if (!received.keySet().equals(expected.keySet())) {
      throw conflict("Danh sách nhận thiếu hoặc thừa phiên bản đã xuất");
    }

    // Khóa tồn theo thứ tự phiên bản, sau đó mới khóa serial.
    Map<Long, TonKho> stocks = new TreeMap<>();

    for (Long variantId : expectedTotals.keySet()) {
      TonKho stock = lockStock(variantId);
      validateStock(stock);
      stocks.put(variantId, stock);
    }

    List<SoSerialSanPham> assigned = serialRepository.findByOrderForUpdate(order.getId());

    Map<Long, SoSerialSanPham> serialById = new HashMap<>();

    for (SoSerialSanPham serial : assigned) {
      serialById.put(serial.getId(), serial);
    }

    Set<Long> seenSerialIds = new HashSet<>();
    Map<Long, Integer> goodTotals = new TreeMap<>();
    Map<Long, Integer> damagedTotals = new TreeMap<>();

    for (var entry : expected.entrySet()) {
      Expected requirement = entry.getValue();
      var item = received.get(entry.getKey());
      Long variantId = requirement.variant().getId();

      boolean managed = serialRepository.countByPhienBanId(variantId) > 0;

      if (managed && item.getSerials().size() != requirement.quantity()) {
        throw conflict("Phiên bản quản lý serial phải nhận đủ serial");
      }

      if (!managed && !item.getSerials().isEmpty()) {
        throw conflict("Phiên bản không quản lý serial phải gửi serials rỗng");
      }

      int goodSerials = 0;
      int damagedSerials = 0;

      for (var serialItem : item.getSerials()) {
        if (!seenSerialIds.add(serialItem.getSoSerialId())) {
          throw conflict("Một serial bị gửi nhiều lần");
        }

        SoSerialSanPham serial = serialById.get(serialItem.getSoSerialId());

        if (serial == null
            || !Objects.equals(serial.getPhienBan().getId(), variantId)
            || serial.getTrangThai() != TrangThaiSerial.DA_BAN) {
          throw conflict("Serial không thuộc đơn/phiên bản hoặc không ở trạng thái DA_BAN");
        }

        TrangThaiSerial target = serialItem.getTrangThaiSauNhan();

        if (target == TrangThaiSerial.TRONG_KHO) {
          goodSerials++;
        } else if (target == TrangThaiSerial.LOI) {
          damagedSerials++;
        } else {
          throw conflict("Serial nhận về chỉ được TRONG_KHO hoặc LOI");
        }

        serial.setTrangThai(target);
        serial.setDonHang(null);

        // Giao thất bại: khách chưa nhận sử dụng sản phẩm.
        serial.setNgayKichHoat(null);
        serial.setHanBaoHanh(null);
      }

      if (managed
          && (goodSerials != item.getSoLuongNguyenVen()
              || damagedSerials != item.getSoLuongLoi())) {
        throw conflict("Tình trạng serial không khớp số lượng nguyên vẹn/lỗi");
      }

      merge(goodTotals, variantId, item.getSoLuongNguyenVen());
      merge(damagedTotals, variantId, item.getSoLuongLoi());
    }

    if (!seenSerialIds.equals(serialById.keySet())) {
      throw conflict("Chưa nhận đủ toàn bộ serial đang liên kết với đơn");
    }

    for (var entry : expectedTotals.entrySet()) {
      Long variantId = entry.getKey();
      TonKho stock = stocks.get(variantId);
      int quantity = entry.getValue();

      stock.setTonThucTe(bounded((long) stock.getTonThucTe() + quantity));

      stock.setTonCoTheBan(
          bounded((long) stock.getTonCoTheBan() + goodTotals.getOrDefault(variantId, 0)));

      stock.setHangLoi(
          bounded((long) stock.getHangLoi() + damagedTotals.getOrDefault(variantId, 0)));

      ledgerRepository.save(
          TheKho.builder()
              .khoHang(warehouse)
              .phienBan(stock.getPhienBan())
              .loaiGiaoDich(LoaiGiaoDichKho.KHACH_TRA)
              .maChungTuGoc(returnDocument.getId())
              .soLuongThayDoi(quantity)
              .tonCuoi(stock.getTonThucTe())
              .ghiChu("Nhận hàng hoàn " + returnDocument.getMaTraHang())
              .build());
    }
  }

  private Map<Key, Expected> expected(Long orderId) {
    List<ChiTietDonHang> lines = orderLineRepository.findByDonHang_IdOrderByIdAsc(orderId);

    if (lines.isEmpty()) {
      throw conflict("Đơn hàng không có chi tiết sản phẩm");
    }

    Map<Key, Expected> result = new LinkedHashMap<>();

    for (ChiTietDonHang line : lines) {
      if (line.getSoLuong() == null || line.getSoLuong() <= 0) {
        throw conflict("Số lượng dòng đơn không hợp lệ");
      }

      PhienBanSanPham saleVariant = line.getPhienBan();

      if (saleVariant.getSanPham().getLoaiSanPham() == LoaiSanPham.DON) {
        addExpected(result, line, saleVariant, line.getSoLuong());
        continue;
      }

      if (saleVariant.getSanPham().getLoaiSanPham() != LoaiSanPham.BO_PC) {
        throw conflict("Loại sản phẩm không được hỗ trợ");
      }

      var components =
          componentRepository.findByComboIds(List.of(saleVariant.getSanPham().getId()));

      if (components.isEmpty()) {
        throw conflict("Combo không có cấu hình thành phần");
      }

      for (ThanhPhanCombo component : components) {
        if (component.getSoLuong() == null
            || component.getSoLuong() <= 0
            || component.getPhienBanThanhPhan().getSanPham().getLoaiSanPham() != LoaiSanPham.DON) {
          throw conflict("Cấu hình combo không hợp lệ");
        }

        int quantity = bounded((long) line.getSoLuong() * component.getSoLuong());

        addExpected(result, line, component.getPhienBanThanhPhan(), quantity);
      }
    }

    return result;
  }

  private void addExpected(
      Map<Key, Expected> result, ChiTietDonHang line, PhienBanSanPham variant, int quantity) {

    Key key = new Key(line.getId(), variant.getId());
    Expected previous = result.get(key);

    int total = previous == null ? quantity : bounded((long) previous.quantity() + quantity);

    result.put(key, new Expected(line, variant, total));
  }

  private Map<Long, Integer> totals(Map<Key, Expected> expected) {
    Map<Long, Integer> result = new TreeMap<>();

    for (Expected item : expected.values()) {
      merge(result, item.variant().getId(), item.quantity());
    }

    return result;
  }

  private void verifyExport(Long orderId, Map<Long, Integer> expected) {
    var exports =
        ledgerRepository.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(
            orderId, LoaiGiaoDichKho.XUAT_BAN);

    if (exports.isEmpty()) {
      throw conflict("Thiếu thẻ kho XUAT_BAN của đơn hàng");
    }

    Map<Long, Integer> exported = new TreeMap<>();

    for (TheKho movement : exports) {
      if (!Objects.equals(movement.getKhoHang().getId(), defaultWarehouseId)
          || movement.getSoLuongThayDoi() == null
          || movement.getSoLuongThayDoi() >= 0) {
        throw conflict("Chứng từ xuất kho không hợp lệ hoặc thuộc kho khác");
      }

      int quantity = bounded(-(long) movement.getSoLuongThayDoi());
      merge(exported, movement.getPhienBan().getId(), quantity);
    }

    if (!exported.equals(expected)) {
      throw conflict("Hàng trong đơn không khớp toàn bộ chứng từ xuất kho");
    }
  }

  private KhoHang requireWarehouse() {
    if (warehouseRepository.count() != 1) {
      throw conflict("Luồng này áp dụng MVP một kho; cần xác định nguồn kho khi mở rộng");
    }

    KhoHang warehouse =
        warehouseRepository
            .findById(defaultWarehouseId)
            .orElseThrow(() -> conflict("Kho mặc định không tồn tại"));

    if (warehouse.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Kho mặc định đã ngừng hoạt động");
    }

    return warehouse;
  }

  private TonKho lockStock(Long variantId) {
    var rows = stockRepository.findForSerialUpdate(defaultWarehouseId, variantId);

    if (rows.size() != 1) {
      throw conflict("Phiên bản " + variantId + " phải có đúng một bản ghi tồn tại kho mặc định");
    }

    return rows.getFirst();
  }

  private void validateStock(TonKho stock) {
    Integer physical = stock.getTonThucTe();
    Integer available = stock.getTonCoTheBan();
    Integer damaged = stock.getHangLoi();

    if (physical == null
        || available == null
        || damaged == null
        || physical < 0
        || available < 0
        || damaged < 0
        || (long) available + damaged > physical) {
      throw conflict("Dữ liệu tồn kho không hợp lệ, cần đối chiếu trước khi xử lý");
    }
  }

  private void merge(Map<Long, Integer> map, Long key, int value) {
    map.put(key, bounded((long) map.getOrDefault(key, 0) + value));
  }

  private int bounded(long value) {
    if (value < 0 || value > Integer.MAX_VALUE) {
      throw conflict("Số lượng vượt giới hạn lưu trữ");
    }
    return (int) value;
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }
}
