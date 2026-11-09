package com.wellsfargo.nexuspay.domain;

public enum PaymentStatus {
    INITIATED,
    PROCESSING,
    SUCCEEDED,
    DECLINED,
    FRAUD_BLOCKED
}
