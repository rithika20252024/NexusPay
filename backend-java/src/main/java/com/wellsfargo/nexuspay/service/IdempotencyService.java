package com.wellsfargo.nexuspay.service;

import com.wellsfargo.nexuspay.domain.IdempotencyRecord;
import com.wellsfargo.nexuspay.domain.IdempotencyStatus;
import com.wellsfargo.nexuspay.repository.IdempotencyRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Service
public class IdempotencyService {

    private final IdempotencyRepository repository;

    public IdempotencyService(IdempotencyRepository repository) {
        this.repository = repository;
    }

    public String computeHash(String method, String path, String body) {
        try {
            String raw = method.toUpperCase() + ":" + path + ":" + (body != null ? body : "");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public static class LockResult {
        public final boolean isDuplicate;
        public final boolean isProcessing;
        public final Integer cachedResponseCode;
        public final String cachedResponseBody;

        public LockResult(boolean isDuplicate, boolean isProcessing, Integer cachedResponseCode, String cachedResponseBody) {
            this.isDuplicate = isDuplicate;
            this.isProcessing = isProcessing;
            this.cachedResponseCode = cachedResponseCode;
            this.cachedResponseBody = cachedResponseBody;
        }
    }

    @Transactional
    public synchronized LockResult acquireLock(String key, String requestHash, long timeoutMs) {
        long now = System.currentTimeMillis();
        Optional<IdempotencyRecord> opt = repository.findById(key);

        if (opt.isPresent()) {
            IdempotencyRecord rec = opt.get();
            if (!rec.getRequestHash().equals(requestHash)) {
                throw new IllegalArgumentException("422: Idempotency payload mismatch for key " + key);
            }

            if (rec.getStatus() == IdempotencyStatus.PROCESSING) {
                if (rec.getLockExpiresAt() > now) {
                    return new LockResult(true, true, null, null);
                } else {
                    rec.setLockExpiresAt(now + timeoutMs);
                    repository.save(rec);
                    return new LockResult(false, false, null, null);
                }
            }

            return new LockResult(true, false, rec.getResponseCode(), rec.getResponseBody());
        }

        try {
            IdempotencyRecord newRec = new IdempotencyRecord(key, requestHash, IdempotencyStatus.PROCESSING, 0, "", now + timeoutMs);
            repository.saveAndFlush(newRec);
            return new LockResult(false, false, null, null);
        } catch (DataIntegrityViolationException e) {
            return new LockResult(true, true, null, null);
        }
    }

    @Transactional
    public synchronized void resolveLock(String key, int responseCode, String responseBody) {
        repository.findById(key).ifPresent(rec -> {
            rec.setStatus(IdempotencyStatus.RESOLVED);
            rec.setResponseCode(responseCode);
            rec.setResponseBody(responseBody);
            repository.save(rec);
        });
    }

    @Transactional
    public synchronized void releaseLock(String key) {
        repository.deleteById(key);
    }
}
