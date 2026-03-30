package com.xydb.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nickname;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    private String password;

    private String phone;

    @Builder.Default
    private Integer level = 1;

    @Builder.Default
    private Integer exp = 0;

    @Builder.Default
    private Boolean admin = false;

    private String avatarUrl;

    private String securityPhone;

    private LocalDateTime passwordUpdatedAt;

    @Builder.Default
    private Boolean twoStepEnabled = false;

    @Builder.Default
    private Boolean wechatBound = false;

    private String wechatAccount;

    @Builder.Default
    private Boolean appleBound = false;

    private String appleAccount;

    @Builder.Default
    private Boolean googleBound = false;

    private String googleAccount;

    private LocalDateTime createdAt;
}
