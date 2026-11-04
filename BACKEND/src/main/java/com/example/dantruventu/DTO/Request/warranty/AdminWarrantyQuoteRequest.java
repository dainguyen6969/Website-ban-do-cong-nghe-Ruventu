package com.example.dantruventu.DTO.Request.warranty;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Retains unknown fields, including nulls, so the write allowlist cannot be bypassed. */
public class AdminWarrantyQuoteRequest {
  private final Map<String, Object> fields = new LinkedHashMap<>();

  @JsonAnySetter
  public void put(String field, Object value) {
    fields.put(field, value);
  }

  public Map<String, Object> fields() {
    return Collections.unmodifiableMap(fields);
  }
}
