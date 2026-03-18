package com.xydb.backend.service;

import com.xydb.backend.model.Tag;
import com.xydb.backend.model.User;
import com.xydb.backend.repository.TagRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TagService {
    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    public List<Tag> listByUser(User user){
        return tagRepository.findByUserId(user.getId());
    }

    public Tag create(Tag tag){
        return tagRepository.save(tag);
    }
}
