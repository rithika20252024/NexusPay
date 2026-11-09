package com.wellsfargo.nexuspay;

import com.wellsfargo.nexuspay.dto.PaymentRequest;
import com.wellsfargo.nexuspay.dto.PaymentResponse;
import com.wellsfargo.nexuspay.repository.AccountRepository;
import com.wellsfargo.nexuspay.service.PaymentOrchestratorService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class IdempotencyConcurrencyTest {

    @Autowired
    private PaymentOrchestratorService orchestratorService;

    @Autowired
    private AccountRepository accountRepository;

    @Test
    @DisplayName("Prevent Double-Charges Across Concurrent Identical Payment Requests")
    void testConcurrentIdempotencyDeduplication() throws InterruptedException, ExecutionException {
        String testKey = "idemp_concurrent_" + UUID.randomUUID().toString().substring(0, 8);
        long initialBalance = accountRepository.findById("acc_customer_primary").orElseThrow().getBalanceCents();

        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        List<Callable<PaymentResponse>> tasks = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            tasks.add(() -> {
                PaymentRequest req = new PaymentRequest();
                req.setAmount_cents(2500L); // $25.00
                req.setCurrency("USD");
                req.setCustomer_id("acc_customer_primary");
                req.setMerchant_id("acc_merchant_stripe");
                req.setCard_number("4242");
                req.setIdempotency_key(testKey);
                return orchestratorService.processPayment(req);
            });
        }

        List<Future<PaymentResponse>> results = executor.invokeAll(tasks);
        executor.shutdown();

        int successfulCharges = 0;
        int cachedReplays = 0;
        int mutexConflicts = 0;

        for (Future<PaymentResponse> f : results) {
            PaymentResponse res = f.get();
            if ("SUCCEEDED".equals(res.getStatus()) && "MISS".equals(res.getIdempotencyStatus())) {
                successfulCharges++;
            } else if ("HIT-IDEMPOTENT".equals(res.getIdempotencyStatus())) {
                cachedReplays++;
            } else if ("CONFLICT".equals(res.getStatus()) || "MUTEX_LOCKED".equals(res.getIdempotencyStatus())) {
                mutexConflicts++;
            }
        }

        assertEquals(1, successfulCharges, "Exactly ONE transaction should execute on the ledger");
        long balanceAfter = accountRepository.findById("acc_customer_primary").orElseThrow().getBalanceCents();
        assertEquals(initialBalance - 2500L, balanceAfter, "Balance must be deducted exactly once despite 10 concurrent requests");
    }
}
