# ADR 0003: Store GreenChit data in Azure SQL Database and not Cosmos DB

## Status
Accepted (date: 2026-10-29)

## Context
- GreenChit stores claims, receipt names, users, and an audit log. These records are linked to each other. A claim has many receipts and many audit entries.
- Every state change must save the claim and its audit row together. Either both are saved or neither is.
- Finance exports approved claims to CSV. That means filtering and joining rows, which is easy in SQL.
- The audit log must be tamper-evident and kept for 7 years.
- The team already knows SQL. Nobody has used Cosmos DB in production.
- The brief gives two choices: Azure SQL or Cosmos DB.
- We don't yet know how big the data will grow. We expect it to stay small, because only BISTEC staff use it.

## Decision
- Claims, receipts, users, and approvals are normal tables.
- The audit log is an append-only ledger table. Rows cannot be changed or deleted without leaving a trace.
- The API Service saves the claim change and the audit row in one transaction.
- We use one small tier to start and scale up only if response times need it.

## Consequences
- Easier
  - Claim and audit rows are saved together, so we never get one without the other.
  - Export queries and "who can see this claim" checks are simple SQL.
  - The team can start building right away with skills they already have.
  - The ledger feature gives us tamper evidence without building our own.
- Harder
  - Changing the table design later needs migration scripts and care.
  - Scaling is mostly "pay for a bigger tier". It is not as flexible as Cosmos DB.
  - We pay for the database all day, even when nobody uses it.
- Different
  - We design tables and relationships up front, instead of storing flexible documents.
- Uncomfortable
  - A ledger table only proves tampering if someone checks it. We must save the ledger digests and verify them on a schedule. If nobody does this, "tamper-evident" is just a label.
  - We have no owner for that check yet. We must name one before launch.

## Alternatives considered
- Azure Cosmos DB: rejected. It is great for huge, flexible data spread across regions, but we have small, linked data. We would give up easy joins and simple multi-record transactions. The team would also need time to learn how its pricing and partitioning work.
- Azure SQL plus a separate audit store, such as immutable Blob Storage: rejected. It makes the audit record a second write that can fail on its own. We would lose the all-or-nothing save.
- Same goes for MongoDB
