package com.xydb.backend.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JWTUtil {
    private final Key key;
    private final long expirationMillis;

    public JWTUtil(@Value("${jwt.secret:change_me}") String secret,
                   @Value("${jwt.expiration-days:7}") long days) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMillis = days * 24 * 60 * 60 * 1000L;
    }

    public String generateToken(String subject){
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMillis))
                .signWith(key)
                .compact();
    }

    public String getSubject(String token){
        try{
            return Jwts.parserBuilder().setSigningKey(key).build()
                    .parseClaimsJws(token).getBody().getSubject();
        }catch(Exception e){
            return null;
        }
    }

    public boolean validate(String token){
        try{
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        }catch(JwtException e){
            return false;
        }
    }
}
