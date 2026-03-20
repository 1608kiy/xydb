package com.xydb.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.context.annotation.Bean;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import com.xydb.backend.repository.UserRepository;
import com.xydb.backend.model.User;
import com.xydb.backend.util.JWTUtil;

@Configuration
@Profile("local")
public class DevSecurityConfig {

    private final UserRepository userRepository;
    private final JWTUtil jwtUtil;

    public DevSecurityConfig(UserRepository userRepository, JWTUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @Bean
    public SecurityFilterChain devFilterChain(HttpSecurity http) throws Exception {
        // For local development only: disable CSRF and permit all requests.
        http.csrf().disable()
            .authorizeHttpRequests().anyRequest().permitAll();

        // Add a lightweight dev auth filter to map 'dev-' bearer tokens to a demo user
        http.addFilterBefore(devAuthFilter(), org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public OncePerRequestFilter devAuthFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
                String header = request.getHeader("Authorization");
                if (header != null && header.startsWith("Bearer ")) {
                    String token = header.substring(7);
                    if (token.startsWith("dev-")) {
                        try {
                            String devEmail = "dev@example.test";
                            User user = userRepository.findByEmail(devEmail).orElseGet(() -> {
                                User u = new User();
                                u.setEmail(devEmail);
                                u.setNickname("DevUser");
                                u.setCreatedAt(java.time.LocalDateTime.now());
                                return userRepository.save(u);
                            });
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, null);
                            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(auth);
                        } catch (Exception e) {
                            // ignore
                        }
                    } else if (jwtUtil.validate(token)) {
                        try {
                            String email = jwtUtil.getSubject(token);
                            User user = userRepository.findByEmail(email).orElse(null);
                            if (user != null) {
                                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, null);
                                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                                SecurityContextHolder.getContext().setAuthentication(auth);
                            }
                        } catch (Exception e) {
                            // ignore
                        }
                    }
                }
                filterChain.doFilter(request, response);
            }
        };
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

}
