package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderPaymentRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderReceiveRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderReturnRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderSaveRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.warehouse.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.cashbook.AdminPurchaseOrderMapper;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.partner.NhaCungCapRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.*;
import com.example.dantruventu.Specification.PurchaseOrderSpecification;
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

  private final LoaiThuChiRepository loaiThuChiRepository;

  private final NguoiDungRepository nguoiDungRepository;

  private final AdminPurchaseOrderMapper mapper;

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

    BigDecimal paid = sumCash(order, LoaiPhieuThuChi.CHI);

    BigDecimal refundReceived = sumCash(order, LoaiPhieuThuChi.THU);

    BigDecimal returnedValue = calculateReturnedValue(order, details);

    BigDecimal adjustedTotal = order.getTongTien().subtract(returnedValue).max(BigDecimal.ZERO);

    BigDecimal netPaid = paid.subtract(refundReceived);

    BigDecimal debt = adjustedTotal.subtract(netPaid).max(BigDecimal.ZERO);

    List<AdminPurchaseOrderDetailResponse.Item> responseItems =
        details.stream()
            .map(
                detail -> {
                  Long variantId = detail.getPhienBan().getId();

                  int imported =
                      Math.max(0, sumMovement(order.getId(), variantId, LoaiGiaoDichKho.NHAP_HANG));

                  int returned =
                      Math.abs(sumMovement(order.getId(), variantId, LoaiGiaoDichKho.TRA_NCC));

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
        .ngayTao(order.getNgayTao())
        .items(responseItems)
        .build();
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
            .maDonNhap("TMP-" + UUID.randomUUID())
            .nhaCungCap(supplier)
            .nguoiTao(currentUser())
            .tongTien(total)
            .trangThaiThanhToan(TrangThaiThanhToanNhap.CHUA_TRA)
            .trangThaiNhap(TrangThaiNhapHang.DAT_HANG)
            .apDungThue(request.getApDungThue())
            .build();

    order = donNhapHangRepository.saveAndFlush(order);

    order.setMaDonNhap("DN" + String.format("%07d", order.getId()));

    order = donNhapHangRepository.save(order);

    saveDetails(order, request.getItems(), variants);

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

  @Transactional
  public AdminPurchaseOrderPaymentResponse pay(
      Long id, String idempotencyKey, AdminPurchaseOrderPaymentRequest request) {

    validateIdempotencyKey(idempotencyKey);

    DonNhapHang order = requireOrderForUpdate(id);

    if (order.getTrangThaiNhap() == TrangThaiNhapHang.DAT_HANG
        || order.getTrangThaiNhap() == TrangThaiNhapHang.HUY) {

      throw new AppException(ErrorCode.CONFLICT, "Đơn nhập chưa được duyệt " + "hoặc đã bị hủy");
    }

    String voucherCode = "CHI-NCC-" + idempotencyKey;

    Optional<SoQuyThuChi> existing = soQuyThuChiRepository.findByMaPhieu(voucherCode);

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

    LoaiThuChi type = requireCashType("CHI_NHAP_HANG", LoaiPhieuThuChi.CHI);

    SoQuyThuChi voucher =
        SoQuyThuChi.builder()
            .maPhieu(voucherCode)
            .loaiPhieu(LoaiPhieuThuChi.CHI)
            .loaiThuChi(type)
            .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.NHA_CUNG_CAP)
            .tenNguoiNopNhan(order.getNhaCungCap().getTenNhaCungCap())
            .maChungTuThamChieu(order.getMaDonNhap())
            .soTien(request.getSoTienThanhToan())
            .phuongThucThanhToan(request.getPhuongThucThanhToan().trim())
            .moTa(request.getGhiChu())
            .ngayGhiNhan(request.getNgayThanhToan().toLocalDateTime())
            .nguoiTao(currentUser())
            .nguonTao(NguonTaoPhieuThuChi.TU_DONG)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build();

    voucher = soQuyThuChiRepository.save(voucher);

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

    if (order.getTrangThaiNhap() != TrangThaiNhapHang.DA_DUYET) {

      throw new AppException(ErrorCode.CONFLICT, "Chỉ đơn đã duyệt mới được nhập kho");
    }

    KhoHang warehouse = requireDefaultWarehouse(request.getKhoHangId());

    List<ChiTietDonNhap> details = chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(id);

    Map<Long, ChiTietDonNhap> detailMap =
        details.stream().collect(Collectors.toMap(ChiTietDonNhap::getId, Function.identity()));

    validateReceiveRequest(request, details, detailMap);

    Set<String> allSerials = collectAndValidateSerials(request, detailMap);

    if (!allSerials.isEmpty() && soSerialSanPhamRepository.existsBySoSerialIn(allSerials)) {

      throw new AppException(ErrorCode.CONFLICT, "Có Serial đã tồn tại trong hệ thống");
    }

    List<AdminPurchaseOrderReceiveResponse.Item> responseItems = new ArrayList<>();

    for (AdminPurchaseOrderReceiveRequest.Item item : request.getItems()) {

      ChiTietDonNhap detail = detailMap.get(item.getChiTietDonNhapId());

      PhienBanSanPham variant = detail.getPhienBan();

      SerialMode existingMode = resolveSerialMode(variant.getId());

      if (existingMode.established()
          && !Objects.equals(existingMode.value(), item.getQuanLySerial())) {

        throw new AppException(
            ErrorCode.CONFLICT,
            "Không được thay đổi chế độ " + "quản lý Serial của phiên bản " + variant.getId());
      }

      TonKho inventory = lockOrCreateInventory(warehouse, variant);

      inventory.setTonThucTe(inventory.getTonThucTe() + item.getSoLuongNhapKho());

      inventory.setTonCoTheBan(inventory.getTonCoTheBan() + item.getSoLuongNhapKho());

      inventory = tonKhoRepository.save(inventory);

      TheKho warehouseCard =
          TheKho.builder()
              .khoHang(warehouse)
              .phienBan(variant)
              .loaiGiaoDich(LoaiGiaoDichKho.NHAP_HANG)
              .maChungTuGoc(order.getId())
              .soLuongThayDoi(item.getSoLuongNhapKho())
              .tonCuoi(inventory.getTonThucTe())
              .ghiChu("Nhập hàng từ đơn " + order.getMaDonNhap())
              .build();

      theKhoRepository.save(warehouseCard);

      List<AdminPurchaseOrderReceiveResponse.SerialData> serialResponses = new ArrayList<>();

      if (Boolean.TRUE.equals(item.getQuanLySerial())) {

        List<SoSerialSanPham> serialEntities =
            item.getSoSerials().stream()
                .map(String::trim)
                .map(
                    serial ->
                        SoSerialSanPham.builder()
                            .phienBan(variant)
                            .soSerial(serial)
                            .trangThai(TrangThaiSerial.TRONG_KHO)
                            .build())
                .toList();

        List<SoSerialSanPham> saved = soSerialSanPhamRepository.saveAll(serialEntities);

        serialResponses =
            saved.stream()
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
              .soLuongNhapKho(item.getSoLuongNhapKho())
              .quanLySerial(item.getQuanLySerial())
              .cheDoSerialDaXacLap(true)
              .tonThucTeSauNhap(inventory.getTonThucTe())
              .serials(serialResponses)
              .build());
    }

    order.setTrangThaiNhap(TrangThaiNhapHang.DA_NHAP_KHO);

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

  @Transactional
  public AdminPurchaseOrderReturnResponse returnToSupplier(
      Long id, AdminPurchaseOrderReturnRequest request) {

    DonNhapHang order = requireOrderForUpdate(id);

    boolean allowedReturnStatus =
        order.getTrangThaiNhap() == TrangThaiNhapHang.DA_NHAP_KHO
            || order.getTrangThaiNhap() == TrangThaiNhapHang.HOAN_TRA_MOT_PHAN;

    if (!allowedReturnStatus) {
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
       * MVP hiện tại:
       * chưa hỗ trợ xuất trả NCC đối với hàng quản lý Serial.
       */
      SerialMode mode = resolveSerialMode(variantId);

      if (Boolean.TRUE.equals(mode.value())) {
        throw new AppException(
            ErrorCode.CONFLICT, "MVP chưa hỗ trợ trả NCC đối với hàng quản lý Serial");
      }

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

      int remainingReturnable = imported - alreadyReturned;

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

        throw new AppException(ErrorCode.CONFLICT, "Tồn thực tế không đủ để trả NCC");
      }

      if (inventory.getTonCoTheBan() < normalReturn) {

        throw new AppException(ErrorCode.CONFLICT, "Tồn có thể bán không đủ để trả NCC");
      }

      if (inventory.getHangLoi() < item.getSoLuongLoi()) {

        throw new AppException(ErrorCode.CONFLICT, "Số lượng hàng lỗi trong kho không đủ");
      }

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

                  int totalReturned = Math.abs(sumMovement(id, variantId, LoaiGiaoDichKho.TRA_NCC));

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
    BigDecimal adjustedTotal =
        order.getTongTien().subtract(cumulativeReturnValue).max(BigDecimal.ZERO);

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

      LoaiThuChi type = requireCashType("THU_HOAN_NCC", LoaiPhieuThuChi.THU);

      SoQuyThuChi voucher =
          SoQuyThuChi.builder()
              .maPhieu("THU-NCC-" + UUID.randomUUID())
              .loaiPhieu(LoaiPhieuThuChi.THU)
              .loaiThuChi(type)
              .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.NHA_CUNG_CAP)
              .tenNguoiNopNhan(order.getNhaCungCap().getTenNhaCungCap())
              .maChungTuThamChieu(order.getMaDonNhap())
              .soTien(refundDue)
              .phuongThucThanhToan(request.getPhuongThucHoan())
              .moTa(request.getGhiChu())
              .tags(
                  request.getMaGiaoDich() == null
                      ? null
                      : "MA_GIAO_DICH:" + request.getMaGiaoDich())
              .ngayGhiNhan(request.getNgayNhanTien().toLocalDateTime())
              .nguoiTao(currentUser())
              .nguonTao(NguonTaoPhieuThuChi.TU_DONG)
              .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
              .build();

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

    return donNhapHangRepository
        .findByIdForUpdate(id)
        .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn nhập không tồn tại"));
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

    BigDecimal amount =
        soQuyThuChiRepository.sumByPurchaseOrder(
            order.getMaDonNhap(), type, TrangThaiPhieuThuChi.DA_GHI_NHAN);

    return amount == null ? BigDecimal.ZERO : amount;
  }

  private BigDecimal calculateDebt(DonNhapHang order) {

    List<ChiTietDonNhap> details =
        chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(order.getId());

    BigDecimal returned = calculateReturnedValue(order, details);

    BigDecimal adjustedTotal = order.getTongTien().subtract(returned).max(BigDecimal.ZERO);

    BigDecimal netPaid =
        sumCash(order, LoaiPhieuThuChi.CHI).subtract(sumCash(order, LoaiPhieuThuChi.THU));

    return adjustedTotal.subtract(netPaid).max(BigDecimal.ZERO);
  }

  private BigDecimal calculateReturnedValue(DonNhapHang order, List<ChiTietDonNhap> details) {

    BigDecimal goodsReturned = BigDecimal.ZERO;

    for (ChiTietDonNhap detail : details) {

      int qty =
          Math.abs(
              sumMovement(order.getId(), detail.getPhienBan().getId(), LoaiGiaoDichKho.TRA_NCC));

      goodsReturned = goodsReturned.add(detail.getGiaNhap().multiply(BigDecimal.valueOf(qty)));
    }

    return applyTax(goodsReturned, order.getApDungThue());
  }

  private int sumMovement(Long orderId, Long variantId, LoaiGiaoDichKho type) {

    Integer value = theKhoRepository.sumMovement(orderId, variantId, type);

    return value == null ? 0 : value;
  }

  private SerialMode resolveSerialMode(Long variantId) {

    if (soSerialSanPhamRepository.countByPhienBanId(variantId) > 0) {

      return new SerialMode(true, true);
    }

    if (theKhoRepository.existsByPhienBanId(variantId)
        || tonKhoRepository.existsByPhienBanId(variantId)) {

      return new SerialMode(false, true);
    }

    return new SerialMode(null, false);
  }

  private void validateReceiveRequest(
      AdminPurchaseOrderReceiveRequest request,
      List<ChiTietDonNhap> details,
      Map<Long, ChiTietDonNhap> detailMap) {

    if (request.getItems().size() != details.size()) {

      throw new AppException(
          ErrorCode.INVALID_DATA, "MVP yêu cầu nhập đủ toàn bộ đơn " + "trong một lần");
    }

    Set<Long> seen = new HashSet<>();

    for (AdminPurchaseOrderReceiveRequest.Item item : request.getItems()) {

      if (!seen.add(item.getChiTietDonNhapId())) {

        throw new AppException(ErrorCode.INVALID_DATA, "Chi tiết đơn nhập bị trùng");
      }

      ChiTietDonNhap detail = detailMap.get(item.getChiTietDonNhapId());

      if (detail == null) {

        throw new AppException(ErrorCode.NOT_FOUND, "Chi tiết đơn nhập không tồn tại");
      }

      int orderedQuantity = detail.getSoLuong();

      int receivedQuantity = item.getSoLuongNhapKho();

      if (receivedQuantity < orderedQuantity) {

        throw new AppException(
            ErrorCode.CONFLICT,
            "Số lượng nhập kho bị thiếu. "
                + "Đã đặt "
                + orderedQuantity
                + ", nhưng request chỉ nhập "
                + receivedQuantity);
      }

      if (receivedQuantity > orderedQuantity) {

        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "Số lượng nhập kho vượt số lượng đã đặt. "
                + "Đã đặt "
                + orderedQuantity
                + ", nhưng request nhập "
                + receivedQuantity);
      }
    }
  }

  private Set<String> collectAndValidateSerials(
      AdminPurchaseOrderReceiveRequest request, Map<Long, ChiTietDonNhap> detailMap) {

    Set<String> globalSerials = new HashSet<>();

    for (AdminPurchaseOrderReceiveRequest.Item item : request.getItems()) {

      List<String> serials = item.getSoSerials();

      if (Boolean.TRUE.equals(item.getQuanLySerial())) {

        if (serials.size() != item.getSoLuongNhapKho()) {

          throw new AppException(
              ErrorCode.INVALID_DATA, "Số lượng Serial phải bằng " + "số lượng nhập kho");
        }

        for (String serial : serials) {

          if (serial == null || serial.isBlank()) {

            throw new AppException(ErrorCode.INVALID_DATA, "Serial không được để trống");
          }

          String normalized = serial.trim();

          if (!globalSerials.add(normalized)) {

            throw new AppException(ErrorCode.CONFLICT, "Serial bị trùng trong request");
          }
        }

      } else {

        if (!serials.isEmpty()) {

          throw new AppException(
              ErrorCode.INVALID_DATA,
              "Phiên bản không quản lý Serial " + "thì so_serials phải rỗng");
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
      return rows.getFirst();
    }

    return TonKho.builder()
        .khoHang(warehouse)
        .phienBan(variant)
        .tonThucTe(0)
        .tonCoTheBan(0)
        .hangLoi(0)
        .build();
  }

  private TonKho lockExistingInventory(KhoHang warehouse, PhienBanSanPham variant) {

    List<TonKho> rows = tonKhoRepository.findForSerialUpdate(warehouse.getId(), variant.getId());

    if (rows.isEmpty()) {

      throw new AppException(ErrorCode.CONFLICT, "Không tìm thấy tồn kho để hoàn trả");
    }

    if (rows.size() > 1) {

      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tồn kho bị trùng");
    }

    return rows.getFirst();
  }

  private LoaiThuChi requireCashType(String code, LoaiPhieuThuChi voucherType) {

    LoaiThuChi type =
        loaiThuChiRepository
            .findByMaLoaiAndTrangThai(code, TrangThaiCoBanEnum.HOAT_DONG)
            .orElseThrow(
                () -> new AppException(ErrorCode.NOT_FOUND, "Chưa cấu hình loại thu/chi " + code));

    if (type.getLoaiPhieu() != voucherType) {

      throw new AppException(ErrorCode.CONFLICT, "Cấu hình loại thu/chi không hợp lệ");
    }

    return type;
  }

  private void updatePaymentStatus(DonNhapHang order) {

    BigDecimal debt = calculateDebt(order);

    BigDecimal adjustedTotal =
        order
            .getTongTien()
            .subtract(
                calculateReturnedValue(
                    order, chiTietDonNhapRepository.findByDonNhapHangIdOrderByIdAsc(order.getId())))
            .max(BigDecimal.ZERO);

    BigDecimal netPaid =
        sumCash(order, LoaiPhieuThuChi.CHI).subtract(sumCash(order, LoaiPhieuThuChi.THU));

    if (adjustedTotal.compareTo(BigDecimal.ZERO) == 0 || netPaid.compareTo(adjustedTotal) >= 0) {

      order.setTrangThaiThanhToan(TrangThaiThanhToanNhap.DA_TRA);

    } else if (netPaid.compareTo(BigDecimal.ZERO) <= 0) {

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
}
