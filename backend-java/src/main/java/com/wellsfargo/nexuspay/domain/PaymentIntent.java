package com.wellsfargo.nexuspay.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "payment_intents")
public class PaymentIntent {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(nullable = false)
    private Long amountCents;

    @Column(nullable = false)
    private String currency = "USD";

    @Column(nullable = false)
    private String customerId;

    @Column(nullable = false)
    private String merchantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    private String idempotencyKey;

    @Column(nullable = false)
    private String stripePaymentId;

    private Double riskScore;

    private String failureReason;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public PaymentIntent() {}

    public PaymentIntent(String id, Long amountCents, String currency, String customerId, String merchantId,
                         PaymentStatus status, String idempotencyKey, String stripePaymentId, Double riskScore) {
        this.id = id;
        this.amountCents = amountCents;
        this.currency = currency;
        this.customerId = customerId;
        this.merchantId = merchantId;
        this.status = status;
        this.idempotencyKey = idempotencyKey;
        this.stripePaymentId = stripePaymentId;
        this.riskScore = riskScore;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getAmountCents() { return amountCents; }
    public void setAmountCents(Long amountCents) { this.amountCents = amountCents; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getMerchantId() { return merchantId; }
    public void setMerchantId(String merchantId) { this.merchantId = merchantId; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public String getStripePaymentId() { return stripePaymentId; }
    public void setStripePaymentId(String stripePaymentId) { this.stripePaymentId = stripePaymentId; }

    public Double getRiskScore() { return riskScore; }
    public void setRiskScore(Double riskScore) { this.riskScore = riskScore; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
