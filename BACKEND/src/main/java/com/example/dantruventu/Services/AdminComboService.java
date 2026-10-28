package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.product.ProductImageRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminComboCreateRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminComboUpdateRequest;
import com.example.dantruventu.DTO.Request.warehouse.ComboComponentRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.warehouse.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.CatalogException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.product.SanPhamMapper;
import com.example.dantruventu.Mapper.warehouse.ComboMapper;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.product.SanPhamRepository;
import com.example.dantruventu.Repository.warehouse.ComboRepository;
import com.example.dantruventu.Repository.warehouse.ThanhPhanComboRepository;
import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Specification.ComboSpecification;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminComboService {

  private static final BigDecimal MAX_MONEY = new BigDecimal("9999999999999.99");

  private final ComboRepository comboRepository;
  private final SanPhamRepository sanPhamRepository;
  private final PhienBanSanPhamRepository phienBanSanPhamRepository;
  private final ThanhPhanComboRepository thanhPhanComboRepository;
  private final TonKhoRepository tonKhoRepository;
  private final AnhSanPhamRepository anhSanPhamRepository;
  private final DanhMucRepository danhMucRepository;
  private final ThuongHieuRepository thuongHieuRepository;
  private final ComboMapper comboMapper;
  private final SanPhamMapper sanPhamMapper;
  private final CatalogSupport catalog;

  public AdminComboListResponse getCombos(String keyword, Short trangThai, int page, int limit) {

    validatePagination(page, limit);

    var result =
        comboRepository.findAll(
            ComboSpecification.build(
                keywordPattern(keyword), trangThai == null ? null : parseStatus(trangThai)),
            PageRequest.of(page, limit, Sort.by("id").descending()));

    var ids = result.getContent().stream().map(SanPham::getId).toList();

    if (ids.isEmpty()) {
      return AdminComboListResponse.builder()
          .items(List.of())
          .pagination(pagination(result))
          .build();
    }

    var variants = phienBanSanPhamRepository.findBySanPhamIdInOrderByIdAsc(ids);
    var components = catalog.components(ids);
    var stocks = catalog.stocks(catalog.ids(variants, components));
    var images = catalog.primaryImages(ids);

    var variantsByProduct =
        variants.stream().collect(Collectors.groupingBy(v -> v.getSanPham().getId()));

    var partsByProduct =
        components.stream().collect(Collectors.groupingBy(c -> c.getSanPhamCombo().getId()));

    var items =
        result.getContent().stream()
            .map(
                combo -> {
                  var saleVariants = variantsByProduct.getOrDefault(combo.getId(), List.of());
                  var saleVariant = singleSaleVariant(saleVariants);
                  var parts = partsByProduct.getOrDefault(combo.getId(), List.of());

                  var response = comboMapper.toListItem(combo);
                  response.setPhienBanId(saleVariant.getId());
                  response.setGiaBan(saleVariant.getGiaBanLe());
                  response.setAnhChinh(images.get(combo.getId()));
                  response.setTonCoTheBan(null);
                  response.setTonThucTe(null);
                  response.setThanhPhan(catalog.componentResponses(parts, stocks));
                  catalog.metadata(response, combo, saleVariants, parts, stocks);

                  return response;
                })
            .toList();

    return AdminComboListResponse.builder().items(items).pagination(pagination(result)).build();
  }

  public AdminComboDetailResponse getDetail(Long id) {
    SanPham combo = requireCombo(id, false);

    var variants = phienBanSanPhamRepository.findBySanPhamIdInOrderByIdAsc(List.of(id));
    var saleVariant = singleSaleVariant(variants);
    var components = catalog.components(List.of(id));
    var stocks = catalog.stocks(catalog.ids(variants, components));

    var response = comboMapper.toDetail(combo);
    response.setPhienBanId(saleVariant.getId());
    response.setTenPhienBan(saleVariant.getTenPhienBan());
    response.setMaVach(saleVariant.getMaVach());
    response.setTrangThaiPhienBan(saleVariant.getTrangThai().getValue());
    response.setGiaBanLe(saleVariant.getGiaBanLe());
    response.setGiaNhap(saleVariant.getGiaNhap());
    response.setKhoiLuong(saleVariant.getKhoiLuong());
    response.setTonCoTheBan(null);
    response.setTonThucTe(null);
    response.setCauHinhBiKhoa(comboRepository.countConfigurationReferences(id) > 0);
    response.setThanhPhan(catalog.componentResponses(components, stocks));

    response.setAnhSanPham(
        Optional.ofNullable(combo.getDanhSachAnhSanPham()).orElseGet(List::of).stream()
            .sorted(
                Comparator.comparing(
                        AnhSanPham::getThuTuHienThi, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(AnhSanPham::getId))
            .map(sanPhamMapper::toImageResponse)
            .toList());

    catalog.metadata(response, combo, variants, components, stocks);
    return response;
  }

  public AdminComboComponentOptionListResponse getComponentOptions(
      String keyword, int page, int limit) {

    validatePagination(page, limit);

    var result =
        comboRepository.findComponentOptions(
            keywordPattern(keyword),
            LoaiSanPham.DON,
            TrangThaiCoBanEnum.HOAT_DONG,
            PageRequest.of(page, limit));

    var ids =
        result.getContent().stream()
            .map(ComboRepository.ComponentOptionProjection::getPhienBanId)
            .toList();

    var variants =
        ids.isEmpty() ? List.<PhienBanSanPham>of() : phienBanSanPhamRepository.findAllById(ids);

    var byId = variants.stream().collect(Collectors.toMap(PhienBanSanPham::getId, v -> v));

    var stocks = catalog.stocks(ids);
    var images =
        catalog.primaryImages(
            variants.stream().map(v -> v.getSanPham().getId()).distinct().toList());

    var items =
        result.getContent().stream()
            .map(
                item -> {
                  var variant = byId.get(item.getPhienBanId());
                  var response = comboMapper.toComponentOption(item);

                  response.setTonCoTheBan(
                      stocks
                          .getOrDefault(item.getPhienBanId(), CatalogSupport.Stock.ZERO)
                          .available());
                  response.setCoQuanLySerial(variant.getCoQuanLySerial());
                  response.setThoiHanBaoHanhThang(variant.getSanPham().getThoiHanBaoHanhThang());
                  response.setAnhChinh(images.get(variant.getSanPham().getId()));
                  return response;
                })
            .toList();

    return AdminComboComponentOptionListResponse.builder()
        .items(items)
        .pagination(pagination(result))
        .build();
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminComboMutationResponse create(AdminComboCreateRequest request) {

    catalog.rejectComboWarranty(request);
    catalog.checkComponentWarranties(request.getThanhPhan());

    String code = request.getMaSanPham().trim();
    validateCode(code, null);

    var quantities = requestQuantities(request.getThanhPhan());
    var variants = loadActiveComponents(quantities.keySet());

    DanhMuc category =
        danhMucRepository
            .findById(request.getDanhMucId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy danh mục"));

    ThuongHieu brand = null;

    if (request.getThuongHieuId() != null) {
      brand =
          thuongHieuRepository
              .findById(request.getThuongHieuId())
              .orElseThrow(
                  () -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy thương hiệu"));
    }

    if (request.getThongSoKyThuat() != null && !request.getThongSoKyThuat().isObject()) {
      throw invalid("thong_so_ky_thuat phải là một JSON object");
    }

    validateImages(request.getAnhSanPham());

    var status = parseStatus(request.getTrangThai());

    SanPham combo = comboMapper.toEntity(request);
    combo.setDanhMuc(category);
    combo.setThuongHieu(brand);
    combo.setMaSanPham(code);
    combo.setTenSanPham(request.getTenSanPham().trim());
    combo.setLoaiSanPham(LoaiSanPham.BO_PC);
    combo.setTrangThai(status);
    combo.setThueVat(request.getThueVat() == null ? BigDecimal.ZERO : request.getThueVat());
    combo.setThoiHanBaoHanhThang(0);

    combo = sanPhamRepository.save(combo);

    BigDecimal cost =
        request.getGiaNhap() != null ? request.getGiaNhap() : calculateCost(quantities, variants);

    var saleVariant =
        PhienBanSanPham.builder()
            .coQuanLySerial(false)
            .khoiLuong(request.getKhoiLuong() == null ? BigDecimal.ZERO : request.getKhoiLuong())
            .sanPham(combo)
            .tenPhienBan(defaultVariantName(request.getTenPhienBan()))
            .maVach(validBarcode(request.getMaVach(), null))
            .giaBanLe(request.getGiaBanLe())
            .giaNhap(cost)
            .trangThai(
                request.getTrangThaiPhienBan() == null
                    ? status
                    : parseStatus(request.getTrangThaiPhienBan()))
            .build();

    saleVariant = phienBanSanPhamRepository.save(saleVariant);

    saveComponents(combo, quantities, variants);
    saveImages(combo, request.getAnhSanPham());

    // Đẩy các ràng buộc DB vào trong transaction hiện tại.
    sanPhamRepository.flush();

    return mutationResponse(combo, saleVariant, quantities);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminComboMutationResponse update(Long id, AdminComboUpdateRequest request) {

    catalog.rejectComboWarranty(request);
    catalog.checkComponentWarranties(request.getThanhPhan());

    SanPham combo = requireCombo(id, true);

    var saleVariant = singleSaleVariant(phienBanSanPhamRepository.findSaleVariantsForUpdate(id));

    var existing = thanhPhanComboRepository.findByComboIds(List.of(id));

    var currentQuantities = existingQuantities(existing);
    var requestedQuantities = requestQuantities(request.getThanhPhan());

    boolean configurationChanged = !currentQuantities.equals(requestedQuantities);

    if (configurationChanged && comboRepository.countConfigurationReferences(id) > 0) {
      throw CatalogException.conflict(
          "thanh_phan",
          "COMBO_CONFIGURATION_LOCKED",
          "Không được thay thành phần combo đang được sử dụng; hãy tạo cấu hình mới");
    }

    var status = parseStatus(request.getTrangThai());
    var variantStatus =
        request.getTrangThaiPhienBan() == null
            ? status
            : parseStatus(request.getTrangThaiPhienBan());

    boolean reactivating =
        (status == TrangThaiCoBanEnum.HOAT_DONG
                && combo.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG)
            || (variantStatus == TrangThaiCoBanEnum.HOAT_DONG
                && saleVariant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG);

    Map<Long, PhienBanSanPham> variants = Map.of();

    if (configurationChanged || reactivating) {
      variants = loadActiveComponents(requestedQuantities.keySet());
    }

    String code = request.getMaSanPham().trim();
    validateCode(code, id);

    if (request.getThongSoKyThuat() != null && !request.getThongSoKyThuat().isObject()) {
      throw invalid("thong_so_ky_thuat phải là một JSON object");
    }

    validateImages(request.getAnhSanPham());

    combo.setMaSanPham(code);
    combo.setTenSanPham(request.getTenSanPham().trim());
    combo.setTrangThai(status);
    if (request.getDanhMucId() != null) {
      combo.setDanhMuc(
          danhMucRepository
              .findById(request.getDanhMucId())
              .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy danh mục")));
    }

    if (request.isThuongHieuProvided()) {
      combo.setThuongHieu(
          request.getThuongHieuId() == null
              ? null
              : thuongHieuRepository
                  .findById(request.getThuongHieuId())
                  .orElseThrow(
                      () -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy thương hiệu")));
    }

    if (request.getMoTa() != null) {
      combo.setMoTa(request.getMoTa());
    }

    if (request.getThongSoKyThuat() != null) {
      combo.setThongSoKyThuat(request.getThongSoKyThuat().toString());
    }

    if (request.getThueVat() != null) {
      combo.setThueVat(request.getThueVat());
    }

    combo.setThoiHanBaoHanhThang(0);

    saleVariant.setGiaBanLe(request.getGiaBanLe());
    if (request.getTenPhienBan() != null) {
      saleVariant.setTenPhienBan(defaultVariantName(request.getTenPhienBan()));
    }

    if (request.getMaVach() != null) {
      saleVariant.setMaVach(validBarcode(request.getMaVach(), saleVariant.getId()));
    }

    if (request.getKhoiLuong() != null) {
      saleVariant.setKhoiLuong(request.getKhoiLuong());
    }
    saleVariant.setTrangThai(variantStatus);

    if (request.getGiaNhap() != null) {
      saleVariant.setGiaNhap(request.getGiaNhap());
    } else if (configurationChanged) {
      saleVariant.setGiaNhap(calculateCost(requestedQuantities, variants));
    }

    if (configurationChanged) {
      thanhPhanComboRepository.deleteComponents(id);
      saveComponents(combo, requestedQuantities, variants);
    }

    if (request.getAnhSanPham() != null) {
      anhSanPhamRepository.deleteBySanPhamId(id);
      saveImages(combo, request.getAnhSanPham());
    }

    // Nếu thành phần không đổi thì không xóa/tạo lại các dòng cấu hình.
    sanPhamRepository.flush();

    return mutationResponse(combo, saleVariant, requestedQuantities);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminComboStatusResponse softDelete(Long id) {
    SanPham combo = requireCombo(id, true);

    var saleVariant = singleSaleVariant(phienBanSanPhamRepository.findSaleVariantsForUpdate(id));

    combo.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);
    saleVariant.setTrangThai(TrangThaiCoBanEnum.NGUNG_HOAT_DONG);

    sanPhamRepository.flush();

    return comboMapper.toStatus(combo);
  }

  /*
   * Dùng từ luồng tạo/sửa đơn hàng trong cùng transaction.
   * Với nhiều combo, bên gọi phải khóa theo comboId tăng dần.
   * Sau khi hàm trả về, lưu chi tiết đơn bằng ID của phiên bản này.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public PhienBanSanPham lockComboForOrder(Long comboId) {
    SanPham combo = requireCombo(comboId, true);

    var saleVariant =
        singleSaleVariant(phienBanSanPhamRepository.findSaleVariantsForUpdate(comboId));

    if (combo.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || saleVariant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw unprocessable("Combo đang ngừng kinh doanh");
    }

    var quantities = existingQuantities(thanhPhanComboRepository.findByComboIds(List.of(comboId)));

    if (quantities.isEmpty()) {
      throw unprocessable("Combo chưa có thành phần");
    }

    loadActiveComponents(quantities.keySet());

    return saleVariant;
  }

  private SanPham requireCombo(Long id, boolean lock) {
    if (id == null || id <= 0) {
      throw invalid("ID combo phải lớn hơn 0");
    }

    var found = lock ? sanPhamRepository.findByIdForUpdate(id) : sanPhamRepository.findById(id);

    SanPham combo =
        found.orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy combo"));

    if (combo.getLoaiSanPham() != LoaiSanPham.BO_PC) {
      throw new AppException(ErrorCode.NOT_FOUND, "Sản phẩm này không phải combo");
    }

    return combo;
  }

  private PhienBanSanPham singleSaleVariant(List<PhienBanSanPham> variants) {

    if (variants.size() != 1) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "Combo phải có đúng một phiên bản bán. " + "Dữ liệu hiện tại cần được kiểm tra.");
    }

    return variants.get(0);
  }

  private Map<Long, Integer> requestQuantities(List<ComboComponentRequest> components) {

    if (components == null || components.isEmpty()) {
      throw invalid("Combo phải có ít nhất một thành phần");
    }

    Map<Long, Integer> result = new TreeMap<>();

    for (var component : components) {
      if (component == null
          || component.getPhienBanThanhPhanId() == null
          || component.getPhienBanThanhPhanId() <= 0
          || component.getSoLuong() == null
          || component.getSoLuong() <= 0) {
        throw invalid("Thành phần phải có ID và số lượng nguyên dương");
      }

      try {
        result.merge(component.getPhienBanThanhPhanId(), component.getSoLuong(), Math::addExact);
      } catch (ArithmeticException exception) {
        throw invalid("Tổng số lượng linh kiện vượt giới hạn");
      }
    }

    return result;
  }

  private Map<Long, Integer> existingQuantities(List<ThanhPhanCombo> components) {

    Map<Long, Integer> result = new TreeMap<>();

    for (var component : components) {
      if (component.getSoLuong() == null || component.getSoLuong() <= 0) {
        throw new AppException(
            ErrorCode.CONFLICT, "Cấu hình combo hiện tại có số lượng không hợp lệ");
      }

      try {
        result.merge(
            component.getPhienBanThanhPhan().getId(), component.getSoLuong(), Math::addExact);
      } catch (ArithmeticException exception) {
        throw new AppException(ErrorCode.CONFLICT, "Số lượng cấu hình combo vượt giới hạn");
      }
    }

    return result;
  }

  private Map<Long, PhienBanSanPham> loadActiveComponents(Collection<Long> ids) {

    if (ids.isEmpty()) {
      throw invalid("Combo phải có thành phần");
    }

    var result =
        phienBanSanPhamRepository.findComponentsForShare(ids).stream()
            .collect(Collectors.toMap(PhienBanSanPham::getId, variant -> variant));

    for (Long id : ids) {
      PhienBanSanPham variant = result.get(id);

      if (variant == null) {
        throw unprocessable("Phiên bản thành phần không tồn tại: " + id);
      }

      SanPham product = variant.getSanPham();

      if (product.getLoaiSanPham() != LoaiSanPham.DON) {
        throw unprocessable("Không cho phép combo lồng combo");
      }

      if (product.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
          || variant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
        throw unprocessable(
            "Sản phẩm thành phần '"
                + product.getTenSanPham()
                + " / "
                + variant.getTenPhienBan()
                + "' hiện đang ngừng kinh doanh");
      }
    }

    return result;
  }

  private BigDecimal calculateCost(
      Map<Long, Integer> quantities, Map<Long, PhienBanSanPham> variants) {

    BigDecimal total = BigDecimal.ZERO;

    for (var entry : quantities.entrySet()) {
      BigDecimal price = variants.get(entry.getKey()).getGiaNhap();

      if (price == null || price.signum() < 0) {
        throw unprocessable("Giá nhập của thành phần không hợp lệ");
      }

      total = total.add(price.multiply(BigDecimal.valueOf(entry.getValue())));
    }

    if (total.compareTo(MAX_MONEY) > 0) {
      throw invalid("Tổng giá nhập combo vượt giới hạn DECIMAL(15,2)");
    }

    return total;
  }

  private void saveComponents(
      SanPham combo, Map<Long, Integer> quantities, Map<Long, PhienBanSanPham> variants) {

    var rows =
        quantities.entrySet().stream()
            .map(
                entry ->
                    ThanhPhanCombo.builder()
                        .sanPhamCombo(combo)
                        .phienBanThanhPhan(variants.get(entry.getKey()))
                        .soLuong(entry.getValue())
                        .build())
            .toList();

    thanhPhanComboRepository.saveAll(rows);
  }

  private void validateCode(String code, Long currentId) {
    boolean exists =
        currentId == null
            ? sanPhamRepository.existsByMaSanPhamIgnoreCase(code)
            : sanPhamRepository.existsByMaSanPhamIgnoreCaseAndIdNot(code, currentId);

    if (exists) {
      throw new AppException(
          ErrorCode.CONFLICT, "Mã combo/sản phẩm đã tồn tại. Vui lòng sử dụng mã khác.");
    }
  }

  private String defaultVariantName(String value) {
    return value == null || value.isBlank() ? "Mặc định" : value.trim();
  }

  private String validBarcode(String value, Long currentId) {
    if (value == null || value.isBlank()) {
      return null;
    }

    String barcode = value.trim();
    boolean exists =
        currentId == null
            ? phienBanSanPhamRepository.existsByMaVach(barcode)
            : phienBanSanPhamRepository.existsByMaVachAndIdNot(barcode, currentId);

    if (exists) {
      throw new AppException(ErrorCode.CONFLICT, "Mã vạch/SKU đã tồn tại");
    }

    return barcode;
  }

  private void validateImages(List<ProductImageRequest> images) {
    catalog.validateImages(images);
  }

  private void saveImages(SanPham combo, List<ProductImageRequest> requests) {

    if (requests == null || requests.isEmpty()) {
      return;
    }

    boolean hasMain =
        requests.stream().anyMatch(image -> Boolean.TRUE.equals(image.getLaAnhChinh()));

    List<AnhSanPham> images = new ArrayList<>();

    for (int index = 0; index < requests.size(); index++) {
      var request = requests.get(index);
      var image = sanPhamMapper.toImageEntity(request);

      image.setSanPham(combo);
      image.setDuongDanAnh(request.getDuongDanAnh().trim());
      image.setLaAnhChinh(Boolean.TRUE.equals(request.getLaAnhChinh()) || (!hasMain && index == 0));
      image.setThuTuHienThi(request.getThuTuHienThi() == null ? index : request.getThuTuHienThi());

      images.add(image);
    }

    anhSanPhamRepository.saveAll(images);
  }

  private Map<Long, Long> componentStockMap(List<ThanhPhanCombo> components) {

    var ids =
        components.stream()
            .map(component -> component.getPhienBanThanhPhan().getId())
            .distinct()
            .toList();

    if (ids.isEmpty()) {
      return Map.of();
    }

    return tonKhoRepository.tongTonCoTheBanTheoPhienBan(ids).stream()
        .collect(
            Collectors.toMap(
                TonKhoRepository.TonPhienBanProjection::getPhienBanId,
                TonKhoRepository.TonPhienBanProjection::getTonCoTheBan));
  }

  private Map<Long, Long> comboStockMap(List<Long> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }

    return comboRepository.sumComboStocks(ids, null).stream()
        .collect(
            Collectors.toMap(
                ComboRepository.ComboStockProjection::getComboId,
                ComboRepository.ComboStockProjection::getTonCoTheBan));
  }

  private BigDecimal componentTotal(List<ThanhPhanCombo> components, boolean purchasePrice) {
    BigDecimal total = BigDecimal.ZERO;

    for (var component : components) {
      var variant = component.getPhienBanThanhPhan();
      var price = purchasePrice ? variant.getGiaNhap() : variant.getGiaBanLe();
      var quantity = component.getSoLuong();

      if (price == null || price.signum() < 0 || quantity == null || quantity <= 0) {
        throw new AppException(ErrorCode.CONFLICT, "Cấu hình giá thành phần combo không hợp lệ");
      }

      total = total.add(price.multiply(BigDecimal.valueOf(quantity)));
    }

    if (total.compareTo(MAX_MONEY) > 0) {
      throw new AppException(ErrorCode.CONFLICT, "Tổng giá thành phần combo vượt giới hạn");
    }

    return total;
  }

  private List<ComboComponentResponse> componentResponses(
      List<ThanhPhanCombo> components, Map<Long, Long> stockMap) {

    // Gom dữ liệu cũ bị lặp phiên bản thành một dòng hiển thị.
    Map<Long, ComboComponentResponse> result = new LinkedHashMap<>();

    for (var component : components) {
      Long variantId = component.getPhienBanThanhPhan().getId();

      var response = result.get(variantId);

      if (response == null) {
        response = comboMapper.toComponent(component);
        response.setTonCoTheBan(stockMap.getOrDefault(variantId, 0L));
        result.put(variantId, response);
      } else {
        try {
          response.setSoLuong(Math.addExact(response.getSoLuong(), component.getSoLuong()));
        } catch (ArithmeticException exception) {
          throw new AppException(ErrorCode.CONFLICT, "Số lượng thành phần vượt giới hạn");
        }
      }
    }

    return new ArrayList<>(result.values());
  }

  private AdminComboMutationResponse mutationResponse(
      SanPham combo, PhienBanSanPham variant, Map<Long, Integer> quantities) {

    var components = catalog.components(List.of(combo.getId()));
    var componentVariants =
        components.stream()
            .collect(
                Collectors.toMap(
                    c -> c.getPhienBanThanhPhan().getId(),
                    ThanhPhanCombo::getPhienBanThanhPhan,
                    (first, second) -> first));

    var response = comboMapper.toMutation(combo);
    response.setPhienBanId(variant.getId());
    response.setGiaBanLe(variant.getGiaBanLe());
    response.setGiaNhap(variant.getGiaNhap());
    response.setKhoiLuong(variant.getKhoiLuong());
    response.setTonThucTe(null);
    response.setTonCoTheBan(null);

    response.setThanhPhan(
        quantities.entrySet().stream()
            .map(
                entry ->
                    AdminComboMutationResponse.ThanhPhanData.builder()
                        .phienBanThanhPhanId(entry.getKey())
                        .soLuong(entry.getValue())
                        .thoiHanBaoHanhThang(
                            componentVariants
                                .get(entry.getKey())
                                .getSanPham()
                                .getThoiHanBaoHanhThang())
                        .build())
            .toList());

    catalog.metadata(
        response,
        combo,
        List.of(variant),
        components,
        catalog.stocks(catalog.ids(List.of(variant), components)));

    return response;
  }

  private TrangThaiCoBanEnum parseStatus(Short value) {
    if (value == null || (value != 0 && value != 1)) {
      throw invalid("Trạng thái chỉ nhận 0 hoặc 1");
    }

    return TrangThaiCoBanEnum.fromValue(value);
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalid("Phân trang không hợp lệ: page từ 0, limit 1–100");
    }
  }

  private String keywordPattern(String keyword) {
    String value = keyword == null ? "" : keyword.trim();

    if (value.length() > 200) {
      throw invalid("Từ khóa tối đa 200 ký tự");
    }

    return "%"
        + value.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_")
        + "%";
  }

  private PaginationResponse pagination(Page<?> page) {
    return PaginationResponse.builder()
        .page(page.getNumber())
        .limit(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .build();
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException unprocessable(String message) {
    return new AppException(ErrorCode.UNPROCESSABLE_ENTITY, message);
  }
}
