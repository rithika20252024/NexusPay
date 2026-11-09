package com.wellsfargo.nexuspay;

import com.wellsfargo.nexuspay.domain.*;
import com.wellsfargo.nexuspay.repository.AccountRepository;
import com.wellsfargo.nexuspay.service.DoubleEntryLedgerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DoubleEntryLedgerTest {

    @Autowired
    private DoubleEntryLedgerService ledgerService;

    @Autowired
    private AccountRepository accountRepository;

    @BeforeEach
    void setUp() {
        Account cust = accountRepository.findById("acc_customer_primary").orElseGet(() ->
                accountRepository.save(new Account("acc_customer_primary", "Customer", AccountType.RETAIL_CHECKING, 1000000L, "USD")));
        cust.setBalanceCents(1000000L);
        accountRepository.save(cust);
    }

    @Test
    @DisplayName("Enforce Mathematical Double-Entry Invariant: Debits === Credits (Zero Balance Leakage)")
    void testDoubleEntryBalanceInvariant() {
        Account custBefore = accountRepository.findById("acc_customer_primary").orElseThrow();
        Account merchBefore = accountRepository.findById("acc_merchant_stripe").orElseThrow();
        Account feeBefore = accountRepository.findById("acc_stripe_fees").orElseThrow();

        long initialTotal = custBefore.getBalanceCents() + merchBefore.getBalanceCents() + feeBefore.getBalanceCents();

        // Transfer $50.00 (5,000 cents) with $1.75 fee (175 cents)
        List<LedgerEntry> entries = ledgerService.transfer(
                "tx_audit_test_001",
                "acc_customer_primary",
                "acc_merchant_stripe",
                "acc_stripe_fees",
                5000L,
                175L,
                "USD",
                "JUnit Integration Transfer"
        );

        assertNotNull(entries);
        assertEquals(3, entries.size(), "Must generate 3 balanced legs (Debit Customer, Credit Merchant, Credit Fee)");

        long debits = entries.stream().filter(e -> e.getDirection() == EntryDirection.DEBIT).mapToLong(LedgerEntry::getAmountCents).sum();
        long credits = entries.stream().filter(e -> e.getDirection() == EntryDirection.CREDIT).mapToLong(LedgerEntry::getAmountCents).sum();
        assertEquals(debits, credits, "Mathematical invariant violated: sum(Debits) != sum(Credits)");

        Account custAfter = accountRepository.findById("acc_customer_primary").orElseThrow();
        Account merchAfter = accountRepository.findById("acc_merchant_stripe").orElseThrow();
        Account feeAfter = accountRepository.findById("acc_stripe_fees").orElseThrow();

        long finalTotal = custAfter.getBalanceCents() + merchAfter.getBalanceCents() + feeAfter.getBalanceCents();
        assertEquals(initialTotal, finalTotal, "System total cents must remain strictly invariant");
    }

    @Test
    @DisplayName("Reject Overdraft Transfers Exceeding Available Liquidity")
    void testOverdraftRejection() {
        assertThrows(IllegalStateException.class, () -> {
            ledgerService.transfer(
                    "tx_overdraft",
                    "acc_customer_primary",
                    "acc_merchant_stripe",
                    null,
                    999999999L,
                    0L,
                    "USD",
                    "Overdraft attempt"
            );
        });
    }

    @Test
    @DisplayName("Verify Cryptographic SHA-256 Audit Blockchain Integrity")
    void testCryptographicAuditVerification() {
        boolean valid = ledgerService.verifyLedgerIntegrity();
        assertTrue(valid, "Cryptographic audit chain must verify tamper-proof");
    }
}
