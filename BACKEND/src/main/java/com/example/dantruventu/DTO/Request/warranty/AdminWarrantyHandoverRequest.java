package com.example.dantruventu.DTO.Request.warranty;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.*;

public class AdminWarrantyHandoverRequest {
  private final Map<String, Object> fields = new LinkedHashMap<>();

  @JsonAnySetter
  public void put(String key, Object value) {
    fields.put(key, value);
  }

  public Map<String, Object> fields() {
    return Collections.unmodifiableMap(fields);
  }
}
