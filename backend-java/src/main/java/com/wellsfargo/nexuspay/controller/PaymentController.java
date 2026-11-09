package com.wellsfargo.nexuspay.controller;

import com.wellsfargo.nexuspay.domain.PaymentIntent;
import com.wellsfargo.nexuspay.dto.PaymentRequest;
import com.wellsfargo.nexuspay.dto.PaymentResponse;
import com.wellsfargo.nexuspay.repository.PaymentIntentRepository;
import com.wellsfargo.nexuspay.service.PaymentOrchestratorService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentOrchestratorService orchestratorService;
    private final PaymentIntentRepository paymentIntentRepository;

    public PaymentController(PaymentOrchestratorService orchestratorService,
                             PaymentIntentRepository paymentIntentRepository) {
        this.orchestratorService = orchestratorService;
        this.paymentIntentRepository = paymentIntentRepository;
    }

    @PostMapping
    public ResponseEntity<?> executePayment(@RequestHeader(value = "Idempotency-Key", required = false) String idempHeader,
                                            @Valid @RequestBody PaymentRequest request) {
        if (idempHeader != null && !idempHeader.isBlank()) {
            request.setIdempotency_key(idempHeader);
        }
        PaymentResponse response = orchestratorService.processPayment(request);

        if ("CONFLICT".equals(response.getStatus())) {
            return ResponseEntity.status(409).body(response);
        } else if ("FRAUD_BLOCKED".equals(response.getStatus())) {
            return ResponseEntity.status(403).body(response);
        } else if ("DECLINED".equals(response.getStatus())) {
            return ResponseEntity.status(402).body(response);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getRecentPayments() {
        List<PaymentIntent> list = paymentIntentRepository.findAllByOrderByCreatedAtDesc();
        Map<String, Object> res = new HashMap<>();
        res.put("payments", list);
        return ResponseEntity.ok(res);
    }
}
