package com.xydb.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.nio.charset.StandardCharsets;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import com.xydb.backend.repository.UserRepository;
import com.xydb.backend.model.User;
import com.xydb.backend.service.AuthService;
import com.xydb.backend.util.JWTUtil;
import org.springframework.security.config.Customizer;

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
        // Keep local profile behavior close to non-local for better parity in tests.
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/api/admin/**").permitAll()
                .anyRequest().permitAll())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> writeJsonError(response, 401, "Unauthorized"))
                .accessDeniedHandler((request, response, accessDeniedException) -> writeJsonError(response, 403, "Forbidden")));

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
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, authoritiesFor(user));
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
                                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, authoritiesFor(user));
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

    private List<SimpleGrantedAuthority> authoritiesFor(User user) {
        if (user != null && (Boolean.TRUE.equals(user.getAdmin())
                || AuthService.ADMIN_EMAIL.equalsIgnoreCase(user.getEmail()))) {
            return List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_USER"));
        }
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    private void writeJsonError(HttpServletResponse response, int code, String message) throws IOException {
        response.setStatus(code);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"code\":" + code + ",\"message\":\"" + message + "\",\"data\":null}");
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

}
