package com.xydb.backend.model;

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

    private String password;

    private String phone;

    @Builder.Default
    private Integer level = 1;

    @Builder.Default
    private Integer exp = 0;

    private String avatarUrl;

    private LocalDateTime createdAt;
}
