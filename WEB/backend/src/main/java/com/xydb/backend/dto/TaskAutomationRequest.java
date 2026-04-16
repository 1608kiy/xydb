package com.xydb.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TaskAutomationRequest {
    private String title;
    private String description;
    private String status;
    private String priority;
    private String tags;
    private LocalDateTime dueAt;
    private LocalDateTime reminderAt;
    private Integer pomodoroPlan;
    private Integer pomodoroDone;
    private String listName;
    private Boolean autoClassify;
    private Boolean autoBreakdown;
}
