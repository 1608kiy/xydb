package com.xydb.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "JWT_SECRET=01234567890123456789012345678901",
        "ringnote.bootstrap-admin.email=bootstrap-admin@example.test",
        "ringnote.bootstrap-admin.password=Admin#123456",
        "ringnote.bootstrap-admin.nickname=Bootstrap Admin"
})
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AdminFlowIntegrationTests {
    private static final String BOOTSTRAP_ADMIN_EMAIL = "bootstrap-admin@example.test";
    private static final String BOOTSTRAP_ADMIN_PASSWORD = "Admin#123456";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void unauthenticatedUserShouldNotAccessAdminApis() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void adminLoginAndAdminApisShouldWork() throws Exception {
        String adminToken = loginAndGetToken(BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD);

        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.email").value(BOOTSTRAP_ADMIN_EMAIL))
                .andExpect(jsonPath("$.data.admin").value(true));

        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void adminCanCreateAnotherAdminAndNewAdminCanAccessAdminApis() throws Exception {
        String unique = String.valueOf(System.currentTimeMillis());
        String adminEmail2 = "subadmin_" + unique + "@ringnote.local";
        String adminPassword2 = "Admin#123456";

        String adminToken = loginAndGetToken(BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD);
        mockMvc.perform(post("/api/admin/users/create-admin")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"nickname\":\"sub-admin\","
                                + "\"email\":\"" + adminEmail2 + "\","
                                + "\"password\":\"" + adminPassword2 + "\","
                                + "\"phone\":\"13800138009\""
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.email").value(adminEmail2))
                .andExpect(jsonPath("$.data.admin").value(true));

        String subAdminToken = loginAndGetToken(adminEmail2, adminPassword2);

        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer " + subAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.email").value(adminEmail2))
                .andExpect(jsonPath("$.data.admin").value(true));

        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + subAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void normalUserShouldNotAccessAdminApisAndAdminCanDeleteNormalUser() throws Exception {
        String unique = String.valueOf(System.currentTimeMillis());
        String email = "u" + unique + "@example.com";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"nickname\":\"normal\","
                                + "\"email\":\"" + email + "\","
                                + "\"password\":\"P@ssw0rd\","
                                + "\"phone\":\"13800138000\""
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        String normalToken = loginAndGetToken(email, "P@ssw0rd");

        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + normalToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"title\":\"t1\","
                                + "\"description\":\"to delete\""
                                + "}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/checkins")
                        .header("Authorization", "Bearer " + normalToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"type\":\"daily\","
                                + "\"note\":\"checkin\""
                                + "}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/tags")
                        .header("Authorization", "Bearer " + normalToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"name\":\"tag-a\","
                                + "\"color\":\"#22c55e\""
                                + "}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/pomodoros")
                        .header("Authorization", "Bearer " + normalToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"mode\":\"focus\","
                                + "\"plannedMinutes\":25,"
                                + "\"actualMinutes\":25,"
                                + "\"completed\":true"
                                + "}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + normalToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        String adminToken = loginAndGetToken(BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD);
        MvcResult listResult = mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn();

        JsonNode root = objectMapper.readTree(listResult.getResponse().getContentAsString());
        JsonNode users = root.path("data");
        Long userId = null;
        for (JsonNode user : users) {
            if (email.equals(user.path("email").asText())) {
                userId = user.path("id").asLong();
                break;
            }
        }
        assertThat(userId).isNotNull();

        mockMvc.perform(delete("/api/admin/users/{id}", userId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        String email2 = "u2_" + unique + "@example.com";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"nickname\":\"normal2\","
                                + "\"email\":\"" + email2 + "\","
                                + "\"password\":\"P@ssw0rd\","
                                + "\"phone\":\"13800138001\""
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        MvcResult listResult2 = mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn();

        JsonNode root2 = objectMapper.readTree(listResult2.getResponse().getContentAsString());
        JsonNode users2 = root2.path("data");
        Long userId2 = null;
        for (JsonNode user : users2) {
            if (email2.equals(user.path("email").asText())) {
                userId2 = user.path("id").asLong();
                break;
            }
        }
        assertThat(userId2).isNotNull();

        mockMvc.perform(post("/api/admin/users/batch-delete")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[" + userId2 + "]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.deleted").value(1));
    }

    @Test
    void legacyAdminShortcutShouldNotWorkAnymore() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin\",\"password\":\"admin\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void forgotPasswordEndpointShouldStayUnavailableUntilVerifiedFlowIsReady() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"newPassword\":\"Secret123!\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value(503));
    }

    private String loginAndGetToken(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"email\":\"" + email + "\","
                                + "\"password\":\"" + password + "\""
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        String token = root.path("data").path("token").asText();
        assertThat(token).isNotBlank();
        return token;
    }
}
