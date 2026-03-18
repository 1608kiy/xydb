package com.xydb.backend.controller;

import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @GetMapping("/overview")
    public ResponseEntity<Result<Object>> overview(){
        return ResponseEntity.ok(Result.ok(new Object()));
    }

    @GetMapping("/daily-trend")
    public ResponseEntity<Result<Object>> dailyTrend(){
        return ResponseEntity.ok(Result.ok(new Object()));
    }

    @GetMapping("/task-category")
    public ResponseEntity<Result<Object>> taskCategory(){
        return ResponseEntity.ok(Result.ok(new Object()));
    }
}
