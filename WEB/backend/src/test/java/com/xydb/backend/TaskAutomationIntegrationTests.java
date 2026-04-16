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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "JWT_SECRET=01234567890123456789012345678901")
@AutoConfigureMockMvc
@ActiveProfiles("local")
class TaskAutomationIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void autoCreateShouldClassifyAndGenerateParallelSubtasks() throws Exception {
        String token = registerAndLogin();

        MvcResult result = mockMvc.perform(post("/api/tasks/auto-create")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"准备高数考试复习",
                                  "description":"整理公式；刷题训练；复盘错题",
                                  "autoClassify":true,
                                  "autoBreakdown":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.category").value("study"))
                .andExpect(jsonPath("$.data.categoryLabel").value("学习"))
                .andExpect(jsonPath("$.data.subtaskCount").value(3))
                .andExpect(jsonPath("$.data.task.subtasks.length()").value(3))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        JsonNode task = root.path("data").path("task");
        assertThat(task.path("tags").asText()).contains("study");
        assertThat(task.path("subtasks").get(0).path("title").asText()).startsWith("线程1");

        mockMvc.perform(get("/api/tasks")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].subtasks.length()").value(3));
    }

    @Test
    void autoPlanShouldRefreshExistingTaskAndKeepGeneratedSubtasks() throws Exception {
        String token = registerAndLogin();

        MvcResult createdResult = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"上线官网下载页",
                                  "description":"先准备素材"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn();

        Long taskId = objectMapper.readTree(createdResult.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asLong();

        mockMvc.perform(put("/api/tasks/{id}/subtasks", taskId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                [
                                  {"title":"线程1：先准备素材","completed":true}
                                ]
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        mockMvc.perform(post("/api/tasks/{id}/auto-plan", taskId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"上线官网下载页",
                                  "description":"准备素材；确认下载链路；联调发布；复核入口",
                                  "autoClassify":true,
                                  "autoBreakdown":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.category").value("work"))
                .andExpect(jsonPath("$.data.task.subtasks.length()").value(4))
                .andExpect(jsonPath("$.data.task.subtasks[0].completed").value(true))
                .andExpect(jsonPath("$.data.task.tags").value("[\"work\"]"));

        mockMvc.perform(get("/api/tasks/{id}", taskId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subtasks.length()").value(4))
                .andExpect(jsonPath("$.data.subtasks[0].completed").value(true));
    }

    private String registerAndLogin() throws Exception {
        String unique = String.valueOf(System.currentTimeMillis());
        String email = "task_auto_" + unique + "@example.com";
        String password = "P@ssw0rd";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nickname":"task-auto",
                                  "email":"%s",
                                  "password":"%s",
                                  "phone":"13800138008"
                                }
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email":"%s",
                                  "password":"%s"
                                }
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("token")
                .asText();
        assertThat(token).isNotBlank();
        return token;
    }
}
