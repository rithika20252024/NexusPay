package com.wellsfargo.nexuspay.dto;

public class PaymentResponse {
    private String paymentId;
    private Long amountCents;
    private String currency;
    private String status;
    private Double riskScore;
    private String idempotencyStatus;
    private Double latencyMs;
    private String message;

    public PaymentResponse() {}

    public PaymentResponse(String paymentId, Long amountCents, String currency, String status,
                           Double riskScore, String idempotencyStatus, Double latencyMs, String message) {
        this.paymentId = paymentId;
        this.amountCents = amountCents;
        this.currency = currency;
        this.status = status;
        this.riskScore = riskScore;
        this.idempotencyStatus = idempotencyStatus;
        this.latencyMs = latencyMs;
        this.message = message;
    }

    public String getPaymentId() { return paymentId; }
    public Long getAmountCents() { return amountCents; }
    public String getCurrency() { return currency; }
    public String getStatus() { return status; }
    public Double getRiskScore() { return riskScore; }
    public String getIdempotencyStatus() { return idempotencyStatus; }
    public Double getLatencyMs() { return latencyMs; }
    public String getMessage() { return message; }
}
