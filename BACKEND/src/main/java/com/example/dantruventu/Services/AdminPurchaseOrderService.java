package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.warehouse.*;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashVoucherResponse;
import com.example.dantruventu.DTO.Response.warehouse.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.cashbook.AdminPurchaseOrderMapper;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.partner.NhaCungCapRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.*;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.documents.DocumentNumberService;
import com.example.dantruventu.Services.order.OrderEvents;
import com.example.dantruventu.Services.warehouse.NccAccountingService;
import com.example.dantruventu.Services.warehouse.RecallSafety;
import com.example.dantruventu.Services.warehouse.SourceTraceService;
import com.example.dantruventu.Services.warehouse.WarehouseSupport;
import com.example.dantruventu.Specification.PurchaseOrderSpecification;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminPurchaseOrderService {

  private static final BigDecimal VAT_RATE = new BigDecimal("0.10");

  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

  private final DonNhapHangRepository donNhapHangRepository;
  private final ChiTietDonNhapRepository chiTietDonNhapRepository;
  private final NhaCungCapRepository nhaCungCapRepository;
  private final PhienBanSanPhamRepository phienBanSanPhamRepository;
  private final KhoHangRepository khoHangRepository;
  private final TonKhoRepository tonKhoRepository;
  private final TheKhoRepository theKhoRepository;
  private final SoSerialSanPhamRepository soSerialSanPhamRepository;
  private final SoQuyThuChiRepository soQuyThuChiRepository;
  private final NguoiDungRepository nguoiDungRepository;

  private final AdminPurchaseOrderMapper mapper;
  private final CashbookService cashbookService;
  private final OrderEvents orderEvents;
  private final WarehouseSupport warehouseSupport;
  private final NccAccountingService nccAccounting;

  private final SourceTraceService sourceTraceService;
  private final RecallSafety recallSafety;

  private final DocumentNumberService documentNumbers;

  private final EntityManager entityManager;

  @Value("${ruventu.inventory.default-warehouse-id:1}")
  private Long defaultWarehouseId;

  // =========================================================
  // LIST
  // =========================================================

  public AdminPurchaseOrderListResponse getList(
      String keyword,
      Long nhaCungCapId,
      String trangThaiNhap,
      String trangThaiThanhToan,
      int page,
      int limit) {

    if (page < 0 || limit < 1 || limit > 100) {

      throw new AppException(ErrorCode.INVALID_DATA, "Thông tin phân trang không hợp lệ");
    }

    TrangThaiNhapHang importStatus = parseImportStatus(trangThaiNhap);

    TrangThaiThanhToanNhap paymentStatus = parsePaymentStatus(trangThaiThanhToan);

    Specification<DonNhapHang> specification =
        PurchaseOrderSpecification.build(keyword, nhaCungCapId, importStatus, paymentStatus);

    Pageable pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "ngayTao"));

    Page<DonNhapHang> result = donNhapHangRepository.findAll(specification, pageable);

    List<AdminPurchaseOrderListResponse.Item> items =
        result.getContent().stream().map(mapper::toListItem).toList();

    PaginationResponse pagination =
        PaginationResponse.builder()
            .page(result.getNumber())
            .limit(result.getSize())
            .totalElements(result.getTotalElements())
            .totalPages(result.getTotalPages())
            .build();

    return AdminPurchaseOrderListResponse.builder().items(items).pagination(pagination).build();
  }

  // =========================================================
  // DETAIL
  // =========================================================

  public AdminPurchaseOrderDetailResponse getDetail(Long id) {

    DonNhapHang order = requireOrder(id);

    KhoHang warehouse = requireDefaultWarehouse(defaultWarehouseId);

    List<ChiTietDonNhap> details = chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(id);

    BigDecimal goodsAmount = calculateGoodsAmount(details);

    BigDecimal taxAmount = order.getTongTien().subtract(goodsAmount);

    PurchaseRefundBalance balance = readPurchaseRefundBalance(order);

    BigDecimal paid = balance.paid();
    BigDecimal refundReceived = balance.refundReceived();
    BigDecimal returnedValue = balance.returnedValue();
    BigDecimal adjustedTotal = balance.adjustedTotal();
    BigDecimal netPaid = paid.subtract(refundReceived);
    BigDecimal debt = balance.debt();

    List<AdminPurchaseOrderDetailResponse.Item> responseItems =
        details.stream()
            .map(
                detail -> {
                  Long variantId = detail.getPhienBan().getId();

                  int imported =
                      Math.max(0, sumMovement(order.getId(), variantId, LoaiGiaoDichKho.NHAP_HANG));

                  int legacyReturned =
                      Math.abs(sumMovement(order.getId(), variantId, LoaiGiaoDichKho.TRA_NCC));

                  int returned =
                      legacyReturned + nccAccounting.finalReturned(order.getId(), variantId);

                  int legacyReturnLimit =
                      Math.max(
                          0,
                          imported
                              - legacyReturned
                              - nccAccounting.legacyAssigned(order.getId(), variantId));

                  SerialMode mode = resolveSerialMode(variantId);

                  return AdminPurchaseOrderDetailResponse.Item.builder()
                      .id(detail.getId())
                      .phienBanId(variantId)
                      .tenPhienBan(detail.getPhienBan().getTenPhienBan())
                      .soLuong(detail.getSoLuong())
                      .giaNhap(detail.getGiaNhap())
                      .thanhTien(detail.getThanhTien())
                      .soLuongDaNhapKho(imported)
                      .soLuongDaTra(returned)
                      .soLuongTraTheoLuongCuToiDa(legacyReturnLimit)
                      .quanLySerial(mode.value())
                      .cheDoSerialDaXacLap(mode.established())
                      .build();
                })
            .toList();

    return AdminPurchaseOrderDetailResponse.builder()
        .id(order.getId())
        .maDonNhap(order.getMaDonNhap())
        .nhaCungCap(
            AdminPurchaseOrderDetailResponse.Supplier.builder()
                .id(order.getNhaCungCap().getId())
                .maNhaCungCap(order.getNhaCungCap().getMaNhaCungCap())
                .tenNhaCungCap(order.getNhaCungCap().getTenNhaCungCap())
                .soDienThoai(order.getNhaCungCap().getSoDienThoai())
                .email(order.getNhaCungCap().getEmail())
                .diaChi(order.getNhaCungCap().getDiaChi())
                .build())
        .khoHang(
            AdminPurchaseOrderDetailResponse.Warehouse.builder()
                .id(warehouse.getId())
                .maKho(warehouse.getMaKho())
                .tenKho(warehouse.getTenKho())
                .build())
        .apDungThue(order.getApDungThue())
        .thueVat(
            Boolean.TRUE.equals(order.getApDungThue()) ? new BigDecimal("10") : BigDecimal.ZERO)
        .tienHang(goodsAmount)
        .tienThue(taxAmount)
        .tongTien(order.getTongTien())
        .trangThaiNhap(order.getTrangThaiNhap())
        .trangThaiThanhToan(order.getTrangThaiThanhToan())
        .soTienDaThanhToan(paid)
        .soTienConNo(debt)
        .giaTriHangTra(returnedValue)
        .giaTriDieuChinhNcc(nccAccounting.adjustments(order.getId()))
        .giaTriSauTra(adjustedTotal)
        .soTienDaNhanHoan(refundReceived)
        .soTienDaThanhToanThuan(netPaid)
        .soTienNccConPhaiHoan(netPaid.subtract(adjustedTotal).max(BigDecimal.ZERO))
        .ngayTao(order.getNgayTao())
        .items(responseItems)
        .serialDaNhan(readReceivedSerialsForPurchase(order.getId()))
        .build();
  }

  private List<AdminPurchaseOrderDetailResponse.ReceivedSerial> readReceivedSerialsForPurchase(
      Long purchaseId) {

    return entityManager
        .createQuery(
            """
                        SELECT s
                        FROM SoSerialSanPham s
                        JOIN FETCH s.phienBan v
                        WHERE s.donNhapHang.id = :purchaseId
                        ORDER BY v.id, s.id
                        """,
            SoSerialSanPham.class)
        .setParameter("purchaseId", purchaseId)
        .getResultList()
        .stream()
        .map(
            serial ->
                AdminPurchaseOrderDetailResponse.ReceivedSerial.builder()
                    .id(serial.getId())
                    .phienBanId(serial.getPhienBan().getId())
                    .tenPhienBan(serial.getPhienBan().getTenPhienBan())
                    .soSerial(serial.getSoSerial())
                    .trangThai(serial.getTrangThai() == null ? null : serial.getTrangThai().name())
                    .biThuHoi(Boolean.TRUE.equals(serial.getBiThuHoi()))
                    .dangDongGoi(serial.getChiTietDongGoi() != null)
                    .build())
        .toList();
  }

  // =========================================================
  // CREATE
  // =========================================================

  @Transactional
  public AdminPurchaseOrderDetailResponse create(AdminPurchaseOrderSaveRequest request) {

    KhoHang warehouse = requireDefaultWarehouse(request.getKhoHangId());

    NhaCungCap supplier = requireActiveSupplier(request.getNhaCungCapId());

    validateItems(request.getItems());

    Map<Long, PhienBanSanPham> variants = loadVariants(request.getItems());

    BigDecimal goodsAmount = calculateRequestGoodsAmount(request.getItems());

    BigDecimal total = applyTax(goodsAmount, request.getApDungThue());

    DonNhapHang order =
        DonNhapHang.builder()
            .maDonNhap(documentNumbers.next("DN"))
            .nhaCungCap(supplier)
            .nguoiTao(currentUser())
            .tongTien(total)
            .trangThaiThanhToan(TrangThaiThanhToanNhap.CHUA_TRA)
            .trangThaiNhap(TrangThaiNhapHang.DAT_HANG)
            .apDungThue(request.getApDungThue())
            .build();

    order = donNhapHangRepository.saveAndFlush(order);

    saveDetails(order, request.getItems(), variants);

    orderEvents.createdPurchase(order);
    return getDetail(order.getId());
  }

  // =========================================================
  // UPDATE
  // =========================================================

  @Transactional
  public AdminPurchaseOrderStatusResponse update(Long id, AdminPurchaseOrderSaveRequest request) {

    DonNhapHang order = requireOrderForUpdate(id);

    if (order.getTrangThaiNhap() != TrangThaiNhapHang.DAT_HANG) {

      throw new AppException(
          ErrorCode.CONFLICT,
          "Đơn hàng đã được duyệt, " + "không thể thay đổi chi tiết " + "sản phẩm và giá");
    }

    requireDefaultWarehouse(request.getKhoHangId());

    NhaCungCap supplier = requireActiveSupplier(request.getNhaCungCapId());

    validateItems(request.getItems());

    Map<Long, PhienBanSanPham> variants = loadVariants(request.getItems());

    BigDecimal goods = calculateRequestGoodsAmount(request.getItems());

    BigDecimal total = applyTax(goods, request.getApDungThue());

    order.setNhaCungCap(supplier);
    order.setApDungThue(request.getApDungThue());
    order.setTongTien(total);

    chiTietDonNhapRepository.deleteByDonNhapHangId(id);

    saveDetails(order, request.getItems(), variants);

    order = donNhapHangRepository.save(order);

    return mapper.toStatusResponse(order);
  }

  // =========================================================
  // APPROVE
  // =========================================================

  @Transactional
  public AdminPurchaseOrderStatusResponse approve(Long id) {

    DonNhapHang order = requireOrderForUpdate(id);

    if (order.getTrangThaiNhap() != TrangThaiNhapHang.DAT_HANG) {

      throw new AppException(
          ErrorCode.CONFLICT, "Đơn nhập đã được xử lý, " + "không thể duyệt lại");
    }

    order.setTrangThaiNhap(TrangThaiNhapHang.DA_DUYET);

    order = donNhapHangRepository.save(order);

    return mapper.toStatusResponse(order);
  }

  // =========================================================
  // PAYMENT
  // =========================================================

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminPurchaseOrderPaymentResponse pay(
      Long id, String idempotencyKey, AdminPurchaseOrderPaymentRequest request) {

    if (!Boolean.TRUE.equals(request.getXacNhanDaChiTien())) {
      throw new AppException(ErrorCode.INVALID_DATA, "Phải xác nhận cửa hàng đã chi tiền");
    }

    validateIdempotencyKey(idempotencyKey);

    DonNhapHang order = requireOrderForUpdate(id);

    if (order.getTrangThaiNhap() == TrangThaiNhapHang.DAT_HANG
        || order.getTrangThaiNhap() == TrangThaiNhapHang.HUY) {

      throw new AppException(ErrorCode.CONFLICT, "Đơn nhập chưa được duyệt " + "hoặc đã bị hủy");
    }

    String voucherCode = "CHI-NCC-" + idempotencyKey;

    Optional<SoQuyThuChi> existing = soQuyThuChiRepository.findByBusinessKey(voucherCode);

    if (existing.isPresent()) {

      SoQuyThuChi old = existing.get();

      if (old.getSoTien().compareTo(request.getSoTienThanhToan()) != 0
          || !old.getPhuongThucThanhToan().equalsIgnoreCase(request.getPhuongThucThanhToan())
          || !Objects.equals(old.getMaChungTuThamChieu(), order.getMaDonNhap())) {

        throw new AppException(
            ErrorCode.CONFLICT, "Idempotency-Key đã được sử dụng " + "cho một giao dịch khác");
      }

      return buildPaymentResponse(order, old);
    }

    BigDecimal debt = calculateDebt(order);

    if (debt.compareTo(BigDecimal.ZERO) <= 0) {

      throw new AppException(ErrorCode.CONFLICT, "Đơn nhập đã thanh toán đủ");
    }

    if (request.getSoTienThanhToan().compareTo(debt) > 0) {

      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "Số tiền thanh toán không được " + "vượt quá dư nợ thực tế");
    }

    SoQuyThuChi voucher =
        cashbookService.createAutomatic(
            CashbookService.AutomaticVoucher.builder()
                .khoaNghiepVu(voucherCode)
                .loaiPhieu(LoaiPhieuThuChi.CHI)
                .maLoaiThuChi("CHI_NHAP_HANG")
                .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.NHA_CUNG_CAP)
                .nhaCungCap(order.getNhaCungCap())
                .maChungTuThamChieu(order.getMaDonNhap())
                .donNhapHang(order)
                .soTien(request.getSoTienThanhToan())
                .phuongThucThanhToan(request.getPhuongThucThanhToan())
                .ngayGhiNhan(request.getNgayThanhToan())
                .moTa(request.getGhiChu())
                .nguoiTao(currentUser())
                .build());

    updatePaymentStatus(order);

    donNhapHangRepository.save(order);

    return buildPaymentResponse(order, voucher);
  }

  // =========================================================
  // RECEIVE
  // =========================================================

  @Transactional
  public AdminPurchaseOrderReceiveResponse receive(
      Long id, AdminPurchaseOrderReceiveRequest request) {

    DonNhapHang order = requireOrderForUpdate(id);

    var allowed =
        EnumSet.of(
            TrangThaiNhapHang.DA_DUYET,
            TrangThaiNhapHang.NHAP_MOT_PHAN,
            TrangThaiNhapHang.HOAN_TRA_MOT_PHAN,
            TrangThaiNhapHang.HOAN_TRA_TOAN_BO);

    if (!allowed.contains(order.getTrangThaiNhap())) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn nhập không ở trạng thái cho phép nhập kho");
    }

    KhoHang warehouse = requireDefaultWarehouse(request.getKhoHangId());

    List<ChiTietDonNhap> details = chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(id);

    Map<Long, ChiTietDonNhap> detailMap =
        details.stream().collect(Collectors.toMap(ChiTietDonNhap::getId, Function.identity()));

    validateReceiveRequest(request, detailMap);

    Map<Long, PhienBanSanPham> lockedVariants = new TreeMap<>();

    for (Long variantId :
        details.stream().map(detail -> detail.getPhienBan().getId()).distinct().sorted().toList()) {

      lockedVariants.put(variantId, warehouseSupport.lockVariant(variantId));
    }

    for (var item : request.getItems()) {
      var detail = detailMap.get(item.getChiTietDonNhapId());
      var variant = lockedVariants.get(detail.getPhienBan().getId());

      if (variant.getSanPham().getLoaiSanPham() != LoaiSanPham.DON) {
        throw new AppException(ErrorCode.CONFLICT, "Chỉ nhập kho phiên bản sản phẩm đơn");
      }

      Boolean configured = variant.getCoQuanLySerial();

      if (configured == null) {
        throw new AppException(
            ErrorCode.CONFLICT, "Phiên bản chưa có cấu hình quản lý serial: " + variant.getId());
      }

      if (!Objects.equals(configured, item.getQuanLySerial())) {
        throw new AppException(
            ErrorCode.CONFLICT, "Chế độ serial không khớp cấu hình phiên bản " + variant.getId());
      }
    }

    Set<String> allSerials = collectAndValidateSerials(request, detailMap);

    if (!allSerials.isEmpty() && soSerialSanPhamRepository.existsBySoSerialIn(allSerials)) {

      throw new AppException(ErrorCode.CONFLICT, "Có serial đã tồn tại trong hệ thống");
    }

    List<AdminPurchaseOrderReceiveResponse.Item> responseItems = new ArrayList<>();

    var sortedItems =
        request.getItems().stream()
            .sorted(
                Comparator.comparing(
                    item -> detailMap.get(item.getChiTietDonNhapId()).getPhienBan().getId()))
            .toList();

    for (var item : sortedItems) {
      var detail = detailMap.get(item.getChiTietDonNhapId());
      var variant = lockedVariants.get(detail.getPhienBan().getId());

      int previouslyReceived = grossReceived(detail);
      int quantity = item.getSoLuongNhapKho();
      int cumulativeReceived = previouslyReceived + quantity;

      TonKho inventory = lockOrCreateInventory(warehouse, variant);

      WarehouseSupport.numbers(inventory);

      try {
        inventory.setTonThucTe(Math.addExact(inventory.getTonThucTe(), quantity));

        inventory.setTonCoTheBan(Math.addExact(inventory.getTonCoTheBan(), quantity));

      } catch (ArithmeticException exception) {
        throw new AppException(ErrorCode.CONFLICT, "Số lượng tồn kho vượt giới hạn cho phép");
      }

      tonKhoRepository.save(inventory);

      theKhoRepository.save(
          TheKho.builder()
              .khoHang(warehouse)
              .phienBan(variant)
              .loaiGiaoDich(LoaiGiaoDichKho.NHAP_HANG)
              .maChungTuGoc(order.getId())
              .soLuongThayDoi(quantity)
              .tonCuoi(inventory.getTonThucTe())
              .ghiChu("Nhập hàng từ đơn " + order.getMaDonNhap())
              .build());

      List<AdminPurchaseOrderReceiveResponse.SerialData> serialResponses = new ArrayList<>();

      if (Boolean.TRUE.equals(variant.getCoQuanLySerial())) {
        var serialEntities =
            item.getSoSerials().stream()
                .map(String::trim)
                .map(
                    code ->
                        SoSerialSanPham.builder()
                            .phienBan(variant)
                            .donNhapHang(order)
                            .soSerial(code)
                            .trangThai(TrangThaiSerial.TRONG_KHO)
                            .donHang(null)
                            .ngayKichHoat(null)
                            .hanBaoHanh(null)
                            .build())
                .toList();

        serialResponses =
            soSerialSanPhamRepository.saveAll(serialEntities).stream()
                .map(
                    serial ->
                        AdminPurchaseOrderReceiveResponse.SerialData.builder()
                            .id(serial.getId())
                            .soSerial(serial.getSoSerial())
                            .trangThai(serial.getTrangThai())
                            .build())
                .toList();
      }

      responseItems.add(
          AdminPurchaseOrderReceiveResponse.Item.builder()
              .chiTietDonNhapId(detail.getId())
              .phienBanId(variant.getId())
              .soLuongNhapKho(quantity)
              .soLuongDat(detail.getSoLuong())
              .soLuongDaNhapKho(cumulativeReceived)
              .conTheoDon(detail.getSoLuong() - cumulativeReceived)
              .chenhLech(cumulativeReceived - detail.getSoLuong())
              .quanLySerial(variant.getCoQuanLySerial())
              .cheDoSerialDaXacLap(true)
              .tonThucTeSauNhap(inventory.getTonThucTe())
              .serials(serialResponses)
              .build());
    }

    theKhoRepository.flush();
    entityManager.flush();

    sourceTraceService.recordPurchaseReceipt(order.getId(), request, responseItems);

    refreshImportStatus(order, details);
    donNhapHangRepository.save(order);

    return AdminPurchaseOrderReceiveResponse.builder()
        .donNhapHangId(order.getId())
        .trangThaiNhap(order.getTrangThaiNhap())
        .items(responseItems)
        .build();
  }

  // =========================================================
  // RETURN TO SUPPLIER
  // =========================================================

  private AdminPurchaseOrderReturnResponse doReturnToSupplier(
      Long id, AdminPurchaseOrderReturnRequest request, NguoiDung actor, String refundVoucherCode) {

    DonNhapHang order = requireOrderForUpdate(id);

    if (!EnumSet.of(
            TrangThaiNhapHang.NHAP_MOT_PHAN,
            TrangThaiNhapHang.DA_NHAP_KHO,
            TrangThaiNhapHang.HOAN_TRA_MOT_PHAN)
        .contains(order.getTrangThaiNhap())) {

      throw new AppException(ErrorCode.CONFLICT, "Đơn nhập không ở trạng thái cho phép hoàn trả");
    }

    KhoHang warehouse = requireDefaultWarehouse(defaultWarehouseId);

    List<ChiTietDonNhap> details = chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(id);

    Map<Long, ChiTietDonNhap> detailMap =
        details.stream().collect(Collectors.toMap(ChiTietDonNhap::getId, Function.identity()));

    /*
     * Ngăn cùng một chi_tiet_don_nhap_id
     * xuất hiện nhiều lần trong cùng request.
     */
    Set<Long> seen = new HashSet<>();

    /*
     * Tổng giá trị hàng trả của RIÊNG request hiện tại,
     * chưa bao gồm VAT.
     */
    BigDecimal returnedGoods = BigDecimal.ZERO;

    for (Long variantId :
        details.stream().map(detail -> detail.getPhienBan().getId()).distinct().sorted().toList()) {

      warehouseSupport.lockVariant(variantId);
    }

    for (AdminPurchaseOrderReturnRequest.Item item : request.getItems()) {

      if (!seen.add(item.getChiTietDonNhapId())) {
        throw new AppException(
            ErrorCode.INVALID_DATA, "Một chi tiết đơn nhập chỉ được xuất hiện một lần");
      }

      ChiTietDonNhap detail = detailMap.get(item.getChiTietDonNhapId());

      if (detail == null) {
        throw new AppException(ErrorCode.NOT_FOUND, "Chi tiết đơn nhập không tồn tại");
      }

      /*
       * so_luong_loi <= so_luong_tra
       */
      if (item.getSoLuongLoi() > item.getSoLuongTra()) {

        throw new AppException(
            ErrorCode.INVALID_DATA, "Số lượng lỗi không được lớn hơn số lượng trả");
      }

      Long variantId = detail.getPhienBan().getId();

      /*
       * Tổng số lượng đã nhập từ PO này.
       */
      int imported = Math.max(0, sumMovement(id, variantId, LoaiGiaoDichKho.NHAP_HANG));

      /*
       * Tổng số lượng đã trả NCC ở CÁC LẦN TRƯỚC.
       *
       * TRA_NCC được ghi âm:
       * -1
       * -2
       * ...
       *
       * nên Math.abs().
       */
      int alreadyReturned = Math.abs(sumMovement(id, variantId, LoaiGiaoDichKho.TRA_NCC));

      int remainingReturnable =
          imported - alreadyReturned - nccAccounting.legacyAssigned(id, variantId);

      if (remainingReturnable <= 0) {
        throw new AppException(
            ErrorCode.CONFLICT, "Sản phẩm này không còn số lượng có thể hoàn trả");
      }

      /*
       * Không được:
       *
       * đã nhập 10
       * đã trả 6
       * còn 4
       *
       * nhưng request tiếp tục trả 5.
       */
      if (item.getSoLuongTra() > remainingReturnable) {

        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "Chỉ còn " + remainingReturnable + " sản phẩm có thể hoàn trả");
      }

      /*
       * Lock tồn kho trước khi cập nhật.
       */
      TonKho inventory = lockExistingInventory(warehouse, detail.getPhienBan());

      /*
       * Ví dụ:
       *
       * trả 5
       * trong đó lỗi 2
       *
       * => hàng bình thường trả = 3
       */
      int normalReturn = item.getSoLuongTra() - item.getSoLuongLoi();

      if (inventory.getTonThucTe() < item.getSoLuongTra()) {

        throw new AppException(ErrorCode.CONFLICT, "Tồn thực tế không đủ để trả Nhà Cung Cấp");
      }

      if (inventory.getTonCoTheBan() < normalReturn) {

        throw new AppException(ErrorCode.CONFLICT, "Tồn có thể bán không đủ để trả Nhà Cung Cấp");
      }

      if (inventory.getHangLoi() < item.getSoLuongLoi()) {

        throw new AppException(ErrorCode.CONFLICT, "Số lượng hàng lỗi trong kho không đủ");
      }

      WarehouseSupport.numbers(inventory);
      markSupplierSerialsReturned(order, detail, item);

      /*
       * Giảm tồn thực tế.
       */
      inventory.setTonThucTe(inventory.getTonThucTe() - item.getSoLuongTra());

      /*
       * Chỉ hàng bình thường nằm trong ton_co_the_ban.
       */
      inventory.setTonCoTheBan(inventory.getTonCoTheBan() - normalReturn);

      /*
       * Hàng lỗi trả NCC thì giảm hang_loi.
       */
      inventory.setHangLoi(inventory.getHangLoi() - item.getSoLuongLoi());

      tonKhoRepository.save(inventory);

      /*
       * Ghi thẻ kho.
       *
       * TRA_NCC phải là số âm.
       */
      theKhoRepository.save(
          TheKho.builder()
              .khoHang(warehouse)
              .phienBan(detail.getPhienBan())
              .loaiGiaoDich(LoaiGiaoDichKho.TRA_NCC)
              .maChungTuGoc(id)
              .soLuongThayDoi(-item.getSoLuongTra())
              .tonCuoi(inventory.getTonThucTe())
              .ghiChu(request.getLyDo())
              .build());

      /*
       * Giá trị hàng trả của request hiện tại.
       *
       * Chưa VAT.
       */
      returnedGoods =
          returnedGoods.add(detail.getGiaNhap().multiply(BigDecimal.valueOf(item.getSoLuongTra())));
    }

    /*
     * ---------------------------------------------------------
     * QUAN TRỌNG
     * ---------------------------------------------------------
     *
     * sumMovement() và calculateReturnedValue()
     * đều query lại bảng the_kho.
     *
     * Vì vậy flush những TRA_NCC vừa tạo xuống DB
     * trước khi tính tổng tích lũy.
     */
    theKhoRepository.flush();

    /*
     * Giá trị RIÊNG lần trả hiện tại.
     *
     * Dùng cho response.
     */
    BigDecimal currentReturnValue = applyTax(returnedGoods, order.getApDungThue());

    /*
     * Tổng giá trị TẤT CẢ các lần trả NCC
     * của đơn nhập.
     *
     * Ví dụ:
     *
     * lần 1 = 10 triệu
     * lần 2 = 15 triệu
     *
     * cumulative = 25 triệu.
     */
    BigDecimal cumulativeReturnValue = calculateReturnedValue(order, details);

    /*
     * Kiểm tra sau lần trả hiện tại:
     * toàn bộ số đã nhập có được trả hết chưa.
     */
    boolean fullReturn =
        details.stream()
            .allMatch(
                detail -> {
                  Long variantId = detail.getPhienBan().getId();

                  int imported = Math.max(0, sumMovement(id, variantId, LoaiGiaoDichKho.NHAP_HANG));

                  int totalReturned =
                      Math.abs(sumMovement(id, variantId, LoaiGiaoDichKho.TRA_NCC))
                          + nccAccounting.finalReturned(id, variantId);

                  return totalReturned >= imported;
                });

    order.setTrangThaiNhap(
        fullReturn ? TrangThaiNhapHang.HOAN_TRA_TOAN_BO : TrangThaiNhapHang.HOAN_TRA_MOT_PHAN);

    /*
     * Tổng tiền đã CHI cho NCC.
     */
    BigDecimal paid = sumCash(order, LoaiPhieuThuChi.CHI);

    /*
     * Tổng tiền NCC đã hoàn lại cho cửa hàng
     * ở những lần trước.
     */
    BigDecimal oldRefund = sumCash(order, LoaiPhieuThuChi.THU);

    /*
     * Giá trị thực tế còn lại của đơn nhập sau
     * TẤT CẢ các lần trả hàng.
     *
     * Không dùng currentReturnValue ở đây.
     */
    BigDecimal adjustedTotal = nccAccounting.effectiveTotal(order, cumulativeReturnValue);

    /*
     * Số tiền thực tế cửa hàng đã trả NCC,
     * sau khi trừ tiền NCC đã hoàn lại.
     */
    BigDecimal netPaidBeforeRefund = paid.subtract(oldRefund);

    /*
     * Nếu cửa hàng đã trả nhiều hơn giá trị hàng
     * thực tế còn giữ thì NCC phải hoàn phần chênh.
     *
     * Ví dụ:
     *
     * PO = 100 triệu
     * đã trả NCC = 100 triệu
     * đã trả hàng = 25 triệu
     *
     * adjustedTotal = 75 triệu
     *
     * refundDue = 100 - 75
     *           = 25 triệu
     */
    BigDecimal refundDue = netPaidBeforeRefund.subtract(adjustedTotal).max(BigDecimal.ZERO);

    BigDecimal received = BigDecimal.ZERO;

    AdminPurchaseOrderReturnResponse.CashVoucher cashVoucher = null;

    /*
     * Chỉ tạo Phiếu Thu nếu thực sự đã nhận
     * tiền hoàn từ NCC.
     */
    if (Boolean.TRUE.equals(request.getXacNhanDaNhanTien())) {

      if (refundDue.compareTo(BigDecimal.ZERO) <= 0) {

        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY, "Nhà cung cấp hiện không có khoản tiền phải hoàn");
      }

      validateRefundConfirmation(request);

      SoQuyThuChi voucher =
          cashbookService.createAutomatic(
              CashbookService.AutomaticVoucher.builder()
                  .khoaNghiepVu(refundVoucherCode)
                  .loaiPhieu(LoaiPhieuThuChi.THU)
                  .maLoaiThuChi("THU_HOAN_NCC")
                  .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.NHA_CUNG_CAP)
                  .nhaCungCap(order.getNhaCungCap())
                  .maChungTuThamChieu(order.getMaDonNhap())
                  .donNhapHang(order)
                  .soTien(refundDue)
                  .phuongThucThanhToan(request.getPhuongThucHoan())
                  .ngayGhiNhan(request.getNgayNhanTien())
                  .moTa(request.getGhiChu())
                  .tags(
                      request.getMaGiaoDich() == null || request.getMaGiaoDich().isBlank()
                          ? null
                          : "MA_GIAO_DICH:" + request.getMaGiaoDich().strip())
                  .nguoiTao(actor)
                  .build());

      voucher = soQuyThuChiRepository.save(voucher);

      received = refundDue;

      cashVoucher =
          AdminPurchaseOrderReturnResponse.CashVoucher.builder()
              .id(voucher.getId())
              .maPhieu(voucher.getMaPhieu())
              .soTien(voucher.getSoTien())
              .build();
    }

    /*
     * Nếu vừa tạo Phiếu Thu thì đảm bảo query
     * trong updatePaymentStatus() nhìn thấy nó.
     */
    soQuyThuChiRepository.flush();

    updatePaymentStatus(order);

    donNhapHangRepository.save(order);

    return AdminPurchaseOrderReturnResponse.builder()
        .donNhapHangId(order.getId())
        .trangThaiNhap(order.getTrangThaiNhap())

        /*
         * Response chỉ trả giá trị của LẦN RETURN NÀY.
         */
        .giaTriHangTra(currentReturnValue)
        .soTienDaNhanHoan(received)
        .phieuThu(cashVoucher)
        .build();
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminPurchaseOrderReturnResponse returnToSupplier(
      Long id, String idempotencyKey, AdminPurchaseOrderReturnRequest request) {

    validateIdempotencyKey(idempotencyKey);

    String normalizedKey = UUID.fromString(idempotencyKey).toString();
    NguoiDung actor = currentUser();

    return cashbookService.executeOnce(
        "RETURN-NCC-" + normalizedKey,
        actor,
        List.of(id, request),
        AdminPurchaseOrderReturnResponse.class,
        () -> doReturnToSupplier(id, request, actor, "THU-NCC-" + normalizedKey));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminPurchaseOrderRefundResponse receiveRefund(
      Long id, String idempotencyKey, AdminPurchaseOrderRefundRequest request) {

    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_DATA, "ID đơn nhập không hợp lệ");
    }

    if (request == null || !Boolean.TRUE.equals(request.getXacNhanDaNhanTien())) {
      throw new AppException(
          ErrorCode.INVALID_DATA, "Phải xác nhận đã nhận tiền Nhà Cung Cấp hoàn");
    }

    String method = request.getPhuongThucHoan();

    if (method == null || !Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE").contains(method)) {
      throw new AppException(ErrorCode.INVALID_DATA, "Phương thức hoàn tiền không hợp lệ");
    }

    if (request.getNgayNhanTien() == null) {
      throw new AppException(ErrorCode.INVALID_DATA, "Thiếu ngày nhận tiền");
    }

    if (!"TIEN_MAT".equals(method)
        && (request.getMaGiaoDich() == null || request.getMaGiaoDich().isBlank())) {
      throw new AppException(ErrorCode.INVALID_DATA, "Chuyển khoản hoặc thẻ phải có mã giao dịch");
    }

    validateIdempotencyKey(idempotencyKey);

    String normalizedKey = UUID.fromString(idempotencyKey).toString();

    // UUID.fromString có thể chấp nhận một số chuỗi rút gọn.
    // Yêu cầu UUID đầy đủ dạng 8-4-4-4-12.
    if (!normalizedKey.equalsIgnoreCase(idempotencyKey)) {
      throw new AppException(ErrorCode.INVALID_DATA, "Idempotency-Key phải là UUID hợp lệ");
    }

    NguoiDung actor = currentUser();

    return cashbookService.executeOnce(
        "REFUND-NCC-" + normalizedKey,
        actor,
        List.of(id, request),
        AdminPurchaseOrderRefundResponse.class,
        () -> doReceiveRefund(id, request, actor, "THU-NCC-" + normalizedKey));
  }

  private AdminPurchaseOrderRefundResponse doReceiveRefund(
      Long id, AdminPurchaseOrderRefundRequest request, NguoiDung actor, String voucherCode) {

    DonNhapHang order = requireOrderForUpdate(id);

    if (order.getTrangThaiNhap() == TrangThaiNhapHang.DAT_HANG
        || order.getTrangThaiNhap() == TrangThaiNhapHang.HUY) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn nhập chưa được duyệt hoặc đã bị hủy");
    }

    PurchaseRefundBalance before = readPurchaseRefundBalance(order);

    if (before.refundDue().signum() <= 0) {
      throw new AppException(ErrorCode.CONFLICT, "Nhà cung cấp không còn khoản tiền phải hoàn");
    }

    BigDecimal amount =
        request.getSoTienNhan() == null ? before.refundDue() : request.getSoTienNhan();

    if (amount.signum() <= 0 || amount.scale() > 2 || amount.compareTo(before.refundDue()) > 0) {
      throw new AppException(
          ErrorCode.INVALID_DATA,
          "Số tiền nhận phải lớn hơn 0 và không vượt khoản Nhà Cung Cấp còn phải hoàn");
    }

    String transaction =
        request.getMaGiaoDich() == null || request.getMaGiaoDich().isBlank()
            ? null
            : request.getMaGiaoDich().strip();

    String note =
        request.getGhiChu() == null || request.getGhiChu().isBlank()
            ? null
            : request.getGhiChu().strip();

    String description =
        "Nhận tiền Nhà Cung Cấp hoàn sau trả hàng hoặc điều chỉnh"
            + (transaction == null ? "" : "\nMã giao dịch: " + transaction)
            + (note == null ? "" : "\nGhi chú: " + note);

    SoQuyThuChi voucher =
        cashbookService.createAutomatic(
            CashbookService.AutomaticVoucher.builder()
                .khoaNghiepVu(voucherCode)
                .loaiPhieu(LoaiPhieuThuChi.THU)
                .maLoaiThuChi("THU_HOAN_NCC")
                .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.NHA_CUNG_CAP)
                .nhaCungCap(order.getNhaCungCap())
                .maChungTuThamChieu(order.getMaDonNhap())
                .donNhapHang(order)
                .soTien(amount)
                .phuongThucThanhToan(request.getPhuongThucHoan())
                .ngayGhiNhan(request.getNgayNhanTien())
                .moTa(description)
                .nguoiTao(actor)
                .build());

    // createAutomatic đã saveAndFlush phiếu thu.
    updatePaymentStatus(order);
    donNhapHangRepository.saveAndFlush(order);

    PurchaseRefundBalance after = readPurchaseRefundBalance(order);

    return new AdminPurchaseOrderRefundResponse(
        order.getId(),
        order.getTrangThaiNhap(),
        order.getTrangThaiThanhToan(),
        after.returnedValue(),
        after.adjustedTotal(),
        after.paid(),
        after.refundReceived(),
        after.debt(),
        after.refundDue(),
        CashVoucherResponse.from(voucher));
  }

  private PurchaseRefundBalance readPurchaseRefundBalance(DonNhapHang order) {

    BigDecimal total = order.getTongTien();

    List<ChiTietDonNhap> details =
        chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(order.getId());

    if (order.getNhaCungCap() == null || total == null || total.signum() < 0 || details.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tiền của đơn nhập không nhất quán");
    }

    for (ChiTietDonNhap detail : details) {
      if (detail.getPhienBan() == null
          || detail.getSoLuong() == null
          || detail.getSoLuong() <= 0
          || detail.getGiaNhap() == null
          || detail.getGiaNhap().signum() < 0
          || detail.getThanhTien() == null
          || detail
                  .getThanhTien()
                  .compareTo(detail.getGiaNhap().multiply(BigDecimal.valueOf(detail.getSoLuong())))
              != 0) {
        throw new AppException(
            ErrorCode.CONFLICT, "Dữ liệu tiền của chi tiết đơn nhập không nhất quán");
      }
    }

    BigDecimal expectedTotal = applyTax(calculateGoodsAmount(details), order.getApDungThue());

    if (total.compareTo(expectedTotal) != 0) {
      throw new AppException(ErrorCode.CONFLICT, "Tổng tiền đơn nhập không khớp chi tiết và thuế");
    }

    BigDecimal returnedValue = calculateReturnedValue(order, details);
    BigDecimal paid = sumCash(order, LoaiPhieuThuChi.CHI);
    BigDecimal refundReceived = sumCash(order, LoaiPhieuThuChi.THU);

    if (returnedValue.signum() < 0
        || returnedValue.compareTo(total) > 0
        || paid.signum() < 0
        || refundReceived.signum() < 0
        || refundReceived.compareTo(paid) > 0) {
      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tiền của đơn nhập không nhất quán");
    }

    BigDecimal adjustedTotal = nccAccounting.effectiveTotal(order, returnedValue);

    BigDecimal netPaid = paid.subtract(refundReceived);

    return new PurchaseRefundBalance(
        returnedValue,
        adjustedTotal,
        paid,
        refundReceived,
        adjustedTotal.subtract(netPaid).max(BigDecimal.ZERO),
        netPaid.subtract(adjustedTotal).max(BigDecimal.ZERO));
  }

  private record PurchaseRefundBalance(
      BigDecimal returnedValue,
      BigDecimal adjustedTotal,
      BigDecimal paid,
      BigDecimal refundReceived,
      BigDecimal debt,
      BigDecimal refundDue) {}

  // =========================================================
  // CANCEL
  // =========================================================

  @Transactional
  public AdminPurchaseOrderStatusResponse cancel(Long id) {

    DonNhapHang order = requireOrderForUpdate(id);

    if (order.getTrangThaiNhap() != TrangThaiNhapHang.DAT_HANG) {

      throw new AppException(ErrorCode.CONFLICT, "Chỉ được hủy đơn ở trạng thái " + "DAT_HANG");
    }

    if (sumCash(order, LoaiPhieuThuChi.CHI).compareTo(BigDecimal.ZERO) > 0) {

      throw new AppException(ErrorCode.CONFLICT, "Đơn đã phát sinh thanh toán");
    }

    if (theKhoRepository.existsByMaChungTuGocAndLoaiGiaoDich(id, LoaiGiaoDichKho.NHAP_HANG)) {

      throw new AppException(ErrorCode.CONFLICT, "Đơn đã phát sinh nhập kho");
    }

    order.setTrangThaiNhap(TrangThaiNhapHang.HUY);

    order = donNhapHangRepository.save(order);

    return mapper.toStatusResponse(order);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private void validateItems(List<AdminPurchaseOrderSaveRequest.Item> items) {

    Set<Long> ids = new HashSet<>();

    for (AdminPurchaseOrderSaveRequest.Item item : items) {

      if (!ids.add(item.getPhienBanId())) {

        throw new AppException(
            ErrorCode.INVALID_DATA, "Một phiên bản chỉ được xuất hiện " + "một lần trong đơn nhập");
      }
    }
  }

  private Map<Long, PhienBanSanPham> loadVariants(List<AdminPurchaseOrderSaveRequest.Item> items) {

    Set<Long> ids =
        items.stream()
            .map(AdminPurchaseOrderSaveRequest.Item::getPhienBanId)
            .collect(Collectors.toSet());

    List<PhienBanSanPham> entities = phienBanSanPhamRepository.findAllById(ids);

    if (entities.size() != ids.size()) {

      throw new AppException(ErrorCode.NOT_FOUND, "Có phiên bản sản phẩm không tồn tại");
    }

    return entities.stream().collect(Collectors.toMap(PhienBanSanPham::getId, Function.identity()));
  }

  private void saveDetails(
      DonNhapHang order,
      List<AdminPurchaseOrderSaveRequest.Item> items,
      Map<Long, PhienBanSanPham> variants) {

    List<ChiTietDonNhap> details =
        items.stream()
            .map(
                item -> {
                  BigDecimal total =
                      item.getGiaNhap().multiply(BigDecimal.valueOf(item.getSoLuong()));

                  return ChiTietDonNhap.builder()
                      .donNhapHang(order)
                      .phienBan(variants.get(item.getPhienBanId()))
                      .soLuong(item.getSoLuong())
                      .giaNhap(item.getGiaNhap())
                      .thanhTien(total)
                      .build();
                })
            .toList();

    chiTietDonNhapRepository.saveAll(details);
  }

  private BigDecimal calculateRequestGoodsAmount(List<AdminPurchaseOrderSaveRequest.Item> items) {

    return items.stream()
        .map(item -> item.getGiaNhap().multiply(BigDecimal.valueOf(item.getSoLuong())))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal calculateGoodsAmount(List<ChiTietDonNhap> details) {

    return details.stream()
        .map(ChiTietDonNhap::getThanhTien)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal applyTax(BigDecimal amount, Boolean appliesTax) {

    if (!Boolean.TRUE.equals(appliesTax)) {
      return amount.setScale(2, RoundingMode.HALF_UP);
    }

    return amount.multiply(BigDecimal.ONE.add(VAT_RATE)).setScale(2, RoundingMode.HALF_UP);
  }

  private DonNhapHang requireOrder(Long id) {

    return donNhapHangRepository
        .findById(id)
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn nhập không tồn tại"));
  }

  private DonNhapHang requireOrderForUpdate(Long id) {

    DonNhapHang order =
        donNhapHangRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn nhập không tồn tại"));
    entityManager.refresh(order);
    orderEvents.watchPurchase(order);
    return order;
  }

  private NhaCungCap requireActiveSupplier(Long id) {

    NhaCungCap supplier =
        nhaCungCapRepository
            .findById(id)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Nhà cung cấp không tồn tại"));

    if (supplier.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {

      throw new AppException(ErrorCode.CONFLICT, "Nhà cung cấp đã ngừng hoạt động");
    }

    return supplier;
  }

  private KhoHang requireDefaultWarehouse(Long requestedId) {

    if (!Objects.equals(requestedId, defaultWarehouseId)) {

      throw new AppException(
          ErrorCode.INVALID_DATA, "Sprint 1 chỉ hỗ trợ kho mặc định " + defaultWarehouseId);
    }

    KhoHang warehouse =
        khoHangRepository
            .findById(requestedId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Kho hàng không tồn tại"));

    if (warehouse.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {

      throw new AppException(ErrorCode.CONFLICT, "Kho hàng đã ngừng hoạt động");
    }

    return warehouse;
  }

  private NguoiDung currentUser() {

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || authentication.getPrincipal() == null) {

      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    Object principal = authentication.getPrincipal();

    if (principal instanceof NguoiDung user) {
      return user;
    }

    Long userId;

    if (principal instanceof Number number) {
      userId = number.longValue();
    } else {
      userId = Long.valueOf(principal.toString());
    }

    return nguoiDungRepository
        .findById(userId)
        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
  }

  private BigDecimal sumCash(DonNhapHang order, LoaiPhieuThuChi type) {

    return soQuyThuChiRepository.findByMaChungTuThamChieu(order.getMaDonNhap()).stream()
        .filter(entry -> isPurchaseCash(entry, order, type))
        .map(
            entry -> {
              if (entry.getSoTien() == null || entry.getSoTien().signum() <= 0) {

                throw new AppException(
                    ErrorCode.CONFLICT, "Phiếu thu/chi của đơn nhập có số tiền không hợp lệ");
              }

              return entry.getSoTien();
            })
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private boolean isPurchaseCash(SoQuyThuChi entry, DonNhapHang order, LoaiPhieuThuChi type) {

    if (type == null || order.getNhaCungCap() == null) {
      return false;
    }

    String expectedCode = type == LoaiPhieuThuChi.CHI ? "CHI_NHAP_HANG" : "THU_HOAN_NCC";

    return entry.getLoaiPhieu() == type
        && entry.getTrangThai() == TrangThaiPhieuThuChi.DA_GHI_NHAN
        && entry.getNguonTao() == NguonTaoPhieuThuChi.TU_DONG
        && entry.getNhomNguoiNopNhan() == NhomNguoiNopNhanEnum.NHA_CUNG_CAP
        && entry.getNhaCungCap() != null
        && Objects.equals(entry.getNhaCungCap().getId(), order.getNhaCungCap().getId())
        && entry.getNguoiNopNhan() == null
        && entry.getDoiTacVanChuyen() == null
        && entry.getPhieuBaoHanh() == null
        && entry.getHoaDonBaoHanh() == null
        && entry.getPhieuTraHang() == null
        && entry.getLoaiThuChi() != null
        && entry.getLoaiThuChi().getLoaiPhieu() == type
        && expectedCode.equals(entry.getLoaiThuChi().getMaLoai())
        && Objects.equals(entry.getMaChungTuThamChieu(), order.getMaDonNhap());
  }

  private BigDecimal calculateDebt(DonNhapHang order) {
    return readPurchaseRefundBalance(order).debt();
  }

  private BigDecimal calculateReturnedValue(DonNhapHang order, List<ChiTietDonNhap> details) {

    BigDecimal financiallyReturnedGoods = BigDecimal.ZERO;

    for (ChiTietDonNhap detail : details) {

      Long variantId = detail.getPhienBan().getId();

      int ordered = detail.getSoLuong();

      int imported = Math.max(0, sumMovement(order.getId(), variantId, LoaiGiaoDichKho.NHAP_HANG));

      int returned = Math.abs(sumMovement(order.getId(), variantId, LoaiGiaoDichKho.TRA_NCC));

      /*
       * Nếu NCC giao thừa thì phần trả hàng trước tiên
       * được xem là trả lại lượng giao thừa.
       *
       * Ví dụ:
       * đặt 2, nhập 8, trả 6
       * => không giảm công nợ của 2 sản phẩm đã đặt.
       *
       * Chỉ phần trả vượt quá lượng giao thừa mới
       * làm giảm giá trị đơn/công nợ.
       */
      int excessReceived =
          Math.max(
              imported - ordered - nccAccounting.legacyExtraAssigned(order.getId(), variantId), 0);

      int financiallyReturnedQuantity = Math.max(returned - excessReceived, 0);

      financiallyReturnedQuantity = Math.min(financiallyReturnedQuantity, ordered);

      financiallyReturnedGoods =
          financiallyReturnedGoods.add(
              detail.getGiaNhap().multiply(BigDecimal.valueOf(financiallyReturnedQuantity)));
    }

    return applyTax(financiallyReturnedGoods, order.getApDungThue());
  }

  private int sumMovement(Long orderId, Long variantId, LoaiGiaoDichKho type) {

    Integer value = theKhoRepository.sumMovement(orderId, variantId, type);

    return value == null ? 0 : value;
  }

  private SerialMode resolveSerialMode(Long variantId) {
    PhienBanSanPham variant =
        phienBanSanPhamRepository
            .findById(variantId)
            .orElseThrow(
                () ->
                    new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản " + variantId));

    Boolean configured = variant.getCoQuanLySerial();

    if (configured == null) {
      throw new AppException(
          ErrorCode.CONFLICT, "Phiên bản " + variantId + " chưa có cấu hình quản lý serial");
    }

    return new SerialMode(configured, true);
  }

  private void validateReceiveRequest(
      AdminPurchaseOrderReceiveRequest request, Map<Long, ChiTietDonNhap> detailMap) {

    if (request.getItems() == null || request.getItems().isEmpty()) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Phải chọn ít nhất một dòng để nhập kho");
    }

    Set<Long> seen = new HashSet<>();

    for (var item : request.getItems()) {
      if (item == null
          || item.getChiTietDonNhapId() == null
          || !seen.add(item.getChiTietDonNhapId())) {
        throw new AppException(ErrorCode.UNPROCESSABLE_ENTITY, "Dòng nhập kho bị thiếu hoặc trùng");
      }

      var detail = detailMap.get(item.getChiTietDonNhapId());

      if (detail == null) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY, "Có dòng không thuộc đơn nhập hiện tại");
      }

      int received = grossReceived(detail);
      int remaining = detail.getSoLuong() - received;

      Integer quantity = item.getSoLuongNhapKho();

      if (quantity == null || quantity <= 0 || quantity > remaining) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "Dòng " + detail.getId() + " chỉ còn " + remaining + " sản phẩm chưa nhập");
      }
    }
  }

  private int grossReceived(ChiTietDonNhap detail) {
    int received =
        sumMovement(
            detail.getDonNhapHang().getId(),
            detail.getPhienBan().getId(),
            LoaiGiaoDichKho.NHAP_HANG);

    if (received < 0) {
      throw new AppException(
          ErrorCode.CONFLICT, "Số lượng đã nhập không nhất quán ở dòng " + detail.getId());
    }

    return received;
  }

  private void refreshImportStatus(DonNhapHang order, List<ChiTietDonNhap> details) {

    boolean hasReturn =
        details.stream()
            .anyMatch(
                detail ->
                    sumMovement(
                                order.getId(),
                                detail.getPhienBan().getId(),
                                LoaiGiaoDichKho.TRA_NCC)
                            < 0
                        || nccAccounting.finalReturned(order.getId(), detail.getPhienBan().getId())
                            > 0);

    if (hasReturn) {
      boolean allReturned =
          details.stream()
              .allMatch(
                  detail -> {
                    Long variantId = detail.getPhienBan().getId();

                    int returned =
                        Math.abs(sumMovement(order.getId(), variantId, LoaiGiaoDichKho.TRA_NCC))
                            + nccAccounting.finalReturned(order.getId(), variantId);

                    return returned >= grossReceived(detail);
                  });

      order.setTrangThaiNhap(
          allReturned ? TrangThaiNhapHang.HOAN_TRA_TOAN_BO : TrangThaiNhapHang.HOAN_TRA_MOT_PHAN);
      return;
    }

    boolean fullyReceived =
        details.stream().allMatch(detail -> grossReceived(detail) >= detail.getSoLuong());

    boolean anyReceived = details.stream().anyMatch(detail -> grossReceived(detail) > 0);

    order.setTrangThaiNhap(
        fullyReceived
            ? TrangThaiNhapHang.DA_NHAP_KHO
            : anyReceived ? TrangThaiNhapHang.NHAP_MOT_PHAN : TrangThaiNhapHang.DA_DUYET);
  }

  private Set<String> collectAndValidateSerials(
      AdminPurchaseOrderReceiveRequest request, Map<Long, ChiTietDonNhap> detailMap) {

    Set<String> globalSerials = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

    for (var item : request.getItems()) {
      List<String> serials = item.getSoSerials();

      if (serials == null || item.getQuanLySerial() == null) {
        throw new AppException(
            ErrorCode.INVALID_DATA, "Thiếu cấu hình serial hoặc danh sách serial");
      }

      if (!Boolean.TRUE.equals(item.getQuanLySerial())) {
        if (!serials.isEmpty()) {
          throw new AppException(
              ErrorCode.UNPROCESSABLE_ENTITY,
              "Phiên bản không quản lý serial phải gửi so_serials: []");
        }

        continue;
      }

      if (serials.size() != item.getSoLuongNhapKho()) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY, "Số lượng serial phải bằng số lượng nhập kho");
      }

      for (String code : serials) {
        if (code == null || code.isBlank() || code.trim().length() > 100) {

          throw new AppException(ErrorCode.INVALID_DATA, "Serial bắt buộc và tối đa 100 ký tự");
        }

        if (!globalSerials.add(code.trim())) {
          throw new AppException(ErrorCode.CONFLICT, "Serial bị trùng trong yêu cầu");
        }
      }
    }

    return globalSerials;
  }

  private TonKho lockOrCreateInventory(KhoHang warehouse, PhienBanSanPham variant) {

    List<TonKho> rows = tonKhoRepository.findForSerialUpdate(warehouse.getId(), variant.getId());

    if (rows.size() > 1) {

      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tồn kho bị trùng");
    }

    if (!rows.isEmpty()) {
      TonKho stock = rows.get(0);
      recallSafety.track(stock);
      return stock;
    }

    TonKho created =
        TonKho.builder()
            .khoHang(warehouse)
            .phienBan(variant)
            .tonThucTe(0)
            .tonCoTheBan(0)
            .hangLoi(0)
            .build();

    created = tonKhoRepository.saveAndFlush(created);
    recallSafety.track(created);

    return created;
  }

  private TonKho lockExistingInventory(KhoHang warehouse, PhienBanSanPham variant) {

    List<TonKho> rows = tonKhoRepository.findForSerialUpdate(warehouse.getId(), variant.getId());

    if (rows.isEmpty()) {

      throw new AppException(ErrorCode.CONFLICT, "Không tìm thấy tồn kho để hoàn trả");
    }

    if (rows.size() > 1) {

      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tồn kho bị trùng");
    }

    TonKho stock = rows.get(0);
    recallSafety.track(stock);
    return stock;
  }

  private void updatePaymentStatus(DonNhapHang order) {

    PurchaseRefundBalance balance = readPurchaseRefundBalance(order);

    BigDecimal netPaid = balance.paid().subtract(balance.refundReceived());

    if (balance.adjustedTotal().signum() == 0 || netPaid.compareTo(balance.adjustedTotal()) >= 0) {
      order.setTrangThaiThanhToan(TrangThaiThanhToanNhap.DA_TRA);
    } else if (netPaid.signum() <= 0) {
      order.setTrangThaiThanhToan(TrangThaiThanhToanNhap.CHUA_TRA);
    } else {
      order.setTrangThaiThanhToan(TrangThaiThanhToanNhap.TRA_MOT_PHAN);
    }
  }

  private AdminPurchaseOrderPaymentResponse buildPaymentResponse(
      DonNhapHang order, SoQuyThuChi voucher) {

    BigDecimal paid = sumCash(order, LoaiPhieuThuChi.CHI);

    BigDecimal debt = calculateDebt(order);

    return AdminPurchaseOrderPaymentResponse.builder()
        .donNhapHangId(order.getId())
        .soTienThanhToan(voucher.getSoTien())
        .soTienDaThanhToan(paid)
        .soTienConNo(debt)
        .trangThaiThanhToan(order.getTrangThaiThanhToan())
        .phieuChi(
            AdminPurchaseOrderPaymentResponse.CashVoucher.builder()
                .id(voucher.getId())
                .maPhieu(voucher.getMaPhieu())
                .soTien(voucher.getSoTien())
                .build())
        .build();
  }

  public List<AdminPurchaseOrderReceiveResponse.SerialData> getReturnSerials(
      Long orderId, Long detailId) {

    requireOrder(orderId);

    var detail =
        chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(orderId).stream()
            .filter(item -> Objects.equals(item.getId(), detailId))
            .findFirst()
            .orElseThrow(
                () -> new AppException(ErrorCode.NOT_FOUND, "Chi tiết không thuộc đơn nhập"));

    return warehouseSupport.shopSerials(List.of(detail.getPhienBan().getId()), false).stream()
        .filter(
            serial ->
                serial.getDonNhapHang() != null
                    && Objects.equals(serial.getDonNhapHang().getId(), orderId))
        .filter(
            serial ->
                serial.getTrangThai() == TrangThaiSerial.TRONG_KHO
                    || serial.getTrangThai() == TrangThaiSerial.LOI)
        .filter(serial -> serial.getChiTietDongGoi() == null)
        .filter(serial -> !nccAccounting.trackedSerial(serial.getId()))
        .filter(serial -> !Boolean.TRUE.equals(serial.getBiThuHoi()))
        .map(
            serial ->
                AdminPurchaseOrderReceiveResponse.SerialData.builder()
                    .id(serial.getId())
                    .soSerial(serial.getSoSerial())
                    .trangThai(serial.getTrangThai())
                    .build())
        .toList();
  }

  private void markSupplierSerialsReturned(
      DonNhapHang order, ChiTietDonNhap detail, AdminPurchaseOrderReturnRequest.Item item) {

    Boolean managed = detail.getPhienBan().getCoQuanLySerial();

    if (managed == null) {
      throw new AppException(ErrorCode.CONFLICT, "Phiên bản chưa có cấu hình quản lý serial");
    }

    List<Long> ids = item.getSoSerialIds();

    if (ids == null) {
      throw new AppException(ErrorCode.INVALID_DATA, "so_serial_ids không được null");
    }

    if (!managed) {
      if (!ids.isEmpty()) {
        throw new AppException(
            ErrorCode.INVALID_DATA, "Hàng không quản lý serial phải gửi so_serial_ids: []");
      }

      return;
    }

    if (ids.stream().anyMatch(value -> value == null || value <= 0)
        || new HashSet<>(ids).size() != ids.size()
        || ids.size() != item.getSoLuongTra()) {

      throw new AppException(
          ErrorCode.INVALID_DATA, "Phải chọn đúng số lượng serial trả và không được trùng");
    }

    var serials = soSerialSanPhamRepository.findAllByIdsForUpdate(ids);

    if (serials.size() != ids.size()) {
      throw new AppException(ErrorCode.NOT_FOUND, "Có serial không tồn tại");
    }

    int defects = 0;

    for (var serial : serials) {
      recallSafety.requireSerialClear(serial);
      if (nccAccounting.trackedSerial(serial.getId())) {
        throw new AppException(
            ErrorCode.CONFLICT,
            "Serial đã có lịch sử xử lý Nhà Cung Cấp; hãy trả theo hồ sơ Nhà Cung Cấp: "
                + serial.getSoSerial());
      }

      boolean correctSource =
          Objects.equals(serial.getPhienBan().getId(), detail.getPhienBan().getId())
              && serial.getDonNhapHang() != null
              && Objects.equals(serial.getDonNhapHang().getId(), order.getId());

      boolean warehouseState =
          serial.getTrangThai() == TrangThaiSerial.TRONG_KHO
              || serial.getTrangThai() == TrangThaiSerial.LOI;

      if (!correctSource
          || serial.getDonHang() != null
          || serial.getChiTietDongGoi() != null
          || !warehouseState) {

        throw new AppException(
            ErrorCode.CONFLICT,
            "Serial " + serial.getSoSerial() + " không còn đủ điều kiện trả cho đơn nhập này");
      }

      if (serial.getTrangThai() == TrangThaiSerial.LOI) {
        defects++;
      }
    }

    if (defects != item.getSoLuongLoi()) {
      throw new AppException(
          ErrorCode.INVALID_DATA, "Số lượng lỗi phải khớp trạng thái các serial đã chọn");
    }

    Long activeWarranty =
        entityManager
            .createQuery(
                """
      select count(p.id)
      from PhieuBaoHanh p
      left join p.soSerial sourceSerial
      left join p.thietBi device
      left join device.soSerial deviceSerial
      left join p.thietBiThayThe replacement
      left join replacement.soSerial replacementSerial
      where p.trangThaiXuLy <> :completed
        and (
          sourceSerial.id in :ids
          or deviceSerial.id in :ids
          or replacementSerial.id in :ids
        )
      """,
                Long.class)
            .setParameter("completed", TrangThaiBaoHanh.HOAN_TAT)
            .setParameter("ids", ids)
            .getSingleResult();

    if (activeWarranty > 0) {
      throw new AppException(
          ErrorCode.CONFLICT, "Có serial đang thuộc hồ sơ bảo hành chưa hoàn tất");
    }

    serials.forEach(serial -> serial.setTrangThai(TrangThaiSerial.DA_TRA_NCC));
  }

  private void validateIdempotencyKey(String value) {

    if (value == null || value.isBlank()) {

      throw new AppException(ErrorCode.INVALID_DATA, "Thiếu Idempotency-Key");
    }

    try {
      UUID.fromString(value);
    } catch (IllegalArgumentException e) {
      throw new AppException(ErrorCode.INVALID_DATA, "Idempotency-Key phải là UUID");
    }
  }

  private void validateRefundConfirmation(AdminPurchaseOrderReturnRequest request) {

    if (request.getPhuongThucHoan() == null || request.getPhuongThucHoan().isBlank()) {

      throw new AppException(ErrorCode.INVALID_DATA, "Thiếu phương thức hoàn tiền");
    }

    if (request.getNgayNhanTien() == null) {

      throw new AppException(ErrorCode.INVALID_DATA, "Thiếu ngày nhận tiền");
    }

    if ("CHUYEN_KHOAN".equalsIgnoreCase(request.getPhuongThucHoan())
        && (request.getMaGiaoDich() == null || request.getMaGiaoDich().isBlank())) {

      throw new AppException(ErrorCode.INVALID_DATA, "Chuyển khoản phải có mã giao dịch");
    }
  }

  private TrangThaiNhapHang parseImportStatus(String value) {

    if (value == null || value.isBlank()) {
      return null;
    }

    try {
      return TrangThaiNhapHang.valueOf(value.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái nhập không hợp lệ");
    }
  }

  private TrangThaiThanhToanNhap parsePaymentStatus(String value) {

    if (value == null || value.isBlank()) {
      return null;
    }

    try {
      return TrangThaiThanhToanNhap.valueOf(value.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái thanh toán không hợp lệ");
    }
  }

  private record SerialMode(Boolean value, boolean established) {}

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public DonNhapHang lockForNcc(Long id) {
    return requireOrderForUpdate(id);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public void synchronizeNcc(Long id) {
    DonNhapHang order = requireOrderForUpdate(id);

    List<ChiTietDonNhap> details = chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(id);

    refreshImportStatus(order, details);
    updatePaymentStatus(order);
    donNhapHangRepository.saveAndFlush(order);
  }
}
