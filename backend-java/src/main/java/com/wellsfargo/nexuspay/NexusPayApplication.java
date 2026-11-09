package com.wellsfargo.nexuspay;

import com.wellsfargo.nexuspay.domain.Account;
import com.wellsfargo.nexuspay.domain.AccountType;
import com.wellsfargo.nexuspay.repository.AccountRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class NexusPayApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexusPayApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedAccounts(AccountRepository accountRepository) {
        return args -> {
            if (accountRepository.count() == 0) {
                // Seed Initial Accounts ($10,000.00 customer wallet = 1,000,000 cents)
                accountRepository.save(new Account("acc_customer_primary", "Jane Doe (Retail Client)", AccountType.RETAIL_CHECKING, 1000000L, "USD"));
                accountRepository.save(new Account("acc_merchant_stripe", "Acme Corp (Merchant Terminal)", AccountType.MERCHANT_SETTLEMENT, 0L, "USD"));
                accountRepository.save(new Account("acc_stripe_fees", "Interchange Processing Fees (2.9% + 30¢)", AccountType.INTERCHANGE_FEES, 0L, "USD"));
                accountRepository.save(new Account("acc_escrow_holding", "NexusPay In-Transit Escrow", AccountType.ESCROW, 0L, "USD"));

                System.out.println("[NexusPay Enterprise] Seeded initial financial accounts with $10,000.00 customer liquidity.");
            }
        };
    }
}
