package com.example.dantruventu.Services.order.sales;

import static com.example.dantruventu.Services.order.sales.SalesSupport.conflict;
import static com.example.dantruventu.Services.order.sales.SalesSupport.inputMoney;
import static com.example.dantruventu.Services.order.sales.SalesSupport.quantity;
import static com.example.dantruventu.Services.order.sales.SalesSupport.text;

import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.order.AdminDeliveryResponse;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class OrderSaleSnapshotService {

  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;
  private final CatalogSupport catalog;
  private final OrderIntakePolicy intakePolicy;

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record LineSnapshot(
      @JsonProperty("phien_ban_snapshot") Integer version,
      @JsonProperty("ma_dong") String lineKey,
      @JsonProperty("phien_ban_id") Long variantId,
      @JsonProperty("so_luong") Integer quantity,
      @JsonProperty("ma_san_pham") String productCode,
      @JsonProperty("ten_san_pham") String productName,
      @JsonProperty("ten_phien_ban") String variantName,
      @JsonProperty("loai_san_pham") LoaiSanPham productType,
      @JsonProperty("quan_ly_serial") Boolean serialManaged,
      @JsonProperty("thoi_han_bao_hanh_thang") Integer warrantyMonths,
      @JsonProperty("ap_dung_vat") Boolean taxEnabled,
      @JsonProperty("che_do_gia") String taxMode,
      @JsonProperty("thue_vat") BigDecimal vatRate,
      @JsonProperty("thanh_phan") List<CatalogFields.ComboPart> parts) {}

  public record PurchasedLine(
      @JsonProperty("phien_ban_id") Long variantId, @JsonProperty("so_luong") Integer quantity) {}

  public record PromotionCondition(
      @JsonProperty("phien_ban_id") Long variantId,
      @JsonProperty("loai_ap_dung") LoaiApDungKhuyenMai role,
      @JsonProperty("so_luong") Integer quantity) {}

  public record PhysicalItem(
      Long variantId,
      int perUnit,
      int quantity,
      boolean serialManaged,
      Integer warrantyMonths,
      String productName,
      String variantName) {}

  @SuppressWarnings("unchecked")
  public void recordUnpaidCreationEvidence(DonHang order) {
    if (order.getLoaiDonHang() != com.example.dantruventu.Enum.LoaiDonHang.ONLINE
        || order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DUYET
        || order.getTrangThaiThanhToan()
            != com.example.dantruventu.Enum.TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {

      throw conflict("Chỉ ghi căn cứ chưa thu tiền khi tạo đơn Online chờ duyệt");
    }

    var orderLines =
        entityManager
            .createQuery(
                """
                                select c from ChiTietDonHang c
                                where c.donHang.id = :orderId
                                order by c.id
                                """,
                ChiTietDonHang.class)
            .setParameter("orderId", order.getId())
            .getResultList();

    if (orderLines.isEmpty()) {
      throw conflict("Đơn chưa có dòng hàng để ghi căn cứ tiền");
    }

    for (var line : orderLines) {
      requireSnapshot(line);

      Map<String, Object> snapshot =
          objectMapper.readValue(line.getCauHinhDaBan(), LinkedHashMap.class);

      snapshot.put(
          "can_cu_tien",
          Map.of(
              "phien_ban",
              1,
              "don_hang_id",
              order.getId(),
              "nguon",
              "TAO_DON_CHUA_THU_TIEN",
              "thuc_thu_khi_tao",
              0));

      line.setCauHinhDaBan(objectMapper.writeValueAsString(snapshot));
    }
  }

  public boolean hasUnpaidCreationEvidence(Long orderId) {
    var orderLines =
        entityManager
            .createQuery(
                """
                                select c from ChiTietDonHang c
                                where c.donHang.id = :orderId
                                order by c.id
                                """,
                ChiTietDonHang.class)
            .setParameter("orderId", orderId)
            .getResultList();

    if (orderLines.isEmpty()) {
      return false;
    }

    for (var line : orderLines) {
      try {
        var evidence = objectMapper.readTree(line.getCauHinhDaBan()).path("can_cu_tien");

        if (evidence.path("phien_ban").asInt(-1) != 1
            || evidence.path("don_hang_id").asLong(-1) != orderId.longValue()
            || !"TAO_DON_CHUA_THU_TIEN".equals(evidence.path("nguon").asString())
            || !evidence.path("thuc_thu_khi_tao").isNumber()
            || evidence.path("thuc_thu_khi_tao").decimalValue().signum() != 0) {
          return false;
        }
      } catch (RuntimeException exception) {
        return false;
      }
    }

    return true;
  }

  public LineSnapshot requireSnapshot(ChiTietDonHang line) {
    LineSnapshot snapshot = readLine(line);

    if (snapshot == null) {
      throw conflict(
          "Dòng đơn #"
              + line.getId()
              + " chưa có cấu hình đã chốt hợp lệ; cần xác minh dữ liệu cũ.");
    }

    return snapshot;
  }

  public Map<Long, PhysicalItem> physical(ChiTietDonHang line) {
    LineSnapshot snapshot = requireSnapshot(line);
    Map<Long, PhysicalItem> result = new TreeMap<>();

    if (snapshot.productType() == LoaiSanPham.DON) {
      if (snapshot.serialManaged() == null) {
        throw conflict("Bản chụp thiếu chế độ serial");
      }

      result.put(
          snapshot.variantId(),
          new PhysicalItem(
              snapshot.variantId(),
              1,
              quantity(snapshot.quantity()),
              snapshot.serialManaged(),
              snapshot.warrantyMonths(),
              snapshot.productName(),
              snapshot.variantName()));

      return result;
    }

    if (snapshot.productType() != LoaiSanPham.BO_PC || snapshot.parts().isEmpty()) {
      throw conflict("Bản chụp combo không có thành phần hợp lệ");
    }

    for (var part : snapshot.parts()) {
      if (part.phienBanId() == null
          || part.soLuongTrongBo() == null
          || part.soLuongTrongBo() <= 0
          || part.soLuongTong() == null
          || part.coQuanLySerial() == null) {
        throw conflict("Bản chụp linh kiện combo thiếu dữ liệu");
      }

      int total = quantity((long) snapshot.quantity() * part.soLuongTrongBo());

      if (part.soLuongTong() != total) {
        throw conflict("Số lượng linh kiện trong bản chụp không khớp");
      }

      var previous =
          result.putIfAbsent(
              part.phienBanId(),
              new PhysicalItem(
                  part.phienBanId(),
                  part.soLuongTrongBo(),
                  total,
                  part.coQuanLySerial(),
                  part.thoiHanBaoHanhThang(),
                  part.tenSanPham(),
                  part.tenPhienBan()));

      if (previous != null) {
        throw conflict("Bản chụp có phiên bản linh kiện bị trùng");
      }
    }

    return result;
  }

  public List<ChiTietDonHang> saveLines(
      DonHang order, SalesCalculationService.Plan plan, AdminSalesRequest.Base request) {

    long existing =
        entityManager
            .createQuery(
                "select count(x) from ChiTietDonHang x where x.donHang.id = :id", Long.class)
            .setParameter("id", order.getId())
            .getSingleResult();

    if (existing != 0) {
      throw conflict("Đơn đã có dòng hàng; không được ghi thêm lần nữa");
    }

    Map<String, AdminSalesResponse.PreviewLine> prices = new LinkedHashMap<>();

    for (var priced : plan.data().getSanPham()) {
      if (prices.put(priced.maDong(), priced) != null) {
        throw conflict("Kết quả tính giá có ma_dong bị trùng");
      }
    }

    if (prices.size() != plan.lines().size()) {
      throw conflict("Số dòng tính giá không khớp");
    }

    var comboParts =
        catalog.comboParts(
            plan.lines().stream()
                .filter(line -> line.variant().getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC)
                .map(line -> line.variant().getSanPham().getId())
                .distinct()
                .toList());

    List<ChiTietDonHang> saved = new ArrayList<>();
    BigDecimal goods = BigDecimal.ZERO;
    BigDecimal discount = BigDecimal.ZERO;
    BigDecimal payable = BigDecimal.ZERO;

    for (var line : plan.lines()) {
      var priced = prices.get(line.key());

      if (priced == null
          || !Objects.equals(priced.phienBanId(), line.variant().getId())
          || !Objects.equals(priced.soLuong(), line.quantity())
          || priced.laQuaTang() != line.gift()
          || priced.donGia().compareTo(line.unitPrice()) != 0
          || priced.thanhTien().compareTo(line.amount()) != 0
          || priced.tienChietKhau().signum() < 0
          || priced.tienChietKhau().compareTo(line.amount()) > 0
          || priced.tienVat().signum() < 0
          || priced
                  .thanhToanDong()
                  .compareTo(line.amount().subtract(priced.tienChietKhau()).add(priced.tienVat()))
              != 0) {

        throw conflict("Dữ liệu tính giá của dòng " + line.key() + " không nhất quán");
      }

      if (line.gift() && (line.unitPrice().signum() != 0 || priced.thanhToanDong().signum() != 0)) {
        throw conflict("Dòng quà tặng phải có đơn giá và tiền phải trả bằng 0");
      }

      var variant = line.variant();
      var product = variant.getSanPham();

      List<CatalogFields.ComboPart> parts =
          product.getLoaiSanPham() == LoaiSanPham.BO_PC
              ? catalog.partsForQuantity(
                  comboParts.getOrDefault(product.getId(), List.of()), line.quantity())
              : List.of();

      if (product.getLoaiSanPham() == LoaiSanPham.BO_PC) {
        Map<Long, Integer> physical = new TreeMap<>();

        for (var part : parts) {
          if (part.phienBanId() == null || part.soLuongTong() == null) {
            throw conflict("Cấu hình combo thiếu phiên bản hoặc số lượng");
          }

          physical.merge(
              part.phienBanId(), quantity(part.soLuongTong()), (a, b) -> quantity((long) a + b));
        }

        if (parts.isEmpty() || !physical.equals(line.physical())) {
          throw conflict("Cấu hình combo thay đổi trong lúc chốt đơn");
        }
      }

      var snapshot =
          new LineSnapshot(
              1,
              line.key(),
              variant.getId(),
              line.quantity(),
              product.getMaSanPham(),
              product.getTenSanPham(),
              variant.getTenPhienBan(),
              product.getLoaiSanPham(),
              !priced.serialRequirements().isEmpty(),
              product.getLoaiSanPham() == LoaiSanPham.DON ? product.getThoiHanBaoHanhThang() : null,
              request.getThue().getApDung(),
              request.getThue().getCheDoGia(),
              priced.thueVat(),
              List.copyOf(parts));

      var entity =
          ChiTietDonHang.builder()
              .donHang(order)
              .phienBan(variant)
              .soLuong(line.quantity())
              .donGia(line.unitPrice())
              .thanhTien(line.amount())
              .laQuaTang(line.gift())
              .tienChietKhau(priced.tienChietKhau())
              .thanhToanDong(priced.thanhToanDong())
              .cauHinhDaBan(encode(snapshot))
              .build();

      entityManager.persist(entity);
      saved.add(entity);

      goods = goods.add(line.amount());
      discount = discount.add(priced.tienChietKhau());
      payable = payable.add(priced.thanhToanDong());
    }

    if (goods.compareTo(order.getTongTienHang()) != 0
        || discount.compareTo(order.getTienChietKhau()) != 0
        || payable.add(order.getPhiGiaoHang()).compareTo(order.getTongThanhToan()) != 0) {
      throw conflict("Tổng tiền dòng hàng không khớp tổng tiền đơn");
    }

    return List.copyOf(saved);
  }

  public void recordPromotion(
      DonHang order,
      SalesCalculationService.Plan plan,
      AdminSalesRequest.Base request,
      NguoiDung actor) {

    if (plan.promotion() == null) {
      if (plan.data().getTienChietKhau().signum() != 0) {
        throw conflict("Đơn có tiền giảm nhưng không xác định được khuyến mại");
      }
      return;
    }

    if (findUsage(order.getId()) != null) {
      throw conflict("Đơn đã có bản chụp khuyến mại");
    }

    KhuyenMai promotion =
        entityManager.find(
            KhuyenMai.class, plan.promotion().getId(), LockModeType.PESSIMISTIC_WRITE);

    if (promotion == null) {
      throw conflict("Khuyến mại không còn tồn tại");
    }

    entityManager.refresh(promotion);

    int used = usedCount(promotion);

    long held =
        entityManager
            .createQuery(
                """
                                select count(x) from KhuyenMaiDonHang x
                                where x.khuyenMai.id = :id
                                  and x.trangThaiApDung = :status
                                """,
                Long.class)
            .setParameter("id", promotion.getId())
            .setParameter("status", TrangThaiApDungKhuyenMai.GIU_CHO)
            .getSingleResult();

    long occupied = (long) used + held;
    Integer limit = promotion.getSoLuongApDung();

    if (occupied >= Integer.MAX_VALUE || (limit != null && occupied >= limit)) {
      throw conflict("Khuyến mại đã hết lượt; vui lòng tính lại đơn");
    }

    var details =
        entityManager
            .createQuery(
                """
                                select x from ChiTietKhuyenMai x
                                where x.khuyenMai.id = :id
                                order by x.id
                                """,
                ChiTietKhuyenMai.class)
            .setParameter("id", promotion.getId())
            .getResultList();

    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("phien_ban_snapshot", 1);
    snapshot.put("phien_ban_cau_hinh", promotion.getPhienBanCauHinh());
    snapshot.put("phuong_thuc_khuyen_mai", promotion.getPhuongThucKhuyenMai());
    snapshot.put("doi_tuong_khuyen_mai", promotion.getDoiTuongKhuyenMai());
    snapshot.put("loai_chiet_khau", promotion.getLoaiChietKhau());
    snapshot.put("gia_tri_khuyen_mai", promotion.getGiaTriKhuyenMai());
    snapshot.put("gia_tri_hang_toi_thieu", promotion.getGiaTriHangToiThieu());
    snapshot.put("so_luong_mua_toi_thieu", promotion.getSoLuongMuaToiThieu());
    snapshot.put("muc_giam_toi_da", promotion.getMucGiamToiDa());
    snapshot.put(
        "danh_muc_id", promotion.getDanhMuc() == null ? null : promotion.getDanhMuc().getId());
    snapshot.put(
        "thuong_hieu_id",
        promotion.getThuongHieu() == null ? null : promotion.getThuongHieu().getId());
    snapshot.put(
        "dieu_kien",
        details.stream()
            .map(
                item ->
                    new PromotionCondition(
                        item.getPhienBan().getId(), item.getLoaiApDung(), item.getSoLuong()))
            .toList());
    snapshot.put("yeu_cau_tai_chinh", financialInput(request));
    snapshot.put("san_pham", plan.data().getSanPham());
    snapshot.put("tong_tien_hang", plan.data().getTongTienHang());
    snapshot.put("tien_chiet_khau", plan.data().getTienChietKhau());
    snapshot.put("tong_tien_vat", plan.data().getTongTienVat());
    snapshot.put("phi_giao_hang", plan.data().getPhiGiaoHang());
    snapshot.put("tong_thanh_toan", plan.data().getTongThanhToan());

    boolean completed = order.getTrangThaiDonHang() == TrangThaiDonHang.HOAN_THANH;

    entityManager.persist(
        KhuyenMaiDonHang.builder()
            .donHang(order)
            .khuyenMai(promotion)
            .maChuongTrinh(promotion.getMaChuongTrinh())
            .tenChuongTrinh(promotion.getTenChuongTrinh())
            .soTienGiam(plan.data().getTienChietKhau())
            .trangThaiApDung(
                completed ? TrangThaiApDungKhuyenMai.DA_SU_DUNG : TrangThaiApDungKhuyenMai.GIU_CHO)
            .duLieuApDung(encode(snapshot))
            .nguoiThucHien(actor)
            .build());

    if (completed) {
      promotion.setSoLuongDaDung(used + 1);
    }

    entityManager.flush();
  }

  // Caller phải khóa đơn trước, rồi mới gọi phương thức này.
  public KhuyenMaiDonHang lockPromotionForOrder(Long orderId) {
    var usage = findUsage(orderId);
    if (usage == null) return null;

    var promotion =
        entityManager.find(
            KhuyenMai.class, usage.getKhuyenMai().getId(), LockModeType.PESSIMISTIC_WRITE);

    if (promotion == null) {
      throw conflict("Liên kết khuyến mại của đơn không hợp lệ");
    }

    entityManager.refresh(promotion);
    entityManager.refresh(usage, LockModeType.PESSIMISTIC_WRITE);
    return usage;
  }

  public void onOrderStateChanged(DonHang order) {
    boolean completed = order.getTrangThaiDonHang() == TrangThaiDonHang.HOAN_THANH;
    boolean cancelled = order.getTrangThaiDonHang() == TrangThaiDonHang.HUY_HANG;

    if (!completed && !cancelled) return;

    order.setHanGiuUuDai(null);
    order.setHanXuLy(null);

    var usage = lockPromotionForOrder(order.getId());

    // Đơn cũ chưa có bản chụp: không tự đoán chương trình hoặc sửa bộ đếm.
    if (usage == null) return;

    if (completed) {
      if (usage.getTrangThaiApDung() == TrangThaiApDungKhuyenMai.DA_SU_DUNG) {
        return;
      }

      if (usage.getTrangThaiApDung() != TrangThaiApDungKhuyenMai.GIU_CHO) {
        throw conflict("Lượt khuyến mại của đơn đã được giải phóng");
      }

      var promotion = usage.getKhuyenMai();
      int used = usedCount(promotion);

      if (used == Integer.MAX_VALUE) {
        throw conflict("Bộ đếm lượt khuyến mại vượt giới hạn");
      }

      // Không kiểm tra lại thời hạn/trạng thái chương trình đã chốt.
      promotion.setSoLuongDaDung(used + 1);
      usage.setTrangThaiApDung(TrangThaiApDungKhuyenMai.DA_SU_DUNG);

    } else if (usage.getTrangThaiApDung() == TrangThaiApDungKhuyenMai.GIU_CHO) {
      usage.setTrangThaiApDung(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG);
      usage.setLyDoGiaiPhong("Đơn hàng bị hủy: " + order.getMaDonHang());
    }

    entityManager.flush();
  }

  public void configureUnpaidPromotion(DonHang order) {
    var usage = lockPromotionForOrder(order.getId());

    if (usage == null) {
      order.setHanGiuUuDai(null);
      return;
    }

    if (order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {
      return;
    }

    if (Boolean.TRUE.equals(order.getDaGiuHang()) && order.getHanGiuHang() != null) {

      order.setHanGiuUuDai(intakePolicy.unpaidPromotionDeadline(order));
    } else {
      releaseUnpaidPromotion(
          order, "Đơn chưa được cấp giữ tạm; ưu đãi cần kiểm tra lại khi duyệt.");
    }

    entityManager.flush();
  }

  public void releaseUnpaidPromotion(DonHang order, String reason) {
    if (order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO
        || !Set.of(TrangThaiDonHang.CHO_DUYET, TrangThaiDonHang.CHO_HANG)
            .contains(order.getTrangThaiDonHang())) {

      throw conflict("Không được giải phóng ưu đãi theo luồng giữ tạm");
    }

    var usage = lockPromotionForOrder(order.getId());

    if (usage != null && usage.getTrangThaiApDung() == TrangThaiApDungKhuyenMai.GIU_CHO) {

      usage.setTrangThaiApDung(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG);
      usage.setLyDoGiaiPhong(reason);
    }

    order.setHanGiuUuDai(null);
  }

  /**
   * Trả null khi có thể tiếp tục. Trả thông báo khi cần đối soát; không tự thay giá hoặc quà của
   * đơn.
   */
  public String tryCommitPromotion(DonHang order) {
    var usage = lockPromotionForOrder(order.getId());

    if (usage == null) {
      order.setHanGiuUuDai(null);
      return null;
    }

    if (usage.getTrangThaiApDung() == TrangThaiApDungKhuyenMai.GIU_CHO) {
      order.setHanGiuUuDai(null);
      return null;
    }

    if (usage.getTrangThaiApDung() != TrangThaiApDungKhuyenMai.DA_GIAI_PHONG) {
      return "Trạng thái lượt khuyến mại cần đối soát.";
    }

    var promotion = usage.getKhuyenMai();
    var current = intakePolicy.now();
    var snapshot = parse(usage.getDuLieuApDung());
    var version = snapshot == null ? null : snapshot.get("phien_ban_cau_hinh");

    if (promotion.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || promotion.getNgayBatDau() == null
        || promotion.getNgayKetThuc() == null
        || current.isBefore(promotion.getNgayBatDau())
        || !current.isBefore(promotion.getNgayKetThuc())
        || version == null
        || !Objects.equals(version.asText(), String.valueOf(promotion.getPhienBanCauHinh()))) {

      return "Ưu đãi đã thay đổi hoặc hết hiệu lực; cần xác nhận lại với khách.";
    }

    long held =
        entityManager
            .createQuery(
                """
                                select count(x)
                                from KhuyenMaiDonHang x
                                where x.khuyenMai.id = :id
                                  and x.trangThaiApDung = :status
                                """,
                Long.class)
            .setParameter("id", promotion.getId())
            .setParameter("status", TrangThaiApDungKhuyenMai.GIU_CHO)
            .getSingleResult();

    long occupied = (long) usedCount(promotion) + held;
    Integer limit = promotion.getSoLuongApDung();

    if (occupied >= Integer.MAX_VALUE || (limit != null && occupied >= limit)) {
      return "Ưu đãi không còn lượt khả dụng; cần đối soát với khách.";
    }

    usage.setTrangThaiApDung(TrangThaiApDungKhuyenMai.GIU_CHO);
    usage.setLyDoGiaiPhong(null);
    order.setHanGiuUuDai(null);
    entityManager.flush();

    return null;
  }

  public boolean hasPromotion(Long orderId) {
    return findUsage(orderId) != null;
  }

  public void requireSameFinancialInput(DonHang order, AdminSalesRequest.Online request) {

    var usage = findUsage(order.getId());
    if (usage == null) return;

    JsonNode stored = parse(usage.getDuLieuApDung());
    JsonNode expected = stored == null ? null : stored.get("yeu_cau_tai_chinh");

    // Đọc lại JSON để chuẩn hóa kiểu số trước khi so sánh.
    JsonNode actual = parse(encode(financialInput(request)));

    String fulfillment =
        text(order.getDiaChiGiaoHang()) == null ? "NHAN_TAI_CUA_HANG" : "GIAO_HANG";

    if (expected == null
        || !expected.isObject()
        || !expected.equals(actual)
        || inputMoney(request.getTongThanhToanXacNhan()).compareTo(order.getTongThanhToan()) != 0
        || !Objects.equals(request.getPhuongThucThanhToan(), order.getPhuongThucThanhToan())
        || !Objects.equals(request.getHinhThucNhanHang(), fulfillment)) {

      throw conflict(
          "Đơn có khuyến mại chỉ được sửa thông tin người nhận và ghi chú; "
              + "không được thay sản phẩm, khách hàng hoặc dữ liệu thanh toán");
    }
  }

  public AdminSalesResponse.AppliedPromotion appliedPromotion(Long orderId) {
    var usage = findUsage(orderId);
    if (usage == null) return null;

    JsonNode data = parse(usage.getDuLieuApDung());

    String warning =
        data == null || !data.isObject() ? "Không đọc được bản chụp khuyến mại của đơn." : null;

    return new AdminSalesResponse.AppliedPromotion(
        usage.getId(),
        usage.getKhuyenMai().getId(),
        usage.getMaChuongTrinh(),
        usage.getTenChuongTrinh(),
        usage.getSoTienGiam(),
        usage.getTrangThaiApDung(),
        data,
        warning);
  }

  public AdminDeliveryResponse.ProductData product(ChiTietDonHang line) {
    var result = new AdminDeliveryResponse.ProductData();

    result.setChiTietDonHangId(line.getId());
    result.setPhienBanId(line.getPhienBan().getId());
    result.setSoLuong(line.getSoLuong());
    result.setDonGia(line.getDonGia());
    result.setThanhTien(line.getThanhTien());
    result.setLaQuaTang(line.getLaQuaTang());
    result.setTienChietKhau(line.getTienChietKhau());
    result.setThanhToanDong(line.getThanhToanDong());

    List<String> warnings = new ArrayList<>();
    LineSnapshot snapshot = readLine(line);

    if (snapshot == null) {
      warnings.add(
          "Dòng đơn cũ chưa có bản chụp hợp lệ; "
              + "chưa xác định được cấu hình và thông tin sản phẩm lúc bán.");
    } else {
      result.setMaDong(snapshot.lineKey());
      result.setMaSanPham(snapshot.productCode());
      result.setTenSanPham(snapshot.productName());
      result.setTenPhienBan(snapshot.variantName());
      result.setLoaiSanPham(snapshot.productType());
      result.setQuanLySerial(snapshot.serialManaged());
      result.setThueVat(snapshot.vatRate());

      // so_luong_tong đã được chốt theo số bộ bán. Không nhân lần nữa.
      result.setThanhPhan(snapshot.parts());
    }

    if (line.getThanhTien() == null
        || line.getTienChietKhau() == null
        || line.getThanhToanDong() == null) {
      warnings.add("Chưa có đủ dữ liệu tiền của dòng đơn cũ.");
    } else {
      BigDecimal vat =
          line.getThanhToanDong().subtract(line.getThanhTien()).add(line.getTienChietKhau());

      if (vat.signum() < 0
          || line.getTienChietKhau().signum() < 0
          || line.getTienChietKhau().compareTo(line.getThanhTien()) > 0) {
        warnings.add("Dữ liệu tiền đã lưu của dòng đơn không nhất quán.");
      } else {
        result.setTienVat(vat);
      }
    }

    result.setCanhBaoDuLieu(warnings.isEmpty() ? null : String.join(" ", warnings));

    return result;
  }

  public boolean hasReceivedBeforeHandover(DonHang order) {
    if (order == null
        || order.getId() == null
        || order.getLoaiDonHang() != LoaiDonHang.ONLINE
        || order.getTrangThaiDonHang() != TrangThaiDonHang.HUY_HANG
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_HOAN_KHO
        || order.getNgayHoanThanh() != null) {
      return false;
    }

    var documents =
        entityManager
            .createQuery(
                """
                                select p
                                from PhieuTraHang p
                                where p.donHang.id = :orderId
                                  and p.maTraHang = :code
                                """,
                PhieuTraHang.class)
            .setParameter("orderId", order.getId())
            .setParameter("code", "TH-HUY-DH-" + order.getId())
            .getResultList();

    if (documents.size() != 1) {
      return false;
    }

    var document = documents.get(0);

    if (document.getTrangThaiTraHang() != TrangThaiTraHang.HOAN_TAT
        || document.getTongTienHoan() == null
        || document.getTongTienHoan().signum() != 0
        || document.getNgayNhanHang() == null
        || document.getNgayKetThuc() == null) {
      return false;
    }

    var source = parse(document.getDuLieuNhanHang());

    return source != null
        && source.path("phien_ban").asInt(-1) == 1
        && "HUY_TRUOC_BAN_GIAO".equals(source.path("nguon").asString())
        && source.path("don_hang_id").asLong(-1) == order.getId().longValue()
        && source.path("phieu_tra_hang_id").asLong(-1) == document.getId().longValue()
        && source.path("xac_nhan_da_nhan_du_hang").asBoolean(false)
        && source.path("hang_nhan").isArray()
        && !source.path("hang_nhan").isEmpty()
        && source.path("bien_dong_kho").isArray()
        && !source.path("bien_dong_kho").isEmpty();
  }

  private LineSnapshot readLine(ChiTietDonHang line) {
    if (text(line.getCauHinhDaBan()) == null) return null;

    try {
      var snapshot = objectMapper.readValue(line.getCauHinhDaBan(), LineSnapshot.class);

      if (!Objects.equals(snapshot.version(), 1)
          || !Objects.equals(snapshot.variantId(), line.getPhienBan().getId())
          || !Objects.equals(snapshot.quantity(), line.getSoLuong())
          || snapshot.productType() == null
          || snapshot.parts() == null
          || text(snapshot.lineKey()) == null) {
        return null;
      }

      return snapshot;
    } catch (Exception exception) {
      return null;
    }
  }

  private Map<String, Object> financialInput(AdminSalesRequest.Base request) {
    Map<Long, Integer> quantities = new TreeMap<>();

    for (var line : request.getSanPham()) {
      quantities.merge(line.getPhienBanId(), line.getSoLuong(), (a, b) -> quantity((long) a + b));
    }

    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("ap_dung", request.getThue().getApDung());
    tax.put("che_do_gia", request.getThue().getCheDoGia());

    String code = text(request.getMaChuongTrinh());

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("khach_hang_id", request.getKhachHangId());
    result.put("kho_hang_id", request.getKhoHangId());
    result.put("bang_gia", request.getBangGia());
    result.put("thue", tax);
    result.put("ma_chuong_trinh", code == null ? null : code.toUpperCase(Locale.ROOT));
    result.put("phi_giao_hang", inputMoney(request.getPhiGiaoHang()));
    result.put(
        "san_pham",
        quantities.entrySet().stream()
            .map(entry -> new PurchasedLine(entry.getKey(), entry.getValue()))
            .toList());

    return result;
  }

  private KhuyenMaiDonHang findUsage(Long orderId) {
    var rows =
        entityManager
            .createQuery(
                "select x from KhuyenMaiDonHang x where x.donHang.id = :id", KhuyenMaiDonHang.class)
            .setParameter("id", orderId)
            .getResultList();

    if (rows.size() > 1) {
      throw conflict("Một đơn đang có nhiều bản ghi khuyến mại");
    }

    return rows.isEmpty() ? null : rows.get(0);
  }

  private int usedCount(KhuyenMai promotion) {
    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();

    if (used < 0) {
      throw conflict("Bộ đếm lượt khuyến mại không hợp lệ");
    }

    return used;
  }

  private String encode(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception exception) {
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không lưu được bản chụp đơn hàng");
    }
  }

  private JsonNode parse(String value) {
    if (text(value) == null) return null;

    try {
      return objectMapper.readTree(value);
    } catch (Exception exception) {
      return null;
    }
  }
}
