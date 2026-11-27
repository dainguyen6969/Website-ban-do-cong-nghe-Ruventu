package com.example.dantruventu.Services.printing;

import java.util.List;

public record PrintDocument(
    String title,
    String number,
    List<Section> sections,
    List<String> notes,
    List<String> signatories,
    boolean cancelled) {
  public record Section(String title, List<String> headers, List<List<String>> rows) {}
}
