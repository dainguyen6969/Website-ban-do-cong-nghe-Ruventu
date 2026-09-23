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

        if (saleVariants.size() != 1 || !Objects.equals(saleVariants.getFirst().getId(), id)) {
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
    return serialRepository.countByPhienBanId(variantId) > 0;
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

    TonKho stock = rows.getFirst();

    if (lock) {
      entityManager.refresh(stock);
    }

    if (stock.getTonThucTe() == null
        || stock.getTonCoTheBan() == null
        || stock.getHangLoi() == null
        || stock.getTonThucTe() < 0
        || stock.getTonCoTheBan() < 0
        || stock.getHangLoi() < 0
        || (long) stock.getTonCoTheBan() + stock.getHangLoi() > stock.getTonThucTe()) {
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

      if (key.startsWith("GIFT-") || !key.matches("[A-Za-z0-9_-]{1,40}") || !lineKeys.add(key)) {
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

      for (var requirement : requirements.entrySet()) {
        if (purchased.getOrDefault(requirement.getKey(), 0) < requirement.getValue()) {
          throw conflict("Chưa đủ số lượng mua để áp dụng khuyến mại");
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
                  "GIFT-" + promotion.getId() + "-" + gift.getKey(),
                  gift.getKey(),
                  gift.getValue(),
                  true));
        }
      }
    }

    Catalog catalog = catalog(inputs.stream().map(InputLine::variantId).toList(), lock);

    List<SaleLine> lines = new ArrayList<>();
    Map<Long, Integer> totalQuantities = new TreeMap<>();

    for (InputLine input : inputs) {

      PhienBanSanPham variant = catalog.variants().get(input.variantId());

      Map<Long, Integer> physical = new TreeMap<>();

      for (var part : catalog.physicalUnits().get(input.variantId()).entrySet()) {

        int required = quantity((long) part.getValue() * input.quantity());

        physical.put(part.getKey(), required);

        totalQuantities.merge(part.getKey(), required, (a, b) -> quantity((long) a + b));
      }

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
      serialModes.put(physicalId, usesSerial(physicalId));
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

    Map<String, BigDecimal> result = new HashMap<>();

    if (promotion == null) {
      return result;
    }

    var rule = properties.getPromotionRules().get(promotion.getId());

    Set<Long> purchaseIds = promotionQuantities(details, LoaiApDungKhuyenMai.SAN_PHAM_MUA).keySet();

    List<SaleLine> eligible =
        lines.stream()
            .filter(line -> !line.gift())
            .filter(line -> eligible(line, promotion, rule, purchaseIds))
            .toList();

    if (eligible.isEmpty()) {
      throw conflict("Giỏ hàng không thuộc đối tượng của chương trình");
    }

    if (promotion.getPhuongThucKhuyenMai() == PhuongThucKhuyenMai.TANG_SAN_PHAM) {
      return result;
    }

    if (promotion.getPhuongThucKhuyenMai() != PhuongThucKhuyenMai.CHIET_KHAU
        || rule == null
        || rule.getUnit() == null) {
      throw conflict("Chưa cấu hình rõ kiểu giảm tiền/phần trăm cho chương trình");
    }

    BigDecimal value = promotion.getGiaTriKhuyenMai();

    if (value == null || value.signum() <= 0) {
      throw conflict("Giá trị khuyến mại không hợp lệ");
    }

    boolean percentage = rule.getUnit() == SalesProperties.DiscountUnit.PHAN_TRAM;

    if (percentage && value.compareTo(new BigDecimal("100")) > 0) {
      throw conflict("Phần trăm giảm phải trong khoảng trên 0 đến 100");
    }

    if (promotion.getDoiTuongKhuyenMai() == DoiTuongKhuyenMai.TONG_DON) {

      BigDecimal base =
          eligible.stream().map(SaleLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);

      BigDecimal discount =
          percentage
              ? base.multiply(value).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP)
              : money(value).min(base);

      BigDecimal remainingBase = base;
      BigDecimal remainingDiscount = discount;

      for (SaleLine line : eligible) {

        BigDecimal allocated =
            remainingBase.signum() == 0
                ? BigDecimal.ZERO
                : remainingDiscount
                    .multiply(line.amount())
                    .divide(remainingBase, 0, RoundingMode.DOWN);

        result.put(line.key(), allocated);

        remainingBase = remainingBase.subtract(line.amount());
        remainingDiscount = remainingDiscount.subtract(allocated);
      }

    } else {

      for (SaleLine line : eligible) {

        BigDecimal discount =
            percentage
                ? line.amount()
                    .multiply(value)
                    .divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP)
                : money(value).multiply(BigDecimal.valueOf(line.quantity()));

        result.put(line.key(), discount.min(line.amount()));
      }
    }

    return result;
  }

  private boolean eligible(
      SaleLine line,
      KhuyenMai promotion,
      SalesProperties.PromotionRule rule,
      Set<Long> purchaseIds) {

    DoiTuongKhuyenMai scope = promotion.getDoiTuongKhuyenMai();

    if (scope == DoiTuongKhuyenMai.TONG_DON) {
      return true;
    }

    if (scope == DoiTuongKhuyenMai.TUNG_SAN_PHAM) {
      if (purchaseIds.isEmpty()) {
        throw conflict("Chương trình chưa cấu hình SAN_PHAM_MUA");
      }
      return purchaseIds.contains(line.variant().getId());
    }

    if (rule == null || rule.getTargetIds() == null || rule.getTargetIds().isEmpty()) {
      throw conflict("Chưa cấu hình danh mục/thương hiệu áp dụng khuyến mại");
    }

    SanPham product = line.variant().getSanPham();

    if (scope == DoiTuongKhuyenMai.LOAI_SAN_PHAM) {
      return rule.getTargetIds().contains(product.getDanhMuc().getId());
    }

    if (scope == DoiTuongKhuyenMai.NHAN_HIEU) {
      return product.getThuongHieu() != null
          && rule.getTargetIds().contains(product.getThuongHieu().getId());
    }

    throw conflict("Đối tượng khuyến mại chưa được hỗ trợ");
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
