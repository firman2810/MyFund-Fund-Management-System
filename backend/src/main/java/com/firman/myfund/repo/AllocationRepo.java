package com.firman.myfund.repo;

import com.firman.myfund.model.Allocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AllocationRepo extends JpaRepository<Allocation, String> {

    @Query(value = "select nextval('alc_seq')", nativeQuery = true)
    long nextSeq();
}
