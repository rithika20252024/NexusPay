package com.wellsfargo.nexuspay.repository;

import com.wellsfargo.nexuspay.domain.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, String> {
    List<LedgerEntry> findAllByOrderByCreatedAtDesc();
    List<LedgerEntry> findAllByOrderByCreatedAtAsc();

    @Query(value = "SELECT block_hash FROM ledger_entries ORDER BY created_at DESC LIMIT 1", nativeQuery = true)
    Optional<String> findLatestBlockHash();
}
