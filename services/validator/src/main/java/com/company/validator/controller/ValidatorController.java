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
import io.minio.ListObjectsArgs;
import io.minio.Result;
import io.minio.messages.Item;
import com.fasterxml.jackson.databind.ObjectMapper;

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
    public ResponseEntity<?> reVerifyRoot(@RequestBody String rawEventsJson) {
        try {
            // Node.js anchor-service hashes the raw JSON string directly.
            // We must do the exact same thing to verify the signature!
            String computedRoot = "0x" + MerkleUtil.sha256Hex(rawEventsJson.getBytes(StandardCharsets.UTF_8));
            
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

    // 3. Endpoint for the "Merkle Tools" interactive tab
    @PostMapping("/merkle/compute")
    public ResponseEntity<?> computeMerkleTree(@RequestBody List<String> items) {
        try {
            // Here, we use the REAL Merkle Tree logic, not just a flat SHA-256 string hash!
            List<String> leaves = new ArrayList<>();
            for (String item : items) {
                leaves.add(MerkleUtil.sha256Hex(item.getBytes(StandardCharsets.UTF_8)));
            }
            String root = "0x" + MerkleUtil.buildMerkleRoot(leaves);
            return ResponseEntity.ok(Map.of("root", root, "leafCount", leaves.size()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // 4. Endpoint for the "Validation Runs" Dashboard
    @GetMapping("/runs")
    public ResponseEntity<?> getRecentRuns() {
        try {
            List<Map<String, Object>> runs = new ArrayList<>();
            ObjectMapper mapper = new ObjectMapper();
            
            // List all generated preview batches from MinIO
            Iterable<Result<Item>> results = minio.listObjects(
                ListObjectsArgs.builder().bucket(bucket).prefix("previews/").build()
            );
            
            int count = 0;
            for (Result<Item> result : results) {
                if (count++ >= 50) break; // Limit to 50 for API performance
                Item item = result.get();
                
                // Fetch the actual JSON content for each run to populate the table
                try (InputStream is = minio.getObject(GetObjectArgs.builder().bucket(bucket).object(item.objectName()).build())) {
                    String content = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                    runs.add(mapper.readValue(content, Map.class));
                }
            }
            return ResponseEntity.ok(runs);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}