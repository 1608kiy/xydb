package com.xydb.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xydb.backend.dto.TaskAutomationRequest;
import com.xydb.backend.model.SubTask;
import com.xydb.backend.model.Task;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
public class TaskAutomationService {
    private static final String LABEL_WORK = "\u5DE5\u4F5C";
    private static final String LABEL_STUDY = "\u5B66\u4E60";
    private static final String LABEL_LIFE = "\u751F\u6D3B";
    private static final String LABEL_HEALTH = "\u5065\u5EB7";

    private static final Map<String, String> CATEGORY_LABELS = Map.of(
            "work", LABEL_WORK,
            "study", LABEL_STUDY,
            "life", LABEL_LIFE,
            "health", LABEL_HEALTH
    );

    private static final Map<String, List<String>> CATEGORY_KEYWORDS = Map.of(
            "work", List.of("\u5DE5\u4F5C", "\u9879\u76EE", "\u4F1A\u8BAE", "\u4E0A\u7EBF", "\u9700\u6C42", "\u5BA2\u6237", "\u6C47\u62A5", "\u5F00\u53D1", "\u6D4B\u8BD5", "\u90E8\u7F72", "\u8BBE\u8BA1", "review", "meeting", "project", "launch", "deploy", "release", "client"),
            "study", List.of("\u5B66\u4E60", "\u590D\u4E60", "\u8003\u8BD5", "\u8BFE\u7A0B", "\u4F5C\u4E1A", "\u8BBA\u6587", "\u5237\u9898", "\u80CC\u5355\u8BCD", "\u7B14\u8BB0", "\u9605\u8BFB", "\u9AD8\u6570", "\u82F1\u8BED", "study", "exam", "course", "practice", "homework", "research"),
            "life", List.of("\u751F\u6D3B", "\u5BB6\u52A1", "\u8D2D\u7269", "\u51FA\u884C", "\u65C5\u884C", "\u6574\u7406", "\u6536\u7EB3", "\u670B\u53CB", "\u805A\u4F1A", "\u5BB6\u5EAD", "\u4E70\u83DC", "\u642C\u5BB6", "life", "travel", "shopping", "family"),
            "health", List.of("\u5065\u5EB7", "\u8FD0\u52A8", "\u5065\u8EAB", "\u8DD1\u6B65", "\u51CF\u8102", "\u4F53\u68C0", "\u7761\u7720", "\u996E\u98DF", "\u51A5\u60F3", "\u5EB7\u590D", "\u745C\u4F3D", "\u6563\u6B65", "health", "fitness", "run", "workout", "sleep", "diet")
    );

    private static final Map<String, List<String>> CATEGORY_TEMPLATES = Map.of(
            "work", List.of(
                    "\u7EBF\u7A0B1\uFF1A\u6F84\u6E05\u76EE\u6807\u4E0E\u4EA4\u4ED8\u6807\u51C6 - %s",
                    "\u7EBF\u7A0B2\uFF1A\u5E76\u884C\u51C6\u5907\u8D44\u6599\u4E0E\u8D44\u6E90 - %s",
                    "\u7EBF\u7A0B3\uFF1A\u63A8\u8FDB\u6838\u5FC3\u6267\u884C\u4E0E\u6C9F\u901A - %s",
                    "\u7EBF\u7A0B4\uFF1A\u590D\u6838\u7ED3\u679C\u5E76\u5B89\u6392\u6536\u5C3E - %s"
            ),
            "study", List.of(
                    "\u7EBF\u7A0B1\uFF1A\u68B3\u7406\u77E5\u8BC6\u70B9\u6846\u67B6 - %s",
                    "\u7EBF\u7A0B2\uFF1A\u5E76\u884C\u6536\u96C6\u8D44\u6599\u4E0E\u4F8B\u9898 - %s",
                    "\u7EBF\u7A0B3\uFF1A\u96C6\u4E2D\u7EC3\u4E60\u4E0E\u8F93\u51FA\u603B\u7ED3 - %s",
                    "\u7EBF\u7A0B4\uFF1A\u9519\u9898\u590D\u76D8\u5E76\u67E5\u6F0F\u8865\u7F3A - %s"
            ),
            "life", List.of(
                    "\u7EBF\u7A0B1\uFF1A\u6574\u7406\u5F85\u529E\u6E05\u5355\u4E0E\u987A\u5E8F - %s",
                    "\u7EBF\u7A0B2\uFF1A\u5E76\u884C\u51C6\u5907\u7269\u54C1\u4E0E\u4FE1\u606F - %s",
                    "\u7EBF\u7A0B3\uFF1A\u6267\u884C\u5173\u952E\u4E8B\u9879\u5E76\u786E\u8BA4\u8282\u70B9 - %s",
                    "\u7EBF\u7A0B4\uFF1A\u6536\u5C3E\u590D\u67E5\u5E76\u8BB0\u5F55\u7ED3\u679C - %s"
            ),
            "health", List.of(
                    "\u7EBF\u7A0B1\uFF1A\u786E\u8BA4\u5F53\u524D\u72B6\u6001\u4E0E\u76EE\u6807 - %s",
                    "\u7EBF\u7A0B2\uFF1A\u5E76\u884C\u5B89\u6392\u8FD0\u52A8\u4E0E\u996E\u98DF - %s",
                    "\u7EBF\u7A0B3\uFF1A\u6267\u884C\u5E76\u8BB0\u5F55\u5173\u952E\u6570\u636E - %s",
                    "\u7EBF\u7A0B4\uFF1A\u6062\u590D\u653E\u677E\u5E76\u603B\u7ED3\u53CD\u9988 - %s"
            )
    );

    private static final Pattern SPLIT_PATTERN = Pattern.compile("[\\n\\uFF1B;\\u3002.!?\\u3001]+");
    private static final Pattern THREAD_PREFIX_PATTERN = Pattern.compile("^\\u7EBF\\u7A0B\\d+[:\\uFF1A]\\s*");

    private final ObjectMapper objectMapper = new ObjectMapper();

    public AutomationResult automate(Task task, TaskAutomationRequest request, List<SubTask> existingSubtasks) {
        Task workingTask = task == null ? new Task() : task;
        applyRequest(workingTask, request);

        if (isBlank(workingTask.getTitle())) {
            throw new IllegalArgumentException("Task title is required");
        }

        workingTask.setTitle(workingTask.getTitle().trim());
        if (workingTask.getDescription() != null) {
            workingTask.setDescription(workingTask.getDescription().trim());
        }
        if (isBlank(workingTask.getStatus())) {
            workingTask.setStatus("pending");
        }
        if (isBlank(workingTask.getPriority())) {
            workingTask.setPriority("medium");
        }

        boolean autoClassify = request == null || request.getAutoClassify() == null || Boolean.TRUE.equals(request.getAutoClassify());
        boolean autoBreakdown = request == null || request.getAutoBreakdown() == null || Boolean.TRUE.equals(request.getAutoBreakdown());

        String category = autoClassify ? classify(workingTask) : normalizeCategoryKey(extractPrimaryTag(workingTask.getTags()));
        if (category == null) {
            category = classify(workingTask);
        }

        String categoryLabel = CATEGORY_LABELS.getOrDefault(category, LABEL_WORK);
        workingTask.setTags(toTagsJson(category));

        List<SubTask> subtasks = autoBreakdown
                ? buildParallelSubtasks(workingTask, category, existingSubtasks)
                : cloneSubtasks(existingSubtasks);

        String message = "\u5DF2\u81EA\u52A8\u5206\u7C7B\u4E3A\u3010" + categoryLabel + "\u3011";
        if (autoBreakdown) {
            message += "\uFF0C\u5E76\u751F\u6210 " + subtasks.size() + " \u4E2A\u5E76\u884C\u5B50\u4EFB\u52A1";
        }

        return new AutomationResult(workingTask, subtasks, category, categoryLabel, message);
    }

    private void applyRequest(Task task, TaskAutomationRequest request) {
        if (request == null) {
            return;
        }
        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getStatus() != null) task.setStatus(request.getStatus());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getTags() != null) task.setTags(request.getTags());
        if (request.getDueAt() != null) task.setDueAt(request.getDueAt());
        if (request.getReminderAt() != null) task.setReminderAt(request.getReminderAt());
        if (request.getPomodoroPlan() != null) task.setPomodoroPlan(request.getPomodoroPlan());
        if (request.getPomodoroDone() != null) task.setPomodoroDone(request.getPomodoroDone());
        if (request.getListName() != null) task.setListName(request.getListName());
    }

    private String classify(Task task) {
        String combined = (safe(task.getTitle()) + " " + safe(task.getDescription())).toLowerCase(Locale.ROOT);
        Map<String, Integer> scores = new LinkedHashMap<>();

        for (Map.Entry<String, List<String>> entry : CATEGORY_KEYWORDS.entrySet()) {
            int score = 0;
            for (String keyword : entry.getValue()) {
                if (combined.contains(keyword.toLowerCase(Locale.ROOT))) {
                    score++;
                }
            }
            scores.put(entry.getKey(), score);
        }

        String bestCategory = null;
        int bestScore = -1;
        for (Map.Entry<String, Integer> entry : scores.entrySet()) {
            if (entry.getValue() > bestScore) {
                bestCategory = entry.getKey();
                bestScore = entry.getValue();
            }
        }

        if (bestScore > 0) {
            return bestCategory;
        }

        String existing = normalizeCategoryKey(extractPrimaryTag(task.getTags()));
        return existing == null ? "work" : existing;
    }

    private List<SubTask> buildParallelSubtasks(Task task, String category, List<SubTask> existingSubtasks) {
        List<String> rawTitles = extractDescriptionHints(task.getDescription());
        if (rawTitles.size() < 3) {
            rawTitles = buildTemplateTitles(task.getTitle(), category);
        }

        Map<String, Boolean> completionByTitle = new LinkedHashMap<>();
        List<SubTask> existing = existingSubtasks == null ? List.of() : existingSubtasks;
        for (SubTask subTask : existing) {
            completionByTitle.put(normalizeSubtaskTitle(subTask == null ? null : subTask.getTitle()), Boolean.TRUE.equals(subTask == null ? null : subTask.getCompleted()));
        }

        List<SubTask> generated = new ArrayList<>();
        for (int i = 0; i < rawTitles.size(); i++) {
            String title = rawTitles.get(i);
            boolean completed = false;
            String normalized = normalizeSubtaskTitle(title);
            if (completionByTitle.containsKey(normalized)) {
                completed = Boolean.TRUE.equals(completionByTitle.get(normalized));
            } else if (i < existing.size()) {
                completed = Boolean.TRUE.equals(existing.get(i).getCompleted());
            }
            generated.add(SubTask.builder()
                    .title(title)
                    .completed(completed)
                    .build());
        }
        return generated;
    }

    private List<String> extractDescriptionHints(String description) {
        List<String> titles = new ArrayList<>();
        if (isBlank(description)) {
            return titles;
        }

        String[] pieces = SPLIT_PATTERN.split(description);
        int index = 1;
        for (String piece : pieces) {
            String cleaned = normalizeWhitespace(piece);
            if (cleaned.length() < 2) {
                continue;
            }
            titles.add("\u7EBF\u7A0B" + index + "\uFF1A" + cleaned);
            index++;
            if (titles.size() >= 4) {
                break;
            }
        }
        return titles;
    }

    private List<String> buildTemplateTitles(String taskTitle, String category) {
        String safeTitle = normalizeWhitespace(taskTitle);
        List<String> templates = CATEGORY_TEMPLATES.getOrDefault(category, CATEGORY_TEMPLATES.get("work"));
        List<String> titles = new ArrayList<>();
        for (String template : templates) {
            titles.add(String.format(template, safeTitle));
        }
        return titles;
    }

    private List<SubTask> cloneSubtasks(List<SubTask> subtasks) {
        List<SubTask> copies = new ArrayList<>();
        if (subtasks == null) {
            return copies;
        }

        for (SubTask subTask : subtasks) {
            if (subTask == null || isBlank(subTask.getTitle())) {
                continue;
            }
            copies.add(SubTask.builder()
                    .title(normalizeWhitespace(subTask.getTitle()))
                    .completed(Boolean.TRUE.equals(subTask.getCompleted()))
                    .build());
        }
        return copies;
    }

    private String extractPrimaryTag(String rawTags) {
        if (isBlank(rawTags)) {
            return null;
        }

        try {
            List<String> tags = objectMapper.readValue(rawTags, new TypeReference<List<String>>() {});
            if (!tags.isEmpty()) {
                return tags.get(0);
            }
        } catch (Exception ignored) {
        }

        String normalized = rawTags.trim();
        if (normalized.contains(",")) {
            normalized = normalized.split(",")[0];
        }
        if (normalized.contains("|")) {
            normalized = normalized.split("\\|")[0];
        }
        if (normalized.contains(";")) {
            normalized = normalized.split(";")[0];
        }
        return normalized.replace("[", "").replace("]", "").replace("\"", "").trim();
    }

    private String normalizeCategoryKey(String raw) {
        if (isBlank(raw)) {
            return null;
        }

        String value = raw.trim().toLowerCase(Locale.ROOT);
        if (Objects.equals(value, LABEL_WORK.toLowerCase(Locale.ROOT)) || Objects.equals(value, "work")) return "work";
        if (Objects.equals(value, LABEL_STUDY.toLowerCase(Locale.ROOT)) || Objects.equals(value, "study")) return "study";
        if (Objects.equals(value, LABEL_LIFE.toLowerCase(Locale.ROOT)) || Objects.equals(value, "life")) return "life";
        if (Objects.equals(value, LABEL_HEALTH.toLowerCase(Locale.ROOT)) || Objects.equals(value, "health")) return "health";
        return null;
    }

    private String toTagsJson(String category) {
        return "[\"" + category + "\"]";
    }

    private String normalizeSubtaskTitle(String title) {
        return THREAD_PREFIX_PATTERN.matcher(normalizeWhitespace(title)).replaceFirst("").toLowerCase(Locale.ROOT);
    }

    private String normalizeWhitespace(String value) {
        return safe(value).replaceAll("\\s+", " ").trim();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    public record AutomationResult(Task task, List<SubTask> subtasks, String category, String categoryLabel, String message) {
    }
}
