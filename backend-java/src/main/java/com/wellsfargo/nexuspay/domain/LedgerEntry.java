package com.wellsfargo.nexuspay.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ledger_entries", indexes = {
    @Index(name = "idx_ledger_account_created", columnList = "accountId, createdAt DESC")
})
public class LedgerEntry {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(nullable = false)
    private String transactionId;

    @Column(nullable = false)
    private String accountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryDirection direction;

    @Column(nullable = false)
    private Long amountCents;

    @Column(nullable = false)
    private Long runningBalanceCents;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String blockHash;

    @Column(nullable = false)
    private String prevBlockHash;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public LedgerEntry() {}

    public LedgerEntry(String id, String transactionId, String accountId, EntryDirection direction,
                       Long amountCents, Long runningBalanceCents, String currency, String description,
                       String blockHash, String prevBlockHash) {
        this.id = id;
        this.transactionId = transactionId;
        this.accountId = accountId;
        this.direction = direction;
        this.amountCents = amountCents;
        this.runningBalanceCents = runningBalanceCents;
        this.currency = currency;
        this.description = description;
        this.blockHash = blockHash;
        this.prevBlockHash = prevBlockHash;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public EntryDirection getDirection() { return direction; }
    public void setDirection(EntryDirection direction) { this.direction = direction; }

    public Long getAmountCents() { return amountCents; }
    public void setAmountCents(Long amountCents) { this.amountCents = amountCents; }

    public Long getRunningBalanceCents() { return runningBalanceCents; }
    public void setRunningBalanceCents(Long runningBalanceCents) { this.runningBalanceCents = runningBalanceCents; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getBlockHash() { return blockHash; }
    public void setBlockHash(String blockHash) { this.blockHash = blockHash; }

    public String getPrevBlockHash() { return prevBlockHash; }
    public void setPrevBlockHash(String prevBlockHash) { this.prevBlockHash = prevBlockHash; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
