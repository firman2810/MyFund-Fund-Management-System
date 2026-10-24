<div align="center">

<img src="./docs/design/myfund-transparent.webp" width="500" alt="MyFund logo" />

<h2> MyFund - Government Fund Management System </h2>

![](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![](https://img.shields.io/badge/Hyperledger_Fabric-2F3134?style=for-the-badge&logo=hyperledger&logoColor=white)
![](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)


</div>

## 1. Project Introduction

**MyFund** is a Government Fund Distribution & Monitoring System. A ministry allocates funds to agencies, agencies and NGOs record how they distribute those funds, and auditors monitor the whole flow. Every allocation and distribution is written as a transaction with a blockchain record, so the money trail is transparent and tamper-evident.

## 2. Project Overview and Features

### Architecture


| Folder            | Layer                        | Status                  |
|-------------------|------------------------------|-------------------------|
| `frontend/`       | React + Vite UI              | Ready                   |
| `backend/`        | Spring Boot REST API         | Planned                 |
| `smart-contract/` | Hyperledger Fabric chaincode | Planned                 |

### Features

- **Login & registration**: role-based sign-in for Ministry, Agency/NGO and Auditor users.
- **Dashboard**: role-aware summary of allocations and recent transactions.
- **Fund Allocation** (Ministry): create allocations to agencies.
- **Fund Distribution** (Agency/NGO): record distributions against an allocation. A distribution cannot exceed the allocation's remaining amount.
- **Transaction History** (all roles): every allocation and distribution, newest first, with a detail view showing its blockchain record.
- **Monitoring Report** (Auditor): overview of allocations, distributions and transactions for oversight.
- **Demo role switcher**: in mock mode, switch between roles without logging out.

## 3. Tech Stack


| Layer          | Technology                                                   |
|----------------|--------------------------------------------------------------|
| Frontend       | React 19, TypeScript, Vite 8, Tailwind CSS 4, Motion, Lucide icons |
| Backend        | Spring Boot REST API with JWT auth (planned)                 |
| Blockchain     | Hyperledger Fabric chaincode `fund_cc` on `myfund-channel` (planned) |



## 4. Getting Started: Setup and Running Instructions


## 5. License

Distributed under the MIT License.
