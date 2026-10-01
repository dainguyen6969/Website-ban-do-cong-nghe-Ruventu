// Configures Cloudinary exclusively inside the IntelliJ/Spring backend.
package com.example.dantruventu.Config;

import com.cloudinary.Cloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Provides the server-side Cloudinary client; credentials never pass through the frontend. */
@Configuration
public class CloudinaryConfig {

  @Bean
  public Cloudinary cloudinary(@Value("${cloudinary.url:}") String cloudinaryUrl) {
    // Keep non-upload APIs available in local environments that have not configured Cloudinary yet.
    return cloudinaryUrl == null || cloudinaryUrl.isBlank()
        ? new Cloudinary()
        : new Cloudinary(cloudinaryUrl);
  }
}
