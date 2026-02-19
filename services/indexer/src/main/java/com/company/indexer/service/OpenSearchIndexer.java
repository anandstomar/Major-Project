package com.company.indexer.service;

import com.company.indexer.model.AnchorEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class OpenSearchIndexer {
    private final RestTemplate rest = new RestTemplate();

    @Value("${opensearch.url:http://localhost:9200}")
    private String opensearchUrl;

    public void index(AnchorEntity e) {
        String idxUrl = opensearchUrl + "/anchors/_doc/" + e.getRequestId();
        String body = String.format("{\"request_id\":\"%s\",\"merkle_root\":\"%s\",\"tx_hash\":\"%s\",\"block_number\":%s}",
                e.getRequestId(),
                e.getMerkleRoot(),
                e.getTxHash(),
                e.getBlockNumber() == null ? "null" : e.getBlockNumber().toString()
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> ent = new HttpEntity<>(body, headers);
        rest.exchange(idxUrl, HttpMethod.PUT, ent, String.class);
    }

    public java.util.List<java.util.Map<String, Object>> search(String queryTerm) {
        try {
            String searchUrl = opensearchUrl + "/anchors/_search";
            // Search across request_id, merkle_root, and tx_hash simultaneously
            String body = String.format("{\"query\": {\"multi_match\": {\"query\": \"%s\", \"fields\": [\"request_id\", \"merkle_root\", \"tx_hash\"]}}}", queryTerm);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> ent = new HttpEntity<>(body, headers);

            
            ResponseEntity<java.util.Map> response = rest.exchange(searchUrl, HttpMethod.POST, ent, java.util.Map.class);
            
            // Extract the actual hits from OpenSearch's deeply nested response
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> bodyMap = (java.util.Map<String, Object>) response.getBody();
            if (bodyMap != null && bodyMap.containsKey("hits")) {
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> hitsMap = (java.util.Map<String, Object>) bodyMap.get("hits");
                @SuppressWarnings("unchecked")
                java.util.List<java.util.Map<String, Object>> hitsList = (java.util.List<java.util.Map<String, Object>>) hitsMap.get("hits");
                
                // Clean up the data for the React frontend
                return hitsList.stream().map(hit -> {
                    @SuppressWarnings("unchecked")
                    java.util.Map<String, Object> source = (java.util.Map<String, Object>) hit.get("_source");
                    source.put("score", hit.get("_score"));
                    source.put("requestId", source.get("request_id")); // Map to frontend's expected camelCase key
                    return source;
                }).toList();
            }
        } catch (Exception ex) {
            System.err.println("OpenSearch query failed: " + ex.getMessage());
        }
        return java.util.List.of();
    }
}
