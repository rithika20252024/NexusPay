package com.wellsfargo.nexuspay.controller;

import com.wellsfargo.nexuspay.dto.PaymentRequest;
import com.wellsfargo.nexuspay.dto.RiskAssessmentDto;
import com.wellsfargo.nexuspay.service.ModelRiskManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/mrm")
@CrossOrigin(origins = "*")
public class ModelRiskController {

    private final ModelRiskManagementService mrmService;

    public ModelRiskController(ModelRiskManagementService mrmService) {
        this.mrmService = mrmService;
    }

    @PostMapping("/assess")
    public ResponseEntity<RiskAssessmentDto> assessRisk(@RequestBody PaymentRequest req) {
        RiskAssessmentDto assessment = mrmService.assessTransactionRisk(
                req.getAmount_cents() != null ? req.getAmount_cents() : 5000L,
                req.getCustomer_id(),
                req.getCard_number()
        );
        return ResponseEntity.ok(assessment);
    }

    @GetMapping("/governance")
    public ResponseEntity<Map<String, Object>> getModelGovernance() {
        Map<String, Object> gov = new HashMap<>();
        gov.put("model_name", "NexusPay Enterprise Fraud Intelligence");
        gov.put("model_id", "MRM-FIN-FRAUD-v1.2");
        gov.put("governance_framework", "Federal Reserve / OCC SR 11-7 Supervisory Guidance on Model Risk Management");
        gov.put("validation_status", "VALIDATED_AND_APPROVED");
        gov.put("review_frequency", "Quarterly Model Drift Audit");
        gov.put("risk_thresholds", Map.of(
                "low_risk", "< 35.0",
                "medium_risk", "35.0 - 64.9",
                "high_risk", "65.0 - 84.9 (Step-up 3DS challenge)",
                "critical_risk", ">= 85.0 (Automatic block)"
        ));
        return ResponseEntity.ok(gov);
    }
}
