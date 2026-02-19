package com.company.indexer.web;

import com.company.indexer.model.AnchorEntity;
import com.company.indexer.repository.AnchorRepository;
import com.company.indexer.service.*;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/indexer/api/anchors")
public class AnchorController {
    private final AnchorRepository repo;
    private final OpenSearchIndexer openSearchIndexer;
    public AnchorController(AnchorRepository repo, OpenSearchIndexer openSearchIndexer) {
        this.repo = repo;
        this.openSearchIndexer = openSearchIndexer;
    }

    @GetMapping("")
    public List<AnchorEntity> list() { return repo.findAll(); }

    @GetMapping("/{requestId}")
    public AnchorEntity byRequest(@PathVariable String requestId) {
        return repo.findByRequestId(requestId).orElseThrow(() -> new RuntimeException("not found"));
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchAnchors(@RequestParam("q") String query) {
        return ResponseEntity.ok(openSearchIndexer.search(query));
    }
}
