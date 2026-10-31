package com.example.dantruventu.DTO.Response.warranty;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.LinkedHashMap;

@JsonInclude(value = JsonInclude.Include.ALWAYS, content = JsonInclude.Include.ALWAYS)
public class AdminWarrantyHandoverResponse extends LinkedHashMap<String, Object> {}
