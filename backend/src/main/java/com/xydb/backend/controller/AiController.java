package com.xydb.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xydb.backend.service.UserService;
import com.xydb.backend.util.Result;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${ai.provider.base-url:https://dashscope.aliyuncs.com/compatible-mode/v1}")
    private String providerBaseUrl;

    @Value("${ai.provider.model:qwen2.5-vl-72b-instruct}")
    private String defaultModel;

    @Value("${ai.provider.api-token:}")
    private String providerApiToken;

    public AiController(UserService userService, ObjectMapper objectMapper) {
        this.userService = userService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    @PostMapping("/chat")
    public ResponseEntity<Result<Object>> chat(@RequestBody Map<String, Object> req) {
        Optional<?> currentUser = userService.getCurrentUser();
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(401).body(Result.fail(401, "Unauthorized"));
        }

        try {
            String token = String.valueOf(providerApiToken == null ? "" : providerApiToken).trim();
            if (token.isEmpty()) {
                return ResponseEntity.status(500).body(Result.fail(500, "AI token is not configured"));
            }

            Object messagesObj = req.get("messages");
            List<?> incomingMessages = (messagesObj instanceof List<?>) ? (List<?>) messagesObj : new ArrayList<>();
            if (incomingMessages.isEmpty()) {
                return ResponseEntity.badRequest().body(Result.fail(400, "messages 不能为空"));
            }

            Map<String, Object> providerReq = new LinkedHashMap<>();
            providerReq.put("model", pickModel(req.get("model")));
            providerReq.put("temperature", pickDouble(req.get("temperature"), 0.4));
            providerReq.put("max_tokens", pickInt(req.get("maxTokens"), 800));
            providerReq.put("messages", incomingMessages);

            String normalizedBase = String.valueOf(providerBaseUrl == null ? "" : providerBaseUrl).replaceAll("/+$", "");
            String endpoint = normalizedBase + "/chat/completions";

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(25))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(providerReq)))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();
            String responseBody = response.body() == null ? "" : response.body();

            if (statusCode < 200 || statusCode >= 300) {
                String providerError = extractProviderErrorMessage(responseBody);
                String msg = providerError == null || providerError.isBlank()
                    ? "AI 请求失败: " + statusCode
                    : providerError;
                return ResponseEntity.status(502).body(Result.fail(502, msg));
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            String content = contentNode.isMissingNode() || contentNode.isNull() ? "" : contentNode.asText("");
            if (content.isBlank()) {
                return ResponseEntity.status(502).body(Result.fail(502, "AI 返回内容为空"));
            }

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("content", content);
            data.put("model", root.path("model").asText(defaultModel));
            return ResponseEntity.ok(Result.ok(data));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(500).body(Result.fail(500, "AI 请求被中断"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Result.fail(500, "AI 请求异常: " + e.getMessage()));
        }
    }

    private String pickModel(Object modelObj) {
        String model = modelObj == null ? "" : String.valueOf(modelObj).trim();
        return model.isEmpty() ? defaultModel : model;
    }

    private double pickDouble(Object value, double fallback) {
        if (value == null) return fallback;
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception ex) {
            return fallback;
        }
    }

    private int pickInt(Object value, int fallback) {
        if (value == null) return fallback;
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ex) {
            return fallback;
        }
    }

    private String extractProviderErrorMessage(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody == null ? "" : responseBody);
            JsonNode errorMessage = root.path("error").path("message");
            if (!errorMessage.isMissingNode() && !errorMessage.isNull()) {
                String text = errorMessage.asText("");
                if (!text.isBlank()) return text;
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}