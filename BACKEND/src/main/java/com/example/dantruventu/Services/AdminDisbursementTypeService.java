package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptTypeCreateRequest;
import com.example.dantruventu.DTO.Request.cashbook.AdminReceiptTypeStatusRequest;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeListResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeResponse;
import com.example.dantruventu.DTO.Response.cashbook.AdminReceiptTypeStatusResponse;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminDisbursementTypeService {

  private final AdminReceiptTypeService sharedTypeService;

  public AdminReceiptTypeListResponse getDisbursementTypes(
      String keyword, String status, String page, String limit) {
    try {
      return sharedTypeService.getTypes(LoaiPhieuThuChi.CHI, keyword, status, page, limit);
    } catch (AppException exception) {
      if (exception.getErrorCode() == ErrorCode.INVALID_CUSTOMER_SEARCH_PARAM) {
        throw new AppException(ErrorCode.INVALID_DISBURSEMENT_TYPE_SEARCH);
      }
      throw exception;
    }
  }

  public AdminReceiptTypeResponse createDisbursementType(AdminReceiptTypeCreateRequest request) {
    return sharedTypeService.createType(LoaiPhieuThuChi.CHI, request);
  }

  public AdminReceiptTypeResponse getDisbursementTypeDetail(String id) {
    return sharedTypeService.getTypeDetail(
        id, LoaiPhieuThuChi.CHI, ErrorCode.DISBURSEMENT_TYPE_NOT_FOUND_OR_RECEIPT);
  }

  public AdminReceiptTypeStatusResponse updateDisbursementTypeStatus(
      String id, AdminReceiptTypeStatusRequest request) {
    return sharedTypeService.updateTypeStatus(
        id,
        request,
        LoaiPhieuThuChi.CHI,
        ErrorCode.INVALID_DISBURSEMENT_TYPE_STATUS,
        ErrorCode.DISBURSEMENT_TYPE_NOT_FOUND_OR_RECEIPT,
        "Không thể cập nhật trạng thái loại phiếu chi.");
  }
}
