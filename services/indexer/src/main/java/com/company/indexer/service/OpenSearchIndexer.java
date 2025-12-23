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
}
