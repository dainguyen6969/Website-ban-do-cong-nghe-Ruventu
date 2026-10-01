package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.customer.CreateCustomerRequest;
import com.example.dantruventu.DTO.Request.customer.CustomerAddressRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.customer.CustomerDefaultAddressResponse;
import com.example.dantruventu.DTO.Response.customer.CustomerListItemResponse;
import com.example.dantruventu.DTO.Response.customer.CustomerListResponse;
import com.example.dantruventu.DTO.Response.customer.CustomerResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.SoDiaChi;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.SoDiaChiRepository;
import com.example.dantruventu.Repository.VaiTroRepository;
import com.example.dantruventu.Specification.CustomerSpecification;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

  private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);
  private static final String PHONE_REGEX = "^(0|\\+84)(3|5|7|8|9)[0-9]{8}$";
  private static final String EMAIL_REGEX = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";

  private final NguoiDungRepository nguoiDungRepository;
  private final SoDiaChiRepository soDiaChiRepository;
  private final VaiTroRepository vaiTroRepository;
  private final PasswordEncoder passwordEncoder;

  public CustomerListResponse getCustomers(
      String keyword, Integer trangThai, int page, int limit) {

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw new AppException(
          ErrorCode.INVALID_CUSTOMER_SEARCH_PARAM, "Trạng thái hoặc phân trang không hợp lệ.");
    }

    TrangThaiCoBanEnum status = null;
    if (trangThai != null) {
      if (trangThai != 0 && trangThai != 1) {
        throw new AppException(
            ErrorCode.INVALID_CUSTOMER_SEARCH_PARAM, "Trạng thái hoặc phân trang không hợp lệ.");
      }
      status = TrangThaiCoBanEnum.fromValue(trangThai.shortValue());
    }

    var specification = CustomerSpecification.build(keyword, status);
    var pageable =
        PageRequest.of(page, limit, Sort.by(Sort.Order.desc("ngayTao"), Sort.Order.desc("id")));

    Page<NguoiDung> userPage = nguoiDungRepository.findAll(specification, pageable);

    List<CustomerListItemResponse> items =
        userPage.getContent().stream().map(this::toListItemResponse).toList();

    long totalElements = userPage.getTotalElements();
    int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / limit);

    var pagination =
        PaginationResponse.builder()
            .page(userPage.getNumber())
            .limit(userPage.getSize())
            .totalElements(totalElements)
            .totalPages(totalPages)
            .build();

    return CustomerListResponse.builder().items(items).pagination(pagination).build();
  }

  public CustomerResponse getCustomerDetail(Long id) {
    if (id == null || id <= 0) {
      throw new AppException(ErrorCode.INVALID_ID, "ID không hợp lệ.");
    }

    NguoiDung customer =
        nguoiDungRepository
            .findByIdWithVaiTro(id)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.CUSTOMER_NOT_FOUND_OR_EMPLOYEE,
                        "Khách hàng không tồn tại hoặc ID thuộc nhân viên."));

    if (!isCustomerRole(customer.getVaiTro())) {
      throw new AppException(
          ErrorCode.CUSTOMER_NOT_FOUND_OR_EMPLOYEE,
          "Khách hàng không tồn tại hoặc ID thuộc nhân viên.");
    }

    SoDiaChi defaultAddress =
        soDiaChiRepository.findFirstByNguoiDungIdAndLaMacDinhTrue(id).orElse(null);

    OffsetDateTime ngayTao =
        customer.getNgayTao() != null
            ? customer.getNgayTao().atOffset(VIETNAM_OFFSET)
            : OffsetDateTime.now(VIETNAM_OFFSET);

    OffsetDateTime ngayCapNhat =
        customer.getNgayCapNhat() != null
            ? customer.getNgayCapNhat().atOffset(VIETNAM_OFFSET)
            : OffsetDateTime.now(VIETNAM_OFFSET);

    CustomerDefaultAddressResponse addressResponse = null;
    if (defaultAddress != null) {
      addressResponse =
          CustomerDefaultAddressResponse.builder()
              .id(defaultAddress.getId())
              .tenNguoiNhan(defaultAddress.getTenNguoiNhan())
              .soDienThoai(defaultAddress.getSoDienThoai())
              .tinhThanh(defaultAddress.getTinhThanh())
              .phuongXa(defaultAddress.getPhuongXa())
              .diaChiChiTiet(defaultAddress.getDiaChiChiTiet())
              .laMacDinh(true)
              .build();
    }

    return CustomerResponse.builder()
        .id(customer.getId())
        .hoTen(customer.getHoTen())
        .email(customer.getEmail())
        .soDienThoai(customer.getSoDienThoai())
        .trangThai(
            customer.getTrangThai() != null
                ? (int) customer.getTrangThai().getValue()
                : null)
        .ngayTao(ngayTao)
        .ngayCapNhat(ngayCapNhat)
        .diaChiMacDinh(addressResponse)
        .build();
  }

  @Transactional
  public CustomerResponse createCustomer(CreateCustomerRequest request) {

    if (request == null
        || request.getHoTen() == null
        || request.getHoTen().isBlank()
        || request.getSoDienThoai() == null
        || request.getSoDienThoai().isBlank()) {
      throw new AppException(
          ErrorCode.CUSTOMER_NAME_OR_PHONE_REQUIRED,
          "Vui lòng nhập Tên khách hàng và số điện thoại");
    }

    String rawPhone = request.getSoDienThoai().trim();
    if (!rawPhone.matches(PHONE_REGEX)) {
      throw new AppException(ErrorCode.INVALID_DATA, "Số điện thoại không đúng định dạng");
    }

    String normalizedPhone = rawPhone.startsWith("+84") ? "0" + rawPhone.substring(3) : rawPhone;

    String email = null;
    if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
      String trimmedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
      if (!trimmedEmail.matches(EMAIL_REGEX)) {
        throw new AppException(ErrorCode.INVALID_DATA, "Email không đúng định dạng");
      }
      email = trimmedEmail;
    }

    if (request.getDiaChi() != null) {
      CustomerAddressRequest addr = request.getDiaChi();
      if (addr.getTinhThanh() == null
          || addr.getTinhThanh().isBlank()
          || addr.getPhuongXa() == null
          || addr.getPhuongXa().isBlank()
          || addr.getDiaChiChiTiet() == null
          || addr.getDiaChiChiTiet().isBlank()) {
        throw new AppException(
            ErrorCode.INVALID_DATA,
            "Địa chỉ không hợp lệ: vui lòng điền đầy đủ tỉnh/thành, phường/xã và địa chỉ chi tiết");
      }
    }

    if (nguoiDungRepository.existsBySoDienThoai(normalizedPhone)
        || nguoiDungRepository.existsBySoDienThoai(rawPhone)
        || (email != null && nguoiDungRepository.existsByEmail(email))) {
      throw new AppException(
          ErrorCode.PHONE_OR_EMAIL_ALREADY_EXISTS,
          "Số điện thoại hoặc email này đã được đăng ký trên hệ thống");
    }

    VaiTro customerRole = getCustomerRole();

    NguoiDung customer =
        NguoiDung.builder()
            .hoTen(request.getHoTen().trim())
            .soDienThoai(normalizedPhone)
            .email(email)
            .matKhau(passwordEncoder.encode(normalizedPhone))
            .vaiTro(customerRole)
            .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
            .build();

    NguoiDung savedCustomer = nguoiDungRepository.saveAndFlush(customer);

    SoDiaChi savedAddress = null;
    if (request.getDiaChi() != null) {
      CustomerAddressRequest addr = request.getDiaChi();
      SoDiaChi address =
          SoDiaChi.builder()
              .nguoiDung(savedCustomer)
              .tenNguoiNhan(savedCustomer.getHoTen())
              .soDienThoai(savedCustomer.getSoDienThoai())
              .tinhThanh(addr.getTinhThanh().trim())
              .phuongXa(addr.getPhuongXa().trim())
              .diaChiChiTiet(addr.getDiaChiChiTiet().trim())
              .laMacDinh(true)
              .build();
      savedAddress = soDiaChiRepository.save(address);
    }

    OffsetDateTime ngayTao =
        savedCustomer.getNgayTao() != null
            ? savedCustomer.getNgayTao().atOffset(VIETNAM_OFFSET)
            : OffsetDateTime.now(VIETNAM_OFFSET);

    OffsetDateTime ngayCapNhat =
        savedCustomer.getNgayCapNhat() != null
            ? savedCustomer.getNgayCapNhat().atOffset(VIETNAM_OFFSET)
            : OffsetDateTime.now(VIETNAM_OFFSET);

    CustomerDefaultAddressResponse addressResponse = null;
    if (savedAddress != null) {
      addressResponse =
          CustomerDefaultAddressResponse.builder()
              .id(savedAddress.getId())
              .tenNguoiNhan(savedAddress.getTenNguoiNhan())
              .soDienThoai(savedAddress.getSoDienThoai())
              .tinhThanh(savedAddress.getTinhThanh())
              .phuongXa(savedAddress.getPhuongXa())
              .diaChiChiTiet(savedAddress.getDiaChiChiTiet())
              .laMacDinh(true)
              .build();
    }

    return CustomerResponse.builder()
        .id(savedCustomer.getId())
        .hoTen(savedCustomer.getHoTen())
        .email(savedCustomer.getEmail())
        .soDienThoai(savedCustomer.getSoDienThoai())
        .trangThai(
            savedCustomer.getTrangThai() != null
                ? (int) savedCustomer.getTrangThai().getValue()
                : 1)
        .ngayTao(ngayTao)
        .ngayCapNhat(ngayCapNhat)
        .diaChiMacDinh(addressResponse)
        .build();
  }

  private boolean isCustomerRole(VaiTro vaiTro) {
    if (vaiTro == null) {
      return false;
    }
    String roleName =
        vaiTro.getTenVaiTro() != null ? vaiTro.getTenVaiTro().toUpperCase(Locale.ROOT) : "";
    String roleDesc = vaiTro.getMoTa() != null ? vaiTro.getMoTa().toLowerCase(Locale.ROOT) : "";
    return "USER".equals(roleName)
        || "KHACH_HANG".equals(roleName)
        || "KHÁCH HÀNG".equalsIgnoreCase(vaiTro.getTenVaiTro())
        || "KHACH HANG".equalsIgnoreCase(vaiTro.getTenVaiTro())
        || roleDesc.contains("khách hàng")
        || roleDesc.contains("khach hang");
  }

  private VaiTro getCustomerRole() {
    List<VaiTro> roles = vaiTroRepository.findCustomerRoles();
    if (roles != null && !roles.isEmpty()) {
      return roles.get(0);
    }

    return vaiTroRepository
        .findByTenVaiTro("USER")
        .or(() -> vaiTroRepository.findByTenVaiTro("KHACH_HANG"))
        .orElseThrow(
            () ->
                new AppException(
                    ErrorCode.CUSTOMER_ROLE_NOT_CONFIGURED,
                    "Thiếu cấu hình vai trò Khách hàng hoặc lỗi lưu dữ liệu."));
  }

  private CustomerListItemResponse toListItemResponse(NguoiDung user) {
    return CustomerListItemResponse.builder()
        .id(user.getId())
        .hoTen(user.getHoTen())
        .email(user.getEmail())
        .soDienThoai(user.getSoDienThoai())
        .trangThai(user.getTrangThai() != null ? (int) user.getTrangThai().getValue() : null)
        .build();
  }
}
