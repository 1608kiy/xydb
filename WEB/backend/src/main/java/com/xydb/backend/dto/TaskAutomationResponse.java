package com.xydb.backend.dto;

import com.xydb.backend.model.Task;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskAutomationResponse {
    private Task task;
    private String category;
    private String categoryLabel;
    private int subtaskCount;
    private String message;
}
