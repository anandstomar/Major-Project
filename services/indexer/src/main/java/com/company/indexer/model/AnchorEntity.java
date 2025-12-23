package com.company.indexer.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "anchors", uniqueConstraints = @UniqueConstraint(columnNames = {"request_id"}))
public class AnchorEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="request_id", nullable=false, unique=true)
    private String requestId;

    @Column(name="merkle_root")
    private String merkleRoot;

    @Column(name="tx_hash")
    private String txHash;

    @Column(name="block_number")
    private Long blockNumber;

    @Column(name="status")
    private String status;

    @Column(name="submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name="events", length=4000)
    private String eventsJson;

    @Column(name="submitter")
    private String submitter;

        public Long getId() { return id; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public String getMerkleRoot() { return merkleRoot; }
    public void setMerkleRoot(String merkleRoot) { this.merkleRoot = merkleRoot; }
    public String getTxHash() { return txHash; }
    public void setTxHash(String txHash) { this.txHash = txHash; }
    public Long getBlockNumber() { return blockNumber; }
    public void setBlockNumber(Long blockNumber) { this.blockNumber = blockNumber; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(OffsetDateTime submittedAt) { this.submittedAt = submittedAt; }
    public String getSubmitter() { return submitter; }
    public void setSubmitter(String submitter) { this.submitter = submitter; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getEventsJson() { return eventsJson; }
    public void setEventsJson(String eventsJson) { this.eventsJson = eventsJson; }
}
