<div align="center">

<img src="./frontend/brand/myfund-transparent.webp" width="100%" alt="MyFund logo" />

<h2> MyFund - Government Fund Management System </h2>

![](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![](https://img.shields.io/badge/Hyperledger_Fabric-2F3134?style=for-the-badge&logo=hyperledger&logoColor=white)
![](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

</div>

![MyFund dashboard](./frontend/screenshots/dashboard.webp)

## About

**MyFund** is a prototype for tracking government funds, from the ministry to the people who receive them.

Public money passes through several hands, and records kept in one central database can be changed without a trace. MyFund records every step on a blockchain instead.

- **Ministry** allocates funds to agencies/NGOs.
- **Agencies** record each distribution to beneficiaries.
- **Auditor** monitors the whole flow.

Every allocation and distribution is a transaction on a permissioned **Hyperledger Fabric** network. Each organisation keeps its own copy of the ledger, so no single party can quietly change a record.

A smart contract enforces the fund rules: no overspending, and an agency can only spend its own allocations. Not even the backend can bypass them.

## Architecture

| Folder            | Layer                                             |
|-------------------|---------------------------------------------------|
| `frontend/`       | React + Vite UI                                   |
| `backend/`        | Spring Boot REST API                              |
| `smart-contract/` | Hyperledger Fabric network and `fund_cc` contract |

```
        Orderers: orderer1, orderer2, orderer3 (Raft)
                          |
                 channel: myfund-channel
        /                 |                \
  MinistryMSP         AgencyMSP          AuditorMSP
  peer0 + fund_cc     peer0 + fund_cc    peer0 + fund_cc
        \                 |                /
             Spring Boot backend (Fabric Gateway)
                          |
              PostgreSQL copy + React frontend
```

### Writing a transaction

1. A user submits an allocation or distribution in the frontend.
2. The backend checks the user's role and sends the transaction to Fabric as the user's organisation.
3. The `fund_cc` contract runs on two peers, the user's organisation and the Auditor, and checks the rules. If a rule is broken, the transaction is refused and nothing is written.
4. The orderers put the transaction into a block, and every peer adds that block to its ledger.
5. After the commit, the backend saves a copy in PostgreSQL and returns the transaction ID.

| Transaction  | Endorsed by          |
|--------------|----------------------|
| Allocation   | Ministry + Auditor   |
| Distribution | Agency + Auditor     |

### Reading data

The dashboard, transaction history and reports read straight from the ledger, not from PostgreSQL. The ledger is the source of truth.

### Verifying

The Auditor's Monitoring Report compares every ledger record with its PostgreSQL copy and lists any changed, missing or extra record. It only reports differences; it never repairs them.

## Features

| Feature                                                    | Who      |
|------------------------------------------------------------|----------|
| Login & registration                                       | All      |
| Dashboard                                                  | All      |
| Fund Allocation                                            | Ministry |
| Fund Distribution                                          | Agency   |
| Transaction History with blockchain record                 | All      |
| Monitoring Report + ledger vs database check               | Auditor  |

## Tech Stack

| Layer      | Technology                                             |
|------------|--------------------------------------------------------|
| Frontend   | React 19, TypeScript, Vite 8, Tailwind CSS 4, Motion   |
| Backend    | Java 25, Spring Boot 4, PostgreSQL, Fabric Gateway SDK |
| Blockchain | Hyperledger Fabric 2.5 LTS, run in Docker              |

## Getting Started

### Prerequisites

- Java 25 (JDK)
- Node.js 20.19+
- PostgreSQL
- WSL 2 with Ubuntu
- Docker Desktop (WSL integration on for Ubuntu)

Fabric runs entirely in Docker; nothing else to install.


### 1. Create the database

```bash
createdb -U postgres myfund
```

Flyway creates the tables on first start.


### 2. Add local secrets

Create `backend/src/main/resources/application-local.properties` (git-ignored):

```properties
spring.datasource.password=<your postgres password>
app.jwt.secret=<output of: openssl rand -base64 32>
```

Optional: `DB_URL` / `DB_USERNAME` (defaults: `localhost:5432/myfund`, `postgres`).


### 3. Install frontend packages

```bash
cd frontend && npm install
```

### 4. Start

Run `start-dev.bat` from the project root.

| Window          | Runs            | URL                   |
|-----------------|-----------------|-----------------------|
| MyFund Backend  | Spring Boot API | http://localhost:8080 |
| MyFund Frontend | Vite dev server | http://localhost:3000 |

First run takes a few minutes (Docker images, contract build, Maven).

Open http://localhost:3000 when the backend logs `Seeded 10 records on the ledger` (or `not seeding` on later starts).

To stop: close both windows, then run `wsl -d Ubuntu --cd smart-contract ./network.sh down`. Ledger data is kept.


### 5. Demo accounts

Password for all: `1234`

| Role     | Email                          |
|----------|--------------------------------|
| Ministry | `officer.mof@mof.gov.my`       |
| Agency   | `director.nadma@nadma.gov.my`  |
| Auditor  | `auditor.federal@audit.gov.my` |

Sample records are illustrative, not real government data.


## Blockchain Network

Run in WSL Ubuntu, from `smart-contract/`:

| Command               | What it does                                     |
|-----------------------|--------------------------------------------------|
| `./network.sh up`     | Start the network and deploy `fund_cc` (safe to re-run) |
| `./network.sh down`   | Stop everything, keep the ledger                 |
| `./network.sh reset`  | Stop and wipe ledger, keys and channel           |
| `./network.sh status` | Show channel height and deployed contract        |

Generated keys live in `smart-contract/network/organizations/` (git-ignored, never commit).

## Tests

```bash
cd backend && ./mvnw test     # API tests with an in-memory ledger
cd frontend && npm test       # formatter and chart-total checks
cd frontend && npm run lint   # type check
```

`smart-contract/verify.sh` runs live end-to-end checks (stop the backend first). It covers seeding, writes, contract refusals, database tampering, node failures and a restart, printing PASS/FAIL per check.

For a clean demo afterwards: `./network.sh reset`, then restart the backend.

## License

MIT, see [LICENSE](./LICENSE).
