package com.xydb.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "tasks")
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String status; // pending/completed

    private String priority; // high/medium/low

    @Column(columnDefinition = "TEXT")
    private String tags; // JSON array string

    private LocalDateTime dueAt;

    private LocalDateTime reminderAt;

    private Integer pomodoroPlan;

    private Integer pomodoroDone;

    private String listName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Transient
    private List<SubTask> subtasks;
}
