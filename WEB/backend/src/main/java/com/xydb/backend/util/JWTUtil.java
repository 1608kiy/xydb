package com.xydb.backend.util;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JWTUtil {
    private static final String FALLBACK_LOCAL_SECRET = "local-development-jwt-secret-please-change-2026";

    private final Key key;
    private final long expirationMillis;

    public JWTUtil(@Value("${jwt.secret:}") String secret,
                   @Value("${jwt.expiration-days:7}") long days,
                   Environment env) {
        String normalizedSecret = StringUtils.hasText(secret) ? secret.trim() : "";
        boolean localProfile = env.acceptsProfiles(Profiles.of("local"));
        boolean insecureDefault = !StringUtils.hasText(normalizedSecret)
                || "change_me".equals(normalizedSecret)
                || "change-me-before-production-min-32-bytes-key".equals(normalizedSecret);

        if (insecureDefault || normalizedSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            if (!localProfile) {
                throw new IllegalStateException("JWT_SECRET must be configured with a strong value before starting non-local environments");
            }
            normalizedSecret = FALLBACK_LOCAL_SECRET;
        }

        this.key = Keys.hmacShaKeyFor(normalizedSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = days * 24 * 60 * 60 * 1000L;
    }

    public String generateToken(String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMillis))
                .signWith(key)
                .compact();
    }

    public String getSubject(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(key).build()
                    .parseClaimsJws(token).getBody().getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    public boolean validate(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
