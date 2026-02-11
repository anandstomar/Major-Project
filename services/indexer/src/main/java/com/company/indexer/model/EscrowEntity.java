package com.company.indexer.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "escrow")
public class EscrowEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="escrow_id", nullable=false, unique=true)
    private String escrowId;

    private String initializer;
    private String beneficiary;
    private String arbiter;
    private Long amount;

    @Column(name="tx_sig")
    private String txSig;

    @Column(name="event_type")
    private String eventType;

    @Column(name="created_at")
    private OffsetDateTime createdAt;

    @Column(columnDefinition = "TEXT") // Changed from 'jsonb' to 'TEXT' for wider compatibility unless using Postgres specifically
    private String rawJson;

    // ==========================================
    //  GENERATED GETTERS AND SETTERS
    // ==========================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEscrowId() {
        return escrowId;
    }

    public void setEscrowId(String escrowId) {
        this.escrowId = escrowId;
    }

    public String getInitializer() {
        return initializer;
    }

    public void setInitializer(String initializer) {
        this.initializer = initializer;
    }

    public String getBeneficiary() {
        return beneficiary;
    }

    public void setBeneficiary(String beneficiary) {
        this.beneficiary = beneficiary;
    }

    public String getArbiter() {
        return arbiter;
    }

    public void setArbiter(String arbiter) {
        this.arbiter = arbiter;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getTxSig() {
        return txSig;
    }

    public void setTxSig(String txSig) {
        this.txSig = txSig;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getRawJson() {
        return rawJson;
    }

    public void setRawJson(String rawJson) {
        this.rawJson = rawJson;
    }
}