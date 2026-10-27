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
@Table(name = "allocations")
@Getter
@Setter
@NoArgsConstructor
public class Allocation {

    @Id
    private String id;

    private String programme;
    private String receivingAgency;
    private BigDecimal amount;
    private BigDecimal distributedAmount;
    private String description;
    private String supportingInfo;
    private String referenceNo;
    private String allocatedBy;
    private Instant allocatedAt;

    @Embedded
    private LedgerRecord ledger;

    public BigDecimal getRemainingAmount() {
        return amount.subtract(distributedAmount);
    }
}
