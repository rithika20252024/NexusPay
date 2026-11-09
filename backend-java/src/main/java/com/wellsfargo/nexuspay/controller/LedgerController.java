package com.wellsfargo.nexuspay.controller;

import com.wellsfargo.nexuspay.domain.Account;
import com.wellsfargo.nexuspay.domain.LedgerEntry;
import com.wellsfargo.nexuspay.dto.AuditVerificationResponse;
import com.wellsfargo.nexuspay.service.DoubleEntryLedgerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class LedgerController {

    private final DoubleEntryLedgerService ledgerService;

    public LedgerController(DoubleEntryLedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    @GetMapping("/accounts")
    public ResponseEntity<Map<String, Object>> getAccounts() {
        List<Account> accounts = ledgerService.getAllAccounts();
        Map<String, Object> res = new HashMap<>();
        res.put("accounts", accounts);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/ledger/entries")
    public ResponseEntity<Map<String, Object>> getEntries() {
        List<LedgerEntry> entries = ledgerService.getRecentEntries();
        Map<String, Object> res = new HashMap<>();
        res.put("entries", entries);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/ledger/integrity")
    public ResponseEntity<AuditVerificationResponse> verifyIntegrity() {
        boolean valid = ledgerService.verifyLedgerIntegrity();
        int count = ledgerService.getRecentEntries().size();
        return ResponseEntity.ok(new AuditVerificationResponse(
                valid, count, valid ? "VERIFIED_TAMPER_PROOF" : "CORRUPTED",
                valid ? "Cryptographic SHA-256 block hash chain successfully verified across all entries."
                      : "Integrity check failed: Tampered ledger entry detected."
        ));
    }
}
