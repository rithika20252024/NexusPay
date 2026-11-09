package com.wellsfargo.nexuspay.repository;

import com.wellsfargo.nexuspay.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {
}
