package com.wellsfargo.nexuspay.repository;

import com.wellsfargo.nexuspay.domain.PaymentIntent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PaymentIntentRepository extends JpaRepository<PaymentIntent, String> {
    List<PaymentIntent> findAllByOrderByCreatedAtDesc();
}
