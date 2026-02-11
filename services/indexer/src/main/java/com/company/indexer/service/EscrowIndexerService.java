package com.company.indexer.service;

import com.company.indexer.dto.EscrowEventDto;
import com.company.indexer.model.EscrowEntity;
import com.company.indexer.repository.EscrowRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.action.index.IndexRequest;
import org.elasticsearch.action.support.WriteRequest;
import org.elasticsearch.xcontent.XContentType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class EscrowIndexerService {
    private final EscrowRepository repo;
    private final RestHighLevelClient es;
    private final ObjectMapper mapper = new ObjectMapper();

    public EscrowIndexerService(EscrowRepository repo, RestHighLevelClient es) {
        this.repo = repo;
        this.es = es;
    }

    @Transactional
    public void processEvent(EscrowEventDto dto, String rawJson) throws Exception {
        // idempotent write
        var existing = repo.findByEscrowId(dto.escrowId);
        if (existing.isPresent()) {
            // update some fields if necessary (e.g. event_type change)
            return;
        }

        EscrowEntity e = new EscrowEntity();
        e.setEscrowId(dto.escrowId);
        e.setInitializer(dto.initializer);
        e.setBeneficiary(dto.beneficiary);
        e.setArbiter(dto.arbiter);
        e.setAmount(dto.amount);
        e.setTxSig(dto.txSig);
        e.setEventType(dto.eventType);
        e.setCreatedAt(OffsetDateTime.now());
        e.setRawJson(rawJson);
        repo.save(e);

        // index into OpenSearch / ES
        Map<String, Object> doc = new HashMap<>();
        doc.put("escrow_id", dto.escrowId);
        doc.put("initializer", dto.initializer);
        doc.put("beneficiary", dto.beneficiary);
        doc.put("arbiter", dto.arbiter);
        doc.put("amount", dto.amount);
        doc.put("tx_sig", dto.txSig);
        doc.put("event_type", dto.eventType);
        doc.put("created_at", e.getCreatedAt().toString());

        IndexRequest r = new IndexRequest("escrow").id(dto.escrowId).source(mapper.writeValueAsString(doc), XContentType.JSON);
        r.setRefreshPolicy(WriteRequest.RefreshPolicy.WAIT_UNTIL);
        es.index(r, RequestOptions.DEFAULT);
    }
}
