package com.xydb.backend.controller;

import com.xydb.backend.model.Tag;
import com.xydb.backend.service.TagService;
import com.xydb.backend.service.UserService;
import com.xydb.backend.util.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {
    private final TagService tagService;
    private final UserService userService;

    public TagController(TagService tagService, UserService userService) {
        this.tagService = tagService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<Result<List<Tag>>> list(){
        return userService.getCurrentUser()
                .map(u -> ResponseEntity.ok(Result.ok(tagService.listByUser(u))))
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }

    @PostMapping
    public ResponseEntity<Result<Tag>> create(@RequestBody Tag tag){
        return userService.getCurrentUser()
                .map(u -> {
                    tag.setUser(u);
                    Tag t = tagService.create(tag);
                    return ResponseEntity.ok(Result.ok(t));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Result.fail(401, "Unauthorized")));
    }
}
