package com.wellsfargo.nexuspay.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class PaymentRequest {

    @NotNull(message = "amount_cents is required")
    @Min(value = 1, message = "amount_cents must be strictly positive")
    private Long amount_cents;

    private String currency = "USD";
    private String customer_id = "acc_customer_primary";
    private String merchant_id = "acc_merchant_stripe";
    private String card_number = "4242";
    private String idempotency_key;

    public PaymentRequest() {}

    public Long getAmount_cents() { return amount_cents; }
    public void setAmount_cents(Long amount_cents) { this.amount_cents = amount_cents; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getCustomer_id() { return customer_id; }
    public void setCustomer_id(String customer_id) { this.customer_id = customer_id; }

    public String getMerchant_id() { return merchant_id; }
    public void setMerchant_id(String merchant_id) { this.merchant_id = merchant_id; }

    public String getCard_number() { return card_number; }
    public void setCard_number(String card_number) { this.card_number = card_number; }

    public String getIdempotency_key() { return idempotency_key; }
    public void setIdempotency_key(String idempotency_key) { this.idempotency_key = idempotency_key; }
}
