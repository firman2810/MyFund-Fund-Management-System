package com.firman.myfund.repo;

import com.firman.myfund.model.Allocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface AllocationRepo extends JpaRepository<Allocation, String> {

    List<Allocation> findAllByOrderByAllocatedAtDesc();

    /** Atomically moves {@code amount} from remaining to distributed; returns 0 if the balance is too low. */
    @Modifying(clearAutomatically = true)
    @Query("""
            update Allocation a set a.distributedAmount = a.distributedAmount + :amount
            where a.id = :id and a.amount - a.distributedAmount >= :amount""")
    int reserve(String id, BigDecimal amount);

    @Query(value = "select nextval('alc_seq')", nativeQuery = true)
    long nextSeq();
}
