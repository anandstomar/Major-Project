package com.company.indexer.web;

import com.company.indexer.model.AnchorEntity;
import com.company.indexer.repository.AnchorRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/anchors")
public class AnchorController {
    private final AnchorRepository repo;
    public AnchorController(AnchorRepository repo) { this.repo = repo; }

    @GetMapping("")
    public List<AnchorEntity> list() { return repo.findAll(); }

    @GetMapping("/{requestId}")
    public AnchorEntity byRequest(@PathVariable String requestId) {
        return repo.findByRequestId(requestId).orElseThrow(() -> new RuntimeException("not found"));
    }
}
