package com.wellsfargo.nexuspay;

import com.wellsfargo.nexuspay.dto.RiskAssessmentDto;
import com.wellsfargo.nexuspay.service.ModelRiskManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ModelRiskManagementTest {

    private final ModelRiskManagementService mrmService = new ModelRiskManagementService();

    @Test
    @DisplayName("OCC SR 11-7 Compliance: Flag High-Risk Fraud Scenario with Explainable Weights")
    void testFraudModelDetectionAndExplainability() {
        RiskAssessmentDto risk = mrmService.assessTransactionRisk(500000L, "acc_customer_primary", "9999");

        assertNotNull(risk);
        assertTrue(risk.getRiskScore() >= 85.0, "Score should exceed critical threshold");
        assertEquals("CRITICAL", risk.getRiskLevel());
        assertEquals("DECLINE_FRAUD_RISK", risk.getDecision());
        assertNotNull(risk.getFeatureImportance().get("Card & Device Fingerprint"));
        assertTrue(risk.getPiiMaskedAccount().contains("****"), "Account must be PII masked");
    }

    @Test
    @DisplayName("Normal Low-Risk Legitimate Transaction Approval")
    void testLegitimateTransactionApproval() {
        RiskAssessmentDto risk = mrmService.assessTransactionRisk(2500L, "acc_customer_primary", "4242");

        assertNotNull(risk);
        assertTrue(risk.getRiskScore() < 35.0, "Score should be low for normal amounts");
        assertEquals("LOW", risk.getRiskLevel());
        assertEquals("APPROVE", risk.getDecision());
    }
}
