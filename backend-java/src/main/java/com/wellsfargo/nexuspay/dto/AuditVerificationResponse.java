package com.wellsfargo.nexuspay.dto;

public class AuditVerificationResponse {
    private boolean isValid;
    private int checkedEntries;
    private String status;
    private String message;

    public AuditVerificationResponse() {}

    public AuditVerificationResponse(boolean isValid, int checkedEntries, String status, String message) {
        this.isValid = isValid;
        this.checkedEntries = checkedEntries;
        this.status = status;
        this.message = message;
    }

    public boolean isValid() { return isValid; }
    public int getCheckedEntries() { return checkedEntries; }
    public String getStatus() { return status; }
    public String getMessage() { return message; }
}
