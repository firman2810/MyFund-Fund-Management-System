package com.firman.myfund.model;

import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "distributions")
@Getter
@Setter
@NoArgsConstructor
public class Distribution {

    @Id
    private String id;

    private String allocationId;
    private String programmeName;
    private String agencyName;
    private String beneficiaryName;
    private String beneficiaryId;
    private BigDecimal amount;
    private String description;
    private Instant distributedAt;

    @Embedded
    private LedgerRecord ledger;
}
