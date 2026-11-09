package com.wellsfargo.nexuspay.dto;

import java.util.Map;

public class RiskAssessmentDto {
    private Double riskScore;
    private String riskLevel;
    private String modelVersion;
    private String decision;
    private Map<String, Double> featureImportance;
    private String piiMaskedAccount;
    private String complianceSummary;

    public RiskAssessmentDto() {}

    public RiskAssessmentDto(Double riskScore, String riskLevel, String modelVersion, String decision,
                             Map<String, Double> featureImportance, String piiMaskedAccount, String complianceSummary) {
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.modelVersion = modelVersion;
        this.decision = decision;
        this.featureImportance = featureImportance;
        this.piiMaskedAccount = piiMaskedAccount;
        this.complianceSummary = complianceSummary;
    }

    public Double getRiskScore() { return riskScore; }
    public String getRiskLevel() { return riskLevel; }
    public String getModelVersion() { return modelVersion; }
    public String getDecision() { return decision; }
    public Map<String, Double> getFeatureImportance() { return featureImportance; }
    public String getPiiMaskedAccount() { return piiMaskedAccount; }
    public String getComplianceSummary() { return complianceSummary; }
}
