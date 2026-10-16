package com.example.dantruventu.Services.order.sales;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.SalesPromotionDetailRepository;
import com.example.dantruventu.Repository.order.SalesPromotionRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.product.SanPhamRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.ThanhPhanComboRepository;
import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class SalesCalculationService {

  private final SalesContext context;
  private final SalesProperties properties;
  private final PhienBanSanPhamRepository variantRepository;
  private final SanPhamRepository productRepository;
  private final ThanhPhanComboRepository componentRepository;
  private final TonKhoRepository stockRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final SalesPromotionRepository promotionRepository;
  private final SalesPromotionDetailRepository promotionDetailRepository;
  private final EntityManager entityManager;

  public record SerialKey(String lineKey, Long variantId) {}

  public record Catalog(
      Map<Long, PhienBanSanPham> variants, Map<Long, Map<Long, Integer>> physicalUnits) {}

  public record SaleLine(
      String key,
      PhienBanSanPham variant,
      int quantity,
      Map<Long, Integer> physical,
      BigDecimal unitPrice,
      BigDecimal amount,
      BigDecimal vatRate,
      BigDecimal includedVat,
      boolean gift) {}

  public record Plan(
      List<SaleLine> lines,
      Map<Long, Integer> quantities,
      Map<Long, TonKho> stocks,
      Map<SerialKey, Integer> serialRequirements,
      KhuyenMai promotion,
      AdminSalesResponse.Preview data) {}

  private record InputLine(String key, Long variantId, int quantity, boolean gift) {}

  public record SaleAvailability(Long quantity, String reason) {

    public boolean canSell() {
      return quantity != null && quantity > 0;
    }
  }

  public SaleAvailability readSaleAvailability(Long variantId) {

    if (variantId == null || variantId <= 0) {
      return new SaleAvailability(null, "Phiên bản không hợp lệ.");
    }

    try {
      Long warehouseId = context.defaultWarehouseId();
      context.warehouse(warehouseId);

      // Dùng chính phép quy đổi đang phục vụ nghiệp vụ bán hàng.
      Catalog catalog = catalog(List.of(variantId), false);
      Map<Long, Integer> units = catalog.physicalUnits().get(variantId);

      if (units == null || units.isEmpty()) {
        return new SaleAvailability(null, "Sản phẩm chưa có cấu hình bán hàng.");
      }

      long capacity = Long.MAX_VALUE;

      for (var entry : units.entrySet()) {
        TonKho currentStock = stock(warehouseId, entry.getKey(), false);

        long available = currentStock == null ? 0L : currentStock.getTonCoTheBan();

        long quantity = available / entry.getValue();
        capacity = Math.min(capacity, quantity);
      }

      long availableQuantity = capacity == Long.MAX_VALUE ? 0L : capacity;

      return new SaleAvailability(
          availableQuantity,
          availableQuantity > 0 ? null : "Hiện chưa đủ tồn để mua sản phẩm này.");

    } catch (AppException exception) {
      if (exception.getErrorCode() == ErrorCode.CONFLICT
          || exception.getErrorCode() == ErrorCode.NOT_FOUND) {

        return new SaleAvailability(null, "Sản phẩm hoặc cấu hình hiện chưa sẵn sàng để bán.");
      }

      throw exception;
    }
  }

  public Catalog catalog(Collection<Long> requestedIds, boolean lock) {

    var ids = new TreeSet<>(requestedIds);
    var productIds = new TreeSet<Long>();

    for (Long id : ids) {
      productIds.add(
          variantRepository
              .findProductIdForSale(id)
              .orElseThrow(() -> notFound("Phiên bản không tồn tại: " + id)));
    }

    if (lock) {
      for (Long productId : productIds) {
        SanPham product =
            productRepository
                .findByIdForUpdate(productId)
                .orElseThrow(() -> notFound("Sản phẩm không tồn tại"));

        entityManager.refresh(product);
      }
    }

    Map<Long, PhienBanSanPham> variants = new TreeMap<>();
    Map<Long, Map<Long, Integer>> units = new TreeMap<>();
    Set<Long> componentIds = new TreeSet<>();

    for (Long id : ids) {

      PhienBanSanPham variant =
          (lock ? variantRepository.findByIdForSaleUpdate(id) : variantRepository.findById(id))
              .orElseThrow(() -> notFound("Phiên bản không tồn tại: " + id));

      if (lock) {
        entityManager.refresh(variant);
      }

      requireActive(variant);
      variants.put(id, variant);

      var parts = new TreeMap<Long, Integer>();

      if (variant.getSanPham().getLoaiSanPham() == LoaiSanPham.DON) {

        parts.put(id, 1);

      } else if (variant.getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC) {

        Long comboId = variant.getSanPham().getId();

        var saleVariants =
            lock
                ? variantRepository.findSaleVariantsForUpdate(comboId)
                : variantRepository.findBySanPhamIdInOrderByIdAsc(List.of(comboId));

        if (saleVariants.size() != 1 || !Objects.equals(saleVariants.get(0).getId(), id)) {
          throw conflict("Combo phải có đúng một phiên bản bán: " + comboId);
        }

        var components = componentRepository.findByComboIds(List.of(comboId));

        if (components.isEmpty()) {
          throw conflict("Combo chưa có thành phần: " + comboId);
        }

        for (ThanhPhanCombo component : components) {

          PhienBanSanPham physical = component.getPhienBanThanhPhan();

          if (physical.getSanPham().getLoaiSanPham() != LoaiSanPham.DON
              || component.getSoLuong() == null
              || component.getSoLuong() <= 0) {
            throw conflict("Cấu hình thành phần combo không hợp lệ");
          }

          parts.merge(physical.getId(), component.getSoLuong(), (a, b) -> quantity((long) a + b));

          componentIds.add(physical.getId());
        }

      } else {
        throw conflict("Loại sản phẩm chưa được hỗ trợ");
      }

      units.put(id, parts);
    }

    if (!componentIds.isEmpty()) {

      var physicalVariants =
          lock
              ? variantRepository.findComponentsForShare(componentIds)
              : variantRepository.findAllById(componentIds);

      if (physicalVariants.size() != componentIds.size()) {
        throw conflict("Không tìm thấy đầy đủ linh kiện combo");
      }

      for (PhienBanSanPham physical : physicalVariants) {

        if (lock) {
          entityManager.refresh(physical, LockModeType.PESSIMISTIC_READ);
          entityManager.refresh(physical.getSanPham(), LockModeType.PESSIMISTIC_READ);
        }

        requireActive(physical);

        if (physical.getSanPham().getLoaiSanPham() != LoaiSanPham.DON) {
          throw conflict("Không cho phép combo lồng combo");
        }

        variants.put(physical.getId(), physical);
      }
    }

    return new Catalog(variants, units);
  }

  public boolean usesSerial(Long variantId) {
    var variant =
        variantRepository
            .findById(variantId)
            .orElseThrow(
                () ->
                    new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản " + variantId));

    Boolean configured = variant.getCoQuanLySerial();

    if (configured == null) {
      throw new AppException(
          ErrorCode.CONFLICT, "Phiên bản " + variantId + " chưa có cấu hình quản lý serial");
    }

    return configured;
  }

  /** Cùng phép quy đổi combo -> linh kiện cho đơn hàng và kiểm tra toàn bộ giỏ. */
  public Map<Long, Integer> physicalDemand(Catalog catalog, Map<Long, Integer> saleQuantities) {
    Map<Long, Integer> total = new TreeMap<>();
    for (var sale : saleQuantities.entrySet()) {
      physicalLineDemand(catalog, sale.getKey(), sale.getValue())
          .forEach((id, required) -> total.merge(id, required, (a, b) -> quantity((long) a + b)));
    }
    return total;
  }

  private Map<Long, Integer> physicalLineDemand(Catalog catalog, Long variantId, int saleQuantity) {
    Map<Long, Integer> physical = new TreeMap<>();
    for (var part : catalog.physicalUnits().get(variantId).entrySet()) {
      physical.put(part.getKey(), quantity((long) part.getValue() * saleQuantity));
    }
    return physical;
  }

  public TonKho stock(Long warehouseId, Long variantId, boolean lock) {

    List<TonKho> rows =
        lock
            ? stockRepository.findForSerialUpdate(warehouseId, variantId)
            : stockRepository.findByKhoHang_IdAndPhienBan_IdOrderByIdAsc(warehouseId, variantId);

    if (rows.size() > 1) {
      throw conflict("Có nhiều bản ghi tồn cho cùng kho và phiên bản " + variantId);
    }

    if (rows.isEmpty()) {
      return null;
    }

    TonKho stock = rows.get(0);

    if (lock) {
      entityManager.refresh(stock);
    }

    if (stock.getTonThucTe() == null
        || stock.getTonCoTheBan() == null
        || stock.getHangLoi() == null
        || stock.getSoLuongGiuChoBaoHanh() == null
        || stock.getTonThucTe() < 0
        || stock.getTonCoTheBan() < 0
        || stock.getHangLoi() < 0
        || stock.getSoLuongGiuChoBaoHanh() < 0
        || (long) stock.getTonCoTheBan() + stock.getHangLoi() + stock.getSoLuongGiuChoBaoHanh()
            > stock.getTonThucTe()) {

      throw conflict("Dữ liệu tồn kho không nhất quán tại phiên bản " + variantId);
    }

    return stock;
  }

  public Plan calculate(AdminSalesRequest.Base request, LoaiDonHang type, boolean lock) {

    return calculate(request, type, lock, text(request.getMaChuongTrinh()));
  }

  public List<AdminSalesResponse.Promotion> availablePromotions(
      AdminSalesRequest.Base request, LoaiDonHang type) {

    var result = new ArrayList<AdminSalesResponse.Promotion>();

    for (KhuyenMai promotion :
        promotionRepository.findAvailable(
            TrangThaiCoBanEnum.HOAT_DONG, LocalDateTime.now(properties.zone()))) {

      try {
        calculate(request, type, false, promotion.getMaChuongTrinh());

        result.add(
            new AdminSalesResponse.Promotion(
                promotion.getMaChuongTrinh(), promotion.getTenChuongTrinh()));

      } catch (AppException exception) {
        if (exception.getErrorCode() != ErrorCode.CONFLICT) {
          throw exception;
        }
        // Không gợi ý chương trình không đủ điều kiện cho giỏ hiện tại.
      }
    }

    return result;
  }

  private Plan calculate(
      AdminSalesRequest.Base request, LoaiDonHang type, boolean lock, String promotionCode) {

    context.warehouse(request.getKhoHangId());

    if (!"BAN_LE".equals(request.getBangGia())) {
      throw conflict("Hiện chỉ có bảng giá BAN_LE");
    }

    BigDecimal shipping = inputMoney(request.getPhiGiaoHang());

    if (type == LoaiDonHang.TAI_QUAY && shipping.signum() != 0) {
      throw invalid("Đơn POS không có phí giao hàng");
    }

    List<InputLine> inputs = new ArrayList<>();
    Map<Long, Integer> purchased = new TreeMap<>();
    Set<String> lineKeys = new HashSet<>();

    int index = 0;

    for (var item : request.getSanPham()) {

      index++;

      String key = text(item.getMaDong());

      if (key == null) {
        key = "d" + index;
      }

      if (key.startsWith("GIFT-")
          || key.matches("q[0-9]+v[0-9]+-[0-9]+")
          || !key.matches("[A-Za-z0-9_-]{1,40}")
          || !lineKeys.add(key)) {
        throw invalid("ma_dong không hợp lệ hoặc bị trùng: " + key);
      }

      inputs.add(new InputLine(key, item.getPhienBanId(), item.getSoLuong(), false));

      purchased.merge(item.getPhienBanId(), item.getSoLuong(), (a, b) -> quantity((long) a + b));
    }

    KhuyenMai promotion = null;
    List<ChiTietKhuyenMai> promotionDetails = List.of();

    if (promotionCode != null) {

      promotion =
          (lock
                  ? promotionRepository.findByCodeForUpdate(promotionCode)
                  : promotionRepository.findByMaChuongTrinhIgnoreCase(promotionCode))
              .orElseThrow(() -> notFound("Mã khuyến mại không tồn tại"));

      if (lock) {
        entityManager.refresh(promotion);
      }

      validatePromotion(promotion);

      promotionDetails =
          promotionDetailRepository.findByKhuyenMai_IdOrderByIdAsc(promotion.getId());

      Map<Long, Integer> requirements =
          promotionQuantities(promotionDetails, LoaiApDungKhuyenMai.SAN_PHAM_MUA);

      // Chương trình tặng quà theo phiên bản yêu cầu đủ TẤT CẢ
      // các phiên bản mua đã cấu hình.
      //
      // Chương trình chiết khấu theo phiên bản sẽ xét độc lập
      // từng phiên bản trong hàm discounts(...).
      if (promotion.getPhuongThucKhuyenMai() == PhuongThucKhuyenMai.TANG_SAN_PHAM
          && promotion.getDoiTuongKhuyenMai() == DoiTuongKhuyenMai.TUNG_SAN_PHAM) {

        if (requirements.isEmpty()) {
          throw conflict("Chương trình tặng quà chưa cấu hình sản phẩm mua");
        }

        for (var requirement : requirements.entrySet()) {
          int bought = purchased.getOrDefault(requirement.getKey(), 0);

          if (bought < requirement.getValue()) {
            throw conflict(
                "Chưa đủ số lượng mua của phiên bản " + requirement.getKey() + " để nhận bộ quà");
          }
        }
      }

      if (promotion.getPhuongThucKhuyenMai() == PhuongThucKhuyenMai.TANG_SAN_PHAM) {

        var gifts = promotionQuantities(promotionDetails, LoaiApDungKhuyenMai.SAN_PHAM_TANG);

        if (gifts.isEmpty()) {
          throw conflict("Chương trình chưa cấu hình sản phẩm tặng");
        }

        for (var gift : gifts.entrySet()) {
          inputs.add(
              new InputLine(
                  "q"
                      + promotion.getId()
                      + "v"
                      + promotion.getPhienBanCauHinh()
                      + "-"
                      + gift.getKey(),
                  gift.getKey(),
                  gift.getValue(),
                  true));
        }
      }
    }

    Catalog catalog = catalog(inputs.stream().map(InputLine::variantId).toList(), lock);

    List<SaleLine> lines = new ArrayList<>();
    Map<Long, Integer> saleQuantities = new TreeMap<>();
    for (InputLine input : inputs) {
      saleQuantities.merge(input.variantId(), input.quantity(), (a, b) -> quantity((long) a + b));
    }
    Map<Long, Integer> totalQuantities = physicalDemand(catalog, saleQuantities);

    for (InputLine input : inputs) {

      PhienBanSanPham variant = catalog.variants().get(input.variantId());

      Map<Long, Integer> physical =
          physicalLineDemand(catalog, input.variantId(), input.quantity());

      BigDecimal rate = vatRate(variant, request.getThue().getApDung());
      BigDecimal price = input.gift() ? BigDecimal.ZERO : money(variant.getGiaBanLe());
      BigDecimal includedVat = null;

      if (Boolean.TRUE.equals(request.getThue().getApDung())
          && "DA_BAO_GOM".equals(request.getThue().getCheDoGia())) {

        BigDecimal grossLine = price.multiply(BigDecimal.valueOf(input.quantity()));

        price = price.divide(BigDecimal.ONE.add(rate.movePointLeft(2)), 0, RoundingMode.HALF_UP);

        includedVat = grossLine.subtract(price.multiply(BigDecimal.valueOf(input.quantity())));
      }

      BigDecimal amount = money(price.multiply(BigDecimal.valueOf(input.quantity())));

      lines.add(
          new SaleLine(
              input.key(),
              variant,
              input.quantity(),
              physical,
              price,
              amount,
              rate,
              includedVat,
              input.gift()));
    }

    Map<Long, TonKho> stocks = new TreeMap<>();

    // Khóa tồn theo ID phiên bản tăng dần; serial được khóa ở bước chốt sau.
    for (var need : totalQuantities.entrySet()) {

      TonKho stock = stock(request.getKhoHangId(), need.getKey(), lock);

      if (stock == null || stock.getTonCoTheBan() < need.getValue()) {
        throw conflict("Không đủ tồn có thể bán của phiên bản " + need.getKey());
      }

      stocks.put(need.getKey(), stock);
    }

    Map<Long, Boolean> serialModes = new HashMap<>();

    for (Long physicalId : totalQuantities.keySet()) {
      PhienBanSanPham physicalVariant = catalog.variants().get(physicalId);

      serialModes.put(physicalId, CatalogSupport.serialManaged(physicalVariant));
    }

    Map<String, BigDecimal> discounts = discounts(promotion, promotionDetails, lines);

    Map<SerialKey, Integer> serialRequirements = new LinkedHashMap<>();
    List<AdminSalesResponse.PreviewLine> responseLines = new ArrayList<>();

    BigDecimal subtotal = BigDecimal.ZERO;
    BigDecimal discountTotal = BigDecimal.ZERO;
    BigDecimal vatTotal = BigDecimal.ZERO;

    for (SaleLine line : lines) {

      BigDecimal discount = discounts.getOrDefault(line.key(), BigDecimal.ZERO);
      BigDecimal taxable = line.amount().subtract(discount);

      BigDecimal vat;

      if (line.includedVat() != null) {
        // Giữ đúng giá đã gồm thuế; phân bổ phần VAT còn lại sau giảm.
        vat =
            line.amount().signum() == 0
                ? BigDecimal.ZERO
                : line.includedVat()
                    .multiply(taxable)
                    .divide(line.amount(), 0, RoundingMode.HALF_UP);
      } else {
        vat =
            taxable.multiply(line.vatRate()).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);
      }

      List<AdminSalesResponse.SerialRequirement> requirements = new ArrayList<>();

      for (var physical : line.physical().entrySet()) {

        if (Boolean.TRUE.equals(serialModes.get(physical.getKey()))) {

          serialRequirements.put(new SerialKey(line.key(), physical.getKey()), physical.getValue());

          requirements.add(
              new AdminSalesResponse.SerialRequirement(physical.getKey(), physical.getValue()));
        }
      }

      responseLines.add(
          new AdminSalesResponse.PreviewLine(
              line.key(),
              line.variant().getId(),
              line.unitPrice(),
              line.quantity(),
              line.vatRate(),
              discount,
              vat,
              taxable.add(vat),
              line.amount(),
              line.gift(),
              requirements));

      subtotal = subtotal.add(line.amount());
      discountTotal = discountTotal.add(discount);
      vatTotal = vatTotal.add(vat);
    }

    BigDecimal total = money(subtotal.subtract(discountTotal).add(vatTotal).add(shipping));

    var response =
        new AdminSalesResponse.Preview(
            money(subtotal),
            money(discountTotal),
            money(vatTotal),
            shipping,
            total,
            responseLines,
            List.of());

    return new Plan(lines, totalQuantities, stocks, serialRequirements, promotion, response);
  }

  private Map<Long, Integer> promotionQuantities(
      List<ChiTietKhuyenMai> details, LoaiApDungKhuyenMai type) {

    Map<Long, Integer> result = new TreeMap<>();

    for (ChiTietKhuyenMai detail : details) {

      if (detail.getLoaiApDung() != type) {
        continue;
      }

      if (detail.getSoLuong() == null || detail.getSoLuong() <= 0) {
        throw conflict("Số lượng cấu hình khuyến mại không hợp lệ");
      }

      result.merge(
          detail.getPhienBan().getId(), detail.getSoLuong(), (a, b) -> quantity((long) a + b));
    }

    return result;
  }

  private Map<String, BigDecimal> discounts(
      KhuyenMai promotion, List<ChiTietKhuyenMai> details, List<SaleLine> lines) {

    if (promotion == null) {
      return Map.of();
    }

    Map<Long, Integer> required = promotionQuantities(details, LoaiApDungKhuyenMai.SAN_PHAM_MUA);

    Map<Long, Integer> purchased = new TreeMap<>();

    for (SaleLine line : lines) {
      if (!line.gift()) {
        purchased.merge(line.variant().getId(), line.quantity(), (a, b) -> quantity((long) a + b));
      }
    }

    List<SaleLine> eligibleLines =
        lines.stream()
            .filter(line -> !line.gift())
            .filter(line -> eligible(line, promotion, required, purchased))
            .toList();

    if (eligibleLines.isEmpty()) {
      throw conflict("Giỏ hàng chưa có sản phẩm đủ điều kiện áp dụng chương trình");
    }

    BigDecimal eligibleAmount =
        eligibleLines.stream().map(SaleLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);

    long eligibleQuantity = eligibleLines.stream().mapToLong(SaleLine::quantity).sum();

    BigDecimal minimumAmount = promotion.getGiaTriHangToiThieu();

    Integer minimumQuantity = promotion.getSoLuongMuaToiThieu();

    if (minimumAmount == null
        || minimumAmount.signum() < 0
        || minimumQuantity == null
        || minimumQuantity < 0) {

      throw conflict("Chương trình chưa có cấu hình ngưỡng mua hợp lệ");
    }

    // Chỉ xét tiền và lượng hàng thuộc phạm vi chương trình.
    // Không cộng phí giao hàng, VAT hoặc hàng tặng.
    if (eligibleAmount.compareTo(minimumAmount) < 0 || eligibleQuantity < minimumQuantity) {

      throw conflict("Chưa đạt giá trị hoặc số lượng mua tối thiểu của chương trình");
    }

    if (promotion.getPhuongThucKhuyenMai() == PhuongThucKhuyenMai.TANG_SAN_PHAM) {

      DoiTuongKhuyenMai scope = promotion.getDoiTuongKhuyenMai();

      if (scope != DoiTuongKhuyenMai.TONG_DON && scope != DoiTuongKhuyenMai.TUNG_SAN_PHAM) {

        throw conflict("Chương trình tặng quà chỉ hỗ trợ TONG_DON hoặc TUNG_SAN_PHAM");
      }

      if (promotion.getGiaTriKhuyenMai() != null
          || promotion.getLoaiChietKhau() != null
          || promotion.getMucGiamToiDa() != null) {

        throw conflict("Chương trình tặng quà không được cấu hình giá trị hoặc loại chiết khấu");
      }

      return Map.of();
    }

    if (promotion.getPhuongThucKhuyenMai() != PhuongThucKhuyenMai.CHIET_KHAU) {

      throw conflict("Phương thức khuyến mại không được hỗ trợ");
    }

    LoaiChietKhau discountType = promotion.getLoaiChietKhau();

    BigDecimal value = promotion.getGiaTriKhuyenMai();

    if (discountType == null || value == null || value.signum() <= 0) {

      throw conflict("Chương trình chưa có loại hoặc giá trị chiết khấu hợp lệ");
    }

    if (discountType == LoaiChietKhau.PHAN_TRAM && value.compareTo(new BigDecimal("100")) > 0) {

      throw conflict("Phần trăm chiết khấu phải lớn hơn 0 và không vượt quá 100");
    }

    BigDecimal maximum = promotion.getMucGiamToiDa();

    if (maximum != null && maximum.signum() <= 0) {
      throw conflict("Mức giảm tối đa phải lớn hơn 0");
    }

    Map<String, BigDecimal> weights = new LinkedHashMap<>();

    BigDecimal discountTotal;

    if (discountType == LoaiChietKhau.PHAN_TRAM) {

      discountTotal =
          eligibleAmount.multiply(value).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);

      if (maximum != null) {
        discountTotal = discountTotal.min(money(maximum));
      }

      discountTotal = discountTotal.min(eligibleAmount);

      for (SaleLine line : eligibleLines) {
        weights.put(line.key(), line.amount());
      }

    } else if (promotion.getDoiTuongKhuyenMai() == DoiTuongKhuyenMai.TONG_DON) {

      // SO_TIEN + TONG_DON: giảm một khoản cho toàn đơn.
      discountTotal = money(value).min(eligibleAmount);

      for (SaleLine line : eligibleLines) {
        weights.put(line.key(), line.amount());
      }

    } else {

      // SO_TIEN ở các phạm vi còn lại:
      // giảm theo mỗi đơn vị hàng đủ điều kiện.
      discountTotal = BigDecimal.ZERO;

      BigDecimal unitDiscount = money(value);

      for (SaleLine line : eligibleLines) {
        BigDecimal lineDiscount =
            unitDiscount.multiply(BigDecimal.valueOf(line.quantity())).min(line.amount());

        weights.put(line.key(), lineDiscount);

        discountTotal = discountTotal.add(lineDiscount);
      }
    }

    return allocateDiscount(eligibleLines, weights, discountTotal);
  }

  private boolean eligible(
      SaleLine line,
      KhuyenMai promotion,
      Map<Long, Integer> required,
      Map<Long, Integer> purchased) {

    DoiTuongKhuyenMai scope = promotion.getDoiTuongKhuyenMai();

    if (scope == null) {
      throw conflict("Chương trình chưa có phạm vi áp dụng");
    }

    SanPham product = line.variant().getSanPham();

    return switch (scope) {
      case TONG_DON -> true;

      case TUNG_SAN_PHAM -> {
        if (required.isEmpty()) {
          throw conflict("Chương trình chưa cấu hình SAN_PHAM_MUA");
        }

        Long variantId = line.variant().getId();

        Integer minimum = required.get(variantId);

        yield minimum != null && purchased.getOrDefault(variantId, 0) >= minimum;
      }

      case DANH_MUC, LOAI_SAN_PHAM -> {
        if (promotion.getDanhMuc() == null) {
          throw conflict("Chương trình chưa được cấu hình danh_muc_id");
        }

        Long targetId = promotion.getDanhMuc().getId();

        DanhMuc category = product.getDanhMuc();

        Set<Long> visited = new HashSet<>();
        boolean matches = false;

        while (category != null) {
          if (!visited.add(category.getId())) {
            throw conflict("Cây danh mục đang có liên kết vòng");
          }

          if (Objects.equals(category.getId(), targetId)) {

            matches = true;
            break;
          }

          category = category.getDanhMucCha();
        }

        yield matches;
      }

      case THUONG_HIEU, NHAN_HIEU -> {
        if (promotion.getThuongHieu() == null) {
          throw conflict("Chương trình chưa được cấu hình thuong_hieu_id");
        }

        yield product.getThuongHieu() != null
            && Objects.equals(product.getThuongHieu().getId(), promotion.getThuongHieu().getId());
      }
    };
  }

  private void validatePromotion(KhuyenMai promotion) {

    LocalDateTime now = LocalDateTime.now(properties.zone());

    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();

    if (promotion.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || promotion.getNgayBatDau() == null
        || promotion.getNgayKetThuc() == null
        || now.isBefore(promotion.getNgayBatDau())
        || now.isAfter(promotion.getNgayKetThuc())
        || used < 0
        || used == Integer.MAX_VALUE
        || (promotion.getSoLuongApDung() != null && used >= promotion.getSoLuongApDung())) {
      throw conflict("Khuyến mại chưa bắt đầu, đã hết hạn hoặc hết lượt");
    }

    if (promotion.getPhienBanCauHinh() == null || promotion.getPhienBanCauHinh() <= 0) {

      throw conflict("Chương trình chưa có phien_ban_cau_hinh hợp lệ");
    }

    long held =
        entityManager
            .createQuery(
                """
                              SELECT COUNT(k)
                              FROM KhuyenMaiDonHang k
                              WHERE k.khuyenMai.id = :promotionId
                                AND k.trangThaiApDung = :status
                              """,
                Long.class)
            .setParameter("promotionId", promotion.getId())
            .setParameter("status", TrangThaiApDungKhuyenMai.GIU_CHO)
            .getSingleResult();

    Integer limit = promotion.getSoLuongApDung();

    if (limit != null && (long) used + held >= limit) {

      throw conflict("Khuyến mại đã hết lượt khả dụng");
    }
  }

  private Map<String, BigDecimal> allocateDiscount(
      List<SaleLine> lines, Map<String, BigDecimal> weights, BigDecimal totalDiscount) {

    Map<String, BigDecimal> result = new LinkedHashMap<>();

    BigDecimal remainingWeight = weights.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal remainingDiscount = totalDiscount;

    for (SaleLine line : lines) {

      BigDecimal weight = weights.getOrDefault(line.key(), BigDecimal.ZERO);

      BigDecimal allocated =
          remainingWeight.signum() == 0
              ? BigDecimal.ZERO
              : remainingDiscount.multiply(weight).divide(remainingWeight, 0, RoundingMode.DOWN);

      if (allocated.signum() < 0 || allocated.compareTo(line.amount()) > 0) {

        throw conflict("Không thể phân bổ chiết khấu hợp lệ cho dòng " + line.key());
      }

      result.put(line.key(), allocated);

      remainingWeight = remainingWeight.subtract(weight);

      remainingDiscount = remainingDiscount.subtract(allocated);
    }

    if (remainingDiscount.signum() != 0) {
      throw conflict("Tổng phân bổ chiết khấu không khớp chương trình");
    }

    return result;
  }

  private BigDecimal vatRate(PhienBanSanPham variant, Boolean enabled) {

    if (!Boolean.TRUE.equals(enabled)) {
      return BigDecimal.ZERO;
    }

    BigDecimal value = variant.getSanPham().getThueVat();

    if (value == null) {
      return BigDecimal.ZERO;
    }

    if (value.signum() < 0 || value.compareTo(new BigDecimal("100")) > 0) {
      throw conflict("Thuế VAT của sản phẩm không hợp lệ");
    }

    return value;
  }

  private void requireActive(PhienBanSanPham variant) {

    if (variant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || variant.getSanPham().getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Sản phẩm hoặc phiên bản đang ngừng kinh doanh: " + variant.getId());
    }
  }
}
