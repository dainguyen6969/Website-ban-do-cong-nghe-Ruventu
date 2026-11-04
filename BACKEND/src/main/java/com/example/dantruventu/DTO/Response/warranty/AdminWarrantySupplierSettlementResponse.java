package com.example.dantruventu.DTO.Response.warranty;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.LinkedHashMap;

@JsonInclude(value = JsonInclude.Include.ALWAYS, content = JsonInclude.Include.ALWAYS)
public class AdminWarrantySupplierSettlementResponse extends LinkedHashMap<String, Object> {}
