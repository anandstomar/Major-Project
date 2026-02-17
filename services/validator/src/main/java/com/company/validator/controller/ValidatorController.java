package com.company.validator.controller;

import com.company.validator.util.MerkleUtil;
import io.minio.MinioClient;
import io.minio.GetObjectArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/validator")
@CrossOrigin(origins = "*") // Allows your local React app to bypass CORS
public class ValidatorController {

    private final MinioClient minio;
    private final String bucket;

    public ValidatorController(MinioClient minio, @Value("${app.minio.bucket:ingest}") String bucket) {
        this.minio = minio;
        this.bucket = bucket;
    }

    // 1. Endpoint for the "Re-Verify" Button in the UI
    @PostMapping("/reverify")
    public ResponseEntity<?> reVerifyRoot(@RequestBody List<String> eventsJson) {
        try {
            // Re-run the mathematical Merkle Root generation
            List<String> leaves = new ArrayList<>();
            for (String event : eventsJson) {
                // Using your existing MerkleUtil logic to hash the raw events
                leaves.add(MerkleUtil.sha256Hex(event.getBytes()));
            }
            
            String computedRoot = "0x" + MerkleUtil.buildMerkleRoot(leaves);
            return ResponseEntity.ok(Map.of("computedMerkleRoot", computedRoot));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // 2. Endpoint to fetch Preview files from MinIO for the "Validator" UI Tab
    @GetMapping("/previews/{previewId}")
    public ResponseEntity<String> getPreview(@PathVariable String previewId) {
        try (InputStream is = minio.getObject(GetObjectArgs.builder()
                .bucket(bucket).object("previews/" + previewId + ".json").build())) {
            String content = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(content);
        } catch (Exception e) {
            return ResponseEntity.status(404).body("{\"error\": \"Preview not found\"}");
        }
    }
}