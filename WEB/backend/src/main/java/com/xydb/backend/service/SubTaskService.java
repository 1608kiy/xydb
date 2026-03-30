package com.xydb.backend.service;

import com.xydb.backend.model.SubTask;
import com.xydb.backend.model.Task;
import com.xydb.backend.repository.SubTaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SubTaskService {
    private final SubTaskRepository subTaskRepository;

    public SubTaskService(SubTaskRepository subTaskRepository) {
        this.subTaskRepository = subTaskRepository;
    }

    public List<SubTask> listByTask(Long taskId){
        return subTaskRepository.findByTaskId(taskId);
    }

    public void replaceSubtasks(Task task, List<SubTask> subtasks){
        List<SubTask> exist = subTaskRepository.findByTaskId(task.getId());
        if(!exist.isEmpty()){
            subTaskRepository.deleteAll(exist);
        }
        for(SubTask s : subtasks){
            s.setTask(task);
        }
        subTaskRepository.saveAll(subtasks);
    }
}
