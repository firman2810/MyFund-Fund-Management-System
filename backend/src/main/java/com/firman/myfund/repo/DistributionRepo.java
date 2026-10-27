package com.firman.myfund.repo;

import com.firman.myfund.model.Distribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DistributionRepo extends JpaRepository<Distribution, String> {

    List<Distribution> findAllByOrderByDistributedAtDesc();

    @Query(value = "select nextval('dst_seq')", nativeQuery = true)
    long nextSeq();

    @Query(value = "select nextval('ben_seq')", nativeQuery = true)
    long nextBeneficiarySeq();
}
