package com.xydb.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 64)
    private String newPassword;
}
