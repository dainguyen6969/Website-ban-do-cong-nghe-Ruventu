package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminWarehouseListResponse;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.warehouse.TonKhoMapper;
import com.example.dantruventu.Repository.warehouse.KhoHangRepository;
import com.example.dantruventu.Specification.KhoHangSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminWarehouseService {

  private final KhoHangRepository khoHangRepository;
  private final TonKhoMapper tonKhoMapper;

  public AdminWarehouseListResponse getWarehouses(
      String keyword, Short trangThai, int page, int limit) {

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw new AppException(
          ErrorCode.INVALID_DATA, "Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }

    if (keyword != null && keyword.length() > 200) {
      throw new AppException(ErrorCode.INVALID_DATA, "Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    if (trangThai != null && trangThai != 0 && trangThai != 1) {
      throw new AppException(ErrorCode.INVALID_DATA, "Trạng thái chỉ nhận 0 hoặc 1");
    }

    TrangThaiCoBanEnum status = trangThai == null ? null : TrangThaiCoBanEnum.fromValue(trangThai);

    var specification = KhoHangSpecification.build(keyword, status);

    var pageable =
        PageRequest.of(page, limit, Sort.by("tenKho").ascending().and(Sort.by("id").ascending()));

    var result = khoHangRepository.findAll(specification, pageable);

    var items = result.getContent().stream().map(tonKhoMapper::toWarehouse).toList();

    var pagination =
        PaginationResponse.builder()
            .page(result.getNumber())
            .limit(result.getSize())
            .totalElements(result.getTotalElements())
            .totalPages(result.getTotalPages())
            .build();

    return AdminWarehouseListResponse.builder().items(items).pagination(pagination).build();
  }
}
