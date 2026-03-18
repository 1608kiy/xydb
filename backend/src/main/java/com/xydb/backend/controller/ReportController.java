package com.xydb.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xydb.backend.model.PomodoroSession;
import com.xydb.backend.model.Task;
import com.xydb.backend.model.User;
import com.xydb.backend.repository.PomodoroRepository;
import com.xydb.backend.repository.TaskRepository;
import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final TaskRepository taskRepository;
    private final PomodoroRepository pomodoroRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ReportController(TaskRepository taskRepository, PomodoroRepository pomodoroRepository) {
        this.taskRepository = taskRepository;
        this.pomodoroRepository = pomodoroRepository;
    }

    // 概览（默认返回最近 7 天的汇总）
    @GetMapping("/overview")
    public ResponseEntity<Result<Object>> overview() {
        User user = getCurrentUser();
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(6); // 最近 7 天
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        List<Task> userTasks = taskRepository.findByUser(user);
        long completedTasks = userTasks.stream()
                .filter(t -> t.getStatus() != null && t.getStatus().equalsIgnoreCase("completed")
                        && t.getUpdatedAt() != null
                        && !t.getUpdatedAt().isBefore(start) && t.getUpdatedAt().isBefore(end))
                .count();

        List<PomodoroSession> sessions = pomodoroRepository.findByStartedAtBetween(start, end).stream()
                .filter(p -> p.getUser() != null && Objects.equals(p.getUser().getId(), user.getId()))
                .collect(Collectors.toList());

        int totalFocusMinutes = sessions.stream().filter(s -> s.getActualMinutes() != null)
                .mapToInt(PomodoroSession::getActualMinutes).sum();

        long totalPomodoros = sessions.stream().filter(s -> Boolean.TRUE.equals(s.getCompleted())).count();

        // 计算最长连续完成的番茄数（以 session 的 startedAt 排序，认为间隔 <=15 分钟视为连续）
        int maxContinuous = 0;
        sessions.sort(Comparator.comparing(PomodoroSession::getStartedAt));
        int currentSeq = 0;
        LocalDateTime prevEnd = null;
        for (PomodoroSession s : sessions) {
            if (!Boolean.TRUE.equals(s.getCompleted())) {
                currentSeq = 0; prevEnd = null; continue;
            }
            if (prevEnd == null) {
                currentSeq = 1;
            } else {
                long gap = ChronoUnit.MINUTES.between(prevEnd, s.getStartedAt());
                if (gap <= 15 && gap >= 0) currentSeq++; else currentSeq = 1;
            }
            prevEnd = s.getEndedAt();
            if (currentSeq > maxContinuous) maxContinuous = currentSeq;
        }

        // 简单计算效率分（启发式），范围 0-100
        int score = Math.min(100, (int) (totalPomodoros * 3 + totalFocusMinutes / 10 + completedTasks * 5));

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("completedTasks", completedTasks);
        overview.put("totalFocusMinutes", totalFocusMinutes);
        overview.put("totalPomodoros", totalPomodoros);
        overview.put("maxContinuousPomodoros", maxContinuous);
        overview.put("effectivenessScore", score);

        // 分类统计（尝试解析 Task.tags 字段作为 JSON 数组或逗号分隔）
        Map<String, Integer> categoryCount = new HashMap<>();
        for (Task t : userTasks) {
            String tags = t.getTags();
            if (tags == null) continue;
            try {
                if (tags.trim().startsWith("[")) {
                    List<String> arr = objectMapper.readValue(tags, List.class);
                    for (Object o : arr) categoryCount.merge(String.valueOf(o), 1, Integer::sum);
                } else {
                    String[] parts = tags.split(",");
                    for (String p : parts) if (!p.isBlank()) categoryCount.merge(p.trim(), 1, Integer::sum);
                }
            } catch (Exception ex) {
                // ignore parse errors
            }
        }
        List<Map<String, Object>> categoryStats = new ArrayList<>();
        for (Map.Entry<String, Integer> e : categoryCount.entrySet()) {
            Map<String, Object> m = new HashMap<>();
            m.put("name", e.getKey());
            m.put("value", e.getValue());
            categoryStats.add(m);
        }
        overview.put("categoryStats", categoryStats);

        return ResponseEntity.ok(Result.ok(overview));
    }

    // 日趋势（最近 7 天）
    @GetMapping("/daily-trend")
    public ResponseEntity<Result<Object>> dailyTrend() {
        User user = getCurrentUser();
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(6);
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        List<Task> userTasks = taskRepository.findByUser(user);
        List<PomodoroSession> sessions = pomodoroRepository.findByStartedAtBetween(start, end).stream()
                .filter(p -> p.getUser() != null && Objects.equals(p.getUser().getId(), user.getId()))
                .collect(Collectors.toList());

        List<String> days = new ArrayList<>();
        List<Integer> taskCounts = new ArrayList<>();
        List<Integer> focusMinutes = new ArrayList<>();

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM-dd");
        for (int i = 0; i < 7; i++) {
            LocalDate d = startDate.plusDays(i);
            LocalDateTime dayStart = d.atStartOfDay();
            LocalDateTime dayEnd = d.plusDays(1).atStartOfDay();
            String label = d.getDayOfWeek().toString();
            days.add(label);

            long completed = userTasks.stream().filter(t -> t.getStatus() != null && t.getStatus().equalsIgnoreCase("completed")
                    && t.getUpdatedAt() != null && !t.getUpdatedAt().isBefore(dayStart) && t.getUpdatedAt().isBefore(dayEnd)).count();
            taskCounts.add((int) completed);

            int minutes = sessions.stream().filter(s -> s.getStartedAt() != null && !s.getStartedAt().isBefore(dayStart) && s.getStartedAt().isBefore(dayEnd)
                    && s.getActualMinutes() != null).mapToInt(PomodoroSession::getActualMinutes).sum();
            focusMinutes.add(minutes);
        }

        // 热力图：每个 pomodoro 按 2 小时分段统计（0-2 -> idx 0），返回 [slot, dayIndex, value]
        List<List<Object>> heat = new ArrayList<>();
        for (PomodoroSession s : sessions) {
            if (s.getStartedAt() == null) continue;
            long dayIndex = ChronoUnit.DAYS.between(startDate, s.getStartedAt().toLocalDate());
            if (dayIndex < 0 || dayIndex >= 7) continue;
            int slot = s.getStartedAt().getHour() / 2;
            int value = (s.getActualMinutes() == null) ? 1 : Math.max(1, s.getActualMinutes() / 25);
            heat.add(Arrays.asList(slot, (int) dayIndex, value));
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("days", days);
        resp.put("taskCounts", taskCounts);
        resp.put("focusMinutes", focusMinutes);
        resp.put("heatmap", heat);

        return ResponseEntity.ok(Result.ok(resp));
    }

    @GetMapping("/task-category")
    public ResponseEntity<Result<Object>> taskCategory() {
        // 返回与 overview 中相同的 categoryStats
        User user = getCurrentUser();
        List<Task> userTasks = taskRepository.findByUser(user);
        Map<String, Integer> categoryCount = new HashMap<>();
        for (Task t : userTasks) {
            String tags = t.getTags();
            if (tags == null) continue;
            try {
                if (tags.trim().startsWith("[")) {
                    List<String> arr = objectMapper.readValue(tags, List.class);
                    for (Object o : arr) categoryCount.merge(String.valueOf(o), 1, Integer::sum);
                } else {
                    String[] parts = tags.split(",");
                    for (String p : parts) if (!p.isBlank()) categoryCount.merge(p.trim(), 1, Integer::sum);
                }
            } catch (Exception ex) {
            }
        }
        List<Map<String, Object>> categoryStats = new ArrayList<>();
        for (Map.Entry<String, Integer> e : categoryCount.entrySet()) {
            Map<String, Object> m = new HashMap<>();
            m.put("name", e.getKey());
            m.put("value", e.getValue());
            categoryStats.add(m);
        }
        Map<String, Object> out = new HashMap<>();
        out.put("categoryStats", categoryStats);
        return ResponseEntity.ok(Result.ok(out));
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) return (User) principal;
        return null;
    }
}
