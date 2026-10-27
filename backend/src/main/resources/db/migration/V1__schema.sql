CREATE TABLE users (
    id           VARCHAR(100) PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    role         VARCHAR(20)  NOT NULL CHECK (role IN ('MINISTRY', 'AGENCY', 'AUDITOR')),
    organization VARCHAR(200) NOT NULL,
    designation  VARCHAR(200) NOT NULL,
    department   VARCHAR(200) NOT NULL,
    password     VARCHAR(200) NOT NULL
);

CREATE TABLE allocations (
    id                        VARCHAR(30)    PRIMARY KEY,
    programme                 VARCHAR(300)   NOT NULL,
    receiving_agency          VARCHAR(200)   NOT NULL,
    amount                    NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    distributed_amount        NUMERIC(15, 2) NOT NULL DEFAULT 0,
    description               VARCHAR(2000)  NOT NULL,
    supporting_info           VARCHAR(2000)  NOT NULL,
    reference_no              VARCHAR(100)   NOT NULL,
    allocated_by              VARCHAR(200)   NOT NULL,
    allocated_at              TIMESTAMPTZ    NOT NULL,
    ledger_network            VARCHAR(100)   NOT NULL,
    ledger_channel            VARCHAR(100)   NOT NULL,
    ledger_chaincode          VARCHAR(100)   NOT NULL,
    ledger_block_number       BIGINT         NOT NULL,
    ledger_tx_id              VARCHAR(100)   NOT NULL UNIQUE,
    ledger_status             VARCHAR(20)    NOT NULL,
    ledger_endorsement_policy VARCHAR(200)   NOT NULL,
    ledger_timestamp          TIMESTAMPTZ    NOT NULL,
    ledger_payload_hash       VARCHAR(100)   NOT NULL,
    CHECK (distributed_amount BETWEEN 0 AND amount)
);

CREATE TABLE distributions (
    id                        VARCHAR(30)    PRIMARY KEY,
    allocation_id             VARCHAR(30)    NOT NULL REFERENCES allocations (id),
    programme_name            VARCHAR(300)   NOT NULL,
    agency_name               VARCHAR(200)   NOT NULL,
    beneficiary_name          VARCHAR(300)   NOT NULL,
    beneficiary_id            VARCHAR(100)   NOT NULL,
    amount                    NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description               VARCHAR(2000)  NOT NULL,
    distributed_at            TIMESTAMPTZ    NOT NULL,
    ledger_network            VARCHAR(100)   NOT NULL,
    ledger_channel            VARCHAR(100)   NOT NULL,
    ledger_chaincode          VARCHAR(100)   NOT NULL,
    ledger_block_number       BIGINT         NOT NULL,
    ledger_tx_id              VARCHAR(100)   NOT NULL UNIQUE,
    ledger_status             VARCHAR(20)    NOT NULL,
    ledger_endorsement_policy VARCHAR(200)   NOT NULL,
    ledger_timestamp          TIMESTAMPTZ    NOT NULL,
    ledger_payload_hash       VARCHAR(100)   NOT NULL
);

CREATE INDEX idx_distributions_allocation ON distributions (allocation_id);

CREATE SEQUENCE alc_seq;
CREATE SEQUENCE dst_seq;
CREATE SEQUENCE ben_seq;
CREATE SEQUENCE ledger_block_seq;
