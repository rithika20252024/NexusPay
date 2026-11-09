package com.wellsfargo.nexuspay.service;

import com.wellsfargo.nexuspay.domain.*;
import com.wellsfargo.nexuspay.dto.*;
import com.wellsfargo.nexuspay.repository.PaymentIntentRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class PaymentOrchestratorService {

    private final DoubleEntryLedgerService ledgerService;
    private final IdempotencyService idempotencyService;
    private final ModelRiskManagementService mrmService;
    private final PaymentIntentRepository paymentIntentRepository;

    public PaymentOrchestratorService(DoubleEntryLedgerService ledgerService,
                                     IdempotencyService idempotencyService,
                                     ModelRiskManagementService mrmService,
                                     PaymentIntentRepository paymentIntentRepository) {
        this.ledgerService = ledgerService;
        this.idempotencyService = idempotencyService;
        this.mrmService = mrmService;
        this.paymentIntentRepository = paymentIntentRepository;
    }

    public PaymentResponse processPayment(PaymentRequest req) {
        long t0 = System.currentTimeMillis();
        String idempKey = (req.getIdempotency_key() != null && !req.getIdempotency_key().isBlank())
                ? req.getIdempotency_key()
                : "idemp_" + UUID.randomUUID().toString().substring(0, 8);

        String reqHash = idempotencyService.computeHash("POST", "/api/payments",
                req.getAmount_cents() + ":" + req.getCustomer_id() + ":" + req.getMerchant_id());

        // 1. Acquire Idempotency Lock
        IdempotencyService.LockResult lock;
        try {
            lock = idempotencyService.acquireLock(idempKey, reqHash, 10000L);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return new PaymentResponse(null, req.getAmount_cents(), req.getCurrency(),
                    "CONFLICT", 0.0, "MUTEX_LOCKED", 0.5, "In-flight request currently processing for this Idempotency-Key");
        }
        if (lock.isDuplicate) {
            if (lock.isProcessing) {
                return new PaymentResponse(null, req.getAmount_cents(), req.getCurrency(),
                        "CONFLICT", 0.0, "MUTEX_LOCKED", 0.5, "In-flight request currently processing for this Idempotency-Key");
            } else {
                return new PaymentResponse("pi_replayed", req.getAmount_cents(), req.getCurrency(),
                        "SUCCEEDED", 12.0, "HIT-IDEMPOTENT", 0.8, "Idempotent replay: transaction already settled, zero double-charge");
            }
        }

        try {
            // 2. Model Risk Management (MRM) Fraud Assessment
            RiskAssessmentDto risk = mrmService.assessTransactionRisk(req.getAmount_cents(), req.getCustomer_id(), req.getCard_number());
            if ("DECLINE_FRAUD_RISK".equals(risk.getDecision())) {
                idempotencyService.resolveLock(idempKey, 403, "Fraud risk blocked");
                return new PaymentResponse(null, req.getAmount_cents(), req.getCurrency(),
                        "FRAUD_BLOCKED", risk.getRiskScore(), "MISS", 2.1, "Transaction blocked by Model Risk Management (MRM Score: " + risk.getRiskScore() + ")");
            }

            // 3. Test Card Scenarios
            if (req.getCard_number() != null && req.getCard_number().endsWith("0002")) {
                idempotencyService.resolveLock(idempKey, 402, "Card declined: Insufficient funds");
                return new PaymentResponse(null, req.getAmount_cents(), req.getCurrency(),
                        "DECLINED", risk.getRiskScore(), "MISS", 45.0, "Card declined by issuing bank: Insufficient funds");
            }

            // 4. Double-Entry Settlement
            String paymentId = "pi_" + UUID.randomUUID().toString().substring(0, 12);
            long feeCents = Math.round(req.getAmount_cents() * 0.029) + 30; // 2.9% + 30c

            ledgerService.transfer(paymentId, req.getCustomer_id(), req.getMerchant_id(),
                    "acc_stripe_fees", req.getAmount_cents(), feeCents, req.getCurrency(), "Enterprise Settlement for " + paymentId);

            // 5. Persist PaymentIntent record
            PaymentIntent pi = new PaymentIntent(paymentId, req.getAmount_cents(), req.getCurrency(),
                    req.getCustomer_id(), req.getMerchant_id(), PaymentStatus.SUCCEEDED, idempKey,
                    "ch_" + UUID.randomUUID().toString().substring(0, 10), risk.getRiskScore());
            paymentIntentRepository.save(pi);

            double latency = (double) (System.currentTimeMillis() - t0);
            PaymentResponse res = new PaymentResponse(paymentId, req.getAmount_cents(), req.getCurrency(),
                    "SUCCEEDED", risk.getRiskScore(), "MISS", latency, "Payment successfully authorized and settled on double-entry ledger");

            // 6. Resolve Idempotency Cache
            idempotencyService.resolveLock(idempKey, 200, res.getPaymentId());

            return res;
        } catch (Exception e) {
            idempotencyService.releaseLock(idempKey);
            throw e;
        }
    }
}
