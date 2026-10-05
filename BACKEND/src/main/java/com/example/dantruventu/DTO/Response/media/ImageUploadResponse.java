// Response contract containing only safe Cloudinary asset metadata for the frontend.
package com.example.dantruventu.DTO.Response.media;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Public metadata returned after the backend has stored an image in Cloudinary. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageUploadResponse {

  private String url;

  @JsonProperty("public_id")
  private String publicId;
}
