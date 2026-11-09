package com.wellsfargo.nexuspay.service;

import com.wellsfargo.nexuspay.domain.*;
import com.wellsfargo.nexuspay.repository.AccountRepository;
import com.wellsfargo.nexuspay.repository.LedgerEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

@Service
public class DoubleEntryLedgerService {

    private final AccountRepository accountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    public DoubleEntryLedgerService(AccountRepository accountRepository, LedgerEntryRepository ledgerEntryRepository) {
        this.accountRepository = accountRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    private String computeBlockHash(String prevHash, String id, String txId, String accountId,
                                    EntryDirection direction, Long amount, Long runningBalance) {
        try {
            String payload = prevHash + "|" + id + "|" + txId + "|" + accountId + "|" + direction + "|" + amount + "|" + runningBalance;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm missing", e);
        }
    }

    private String getLatestBlockHash() {
        return ledgerEntryRepository.findLatestBlockHash()
                .orElse("0000000000000000000000000000000000000000000000000000000000000000");
    }

    @Transactional
    public List<LedgerEntry> transfer(String transactionId, String sourceAccountId, String destinationAccountId,
                                      String feeAccountId, Long amountCents, Long feeCents, String currency, String description) {
        if (amountCents <= 0) {
            throw new IllegalArgumentException("Transfer amount must be strictly positive");
        }

        long actualFee = (feeCents != null) ? feeCents : 0L;
        long netDestination = amountCents - actualFee;

        Account src = accountRepository.findById(sourceAccountId)
                .orElseThrow(() -> new IllegalArgumentException("Source account " + sourceAccountId + " not found"));
        Account dst = accountRepository.findById(destinationAccountId)
                .orElseThrow(() -> new IllegalArgumentException("Destination account " + destinationAccountId + " not found"));

        Account feeAcc = null;
        if (actualFee > 0 && feeAccountId != null) {
            feeAcc = accountRepository.findById(feeAccountId)
                    .orElseThrow(() -> new IllegalArgumentException("Fee account " + feeAccountId + " not found"));
        }

        // Insufficient funds safeguard
        if (src.getType() == AccountType.RETAIL_CHECKING && src.getBalanceCents() < amountCents) {
            throw new IllegalStateException("Insufficient funds: balance " + src.getBalanceCents() + "c < " + amountCents + "c");
        }

        List<LedgerEntry> entries = new ArrayList<>();
        String prevHash = getLatestBlockHash();

        // 1. DEBIT source account
        long srcNewBalance = src.getBalanceCents() - amountCents;
        src.setBalanceCents(srcNewBalance);
        accountRepository.save(src);

        String srcEntryId = "leg_" + UUID.randomUUID().toString().substring(0, 12);
        String srcBlockHash = computeBlockHash(prevHash, srcEntryId, transactionId, src.getId(), EntryDirection.DEBIT, amountCents, srcNewBalance);
        LedgerEntry debitEntry = new LedgerEntry(srcEntryId, transactionId, src.getId(), EntryDirection.DEBIT,
                amountCents, srcNewBalance, currency, description + " (Debit)", srcBlockHash, prevHash);
        entries.add(ledgerEntryRepository.save(debitEntry));
        prevHash = srcBlockHash;

        // 2. CREDIT destination account
        long dstNewBalance = dst.getBalanceCents() + netDestination;
        dst.setBalanceCents(dstNewBalance);
        accountRepository.save(dst);

        String dstEntryId = "leg_" + UUID.randomUUID().toString().substring(0, 12);
        String dstBlockHash = computeBlockHash(prevHash, dstEntryId, transactionId, dst.getId(), EntryDirection.CREDIT, netDestination, dstNewBalance);
        LedgerEntry creditEntry = new LedgerEntry(dstEntryId, transactionId, dst.getId(), EntryDirection.CREDIT,
                netDestination, dstNewBalance, currency, description + " (Credit)", dstBlockHash, prevHash);
        entries.add(ledgerEntryRepository.save(creditEntry));
        prevHash = dstBlockHash;

        // 3. CREDIT interchange fee account if applicable
        if (actualFee > 0 && feeAcc != null) {
            long feeNewBalance = feeAcc.getBalanceCents() + actualFee;
            feeAcc.setBalanceCents(feeNewBalance);
            accountRepository.save(feeAcc);

            String feeEntryId = "leg_" + UUID.randomUUID().toString().substring(0, 12);
            String feeBlockHash = computeBlockHash(prevHash, feeEntryId, transactionId, feeAcc.getId(), EntryDirection.CREDIT, actualFee, feeNewBalance);
            LedgerEntry feeEntry = new LedgerEntry(feeEntryId, transactionId, feeAcc.getId(), EntryDirection.CREDIT,
                    actualFee, feeNewBalance, currency, "Interchange Fee for tx " + transactionId, feeBlockHash, prevHash);
            entries.add(ledgerEntryRepository.save(feeEntry));
        }

        // Verify Double-Entry Invariant: Sum(Debits) == Sum(Credits)
        long totalDebits = entries.stream().filter(e -> e.getDirection() == EntryDirection.DEBIT).mapToLong(LedgerEntry::getAmountCents).sum();
        long totalCredits = entries.stream().filter(e -> e.getDirection() == EntryDirection.CREDIT).mapToLong(LedgerEntry::getAmountCents).sum();

        if (totalDebits != totalCredits) {
            throw new IllegalStateException("CRITICAL DOUBLE-ENTRY VIOLATION: Debits (" + totalDebits + ") != Credits (" + totalCredits + ")");
        }

        return entries;
    }

    public boolean verifyLedgerIntegrity() {
        List<LedgerEntry> all = ledgerEntryRepository.findAllByOrderByCreatedAtAsc();
        String expectedPrev = "0000000000000000000000000000000000000000000000000000000000000000";

        for (int i = 0; i < all.size(); i++) {
            LedgerEntry e = all.get(i);
            if (i > 0 && !e.getPrevBlockHash().equals(expectedPrev)) {
                return false;
            }
            String computed = computeBlockHash(e.getPrevBlockHash(), e.getId(), e.getTransactionId(), e.getAccountId(),
                    e.getDirection(), e.getAmountCents(), e.getRunningBalanceCents());
            if (!computed.equals(e.getBlockHash())) {
                return false;
            }
            expectedPrev = e.getBlockHash();
        }
        return true;
    }

    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }

    public List<LedgerEntry> getRecentEntries() {
        return ledgerEntryRepository.findAllByOrderByCreatedAtDesc();
    }
}
