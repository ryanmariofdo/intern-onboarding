# GreenChit — Architecture Design Pack

## 1. System Context (one-paragraph recap of Day 1-style context)

GreenChit is BISTEC's internal tool for reimbursement claims. Staff sign in with Microsoft Entra ID and submit claims with receipts. Line managers get a Teams notification and approve, reject, or ask for more information. Finance exports approved claims as a CSV to SharePoint, where payroll picks it up. Every state change goes into a tamper-evident audit log kept for seven years. Only the claimant, manager, finance, and auditors can see a claim

## 2. Containers (C4 Level 2) — embedded PNG + table of containers

### Table of containers

| Container | Technology | Responsibility |
|---|---|---|
| Web app | React, served from App Service | Claim forms, status view, manager approvals, finance export |
| API Service | ASP.NET Core on Azure App Service | Claims logic, auth checks, signed URLs, audit writes, CSV export |
| Notification service | ASP.NET Core background service on the same App Service plan | Reads queue events, sends Teams cards, falls back to email |
| Azure SQL | Azure SQL Database | System of record for claims and the audit log |
| Blob Storage | Azure Blob Storage | Stores receipt images, accessed by signed URLs only |


**External systems (outside the system boundary):**

| System | Role |
|---|---|
| Microsoft Entra ID | Single sign-on, issues JWTs |
| Azure Communication Services Email | Email fallback |
| SharePoint | Holds the exported CSV folder with approved claims |
| Payroll automation system | Reads the CSV from SharePoint |

## 3. Components (C4 Level 3) for the API service — embedded PNG + table of components

### Table of components

| Component | Responsibility |
|---|---|
| Auth component | Validates Entra ID tokens, enforces who can see which claim |
| Claims component | Creates, lists, and submits claims; moves them between Draft, Submitted, Approved, Rejected, Paid; exports approved claims to SharePoint as CSV |
| Receipts component | Checks file limits, issues signed upload and download URLs |
| Notifications component | Sends claim events to the Notification service |
| Audit logging component | Writes who, when, and why for every state change |

## 4. Reading order — how a reviewer should walk through the diagrams

### Container Diagram
- Start at the Web app. Staff open it, and it sends them to Entra ID to sign in. They return with a token.
- From the Web app, the request goes to the API Service over HTTPS with that token. The API Service checks the token with Entra ID before doing anything else.
- From the API Service, claim data goes to Azure SQL. The claim row and its audit row are saved there, so the database stays the single source of truth.
- Back in the API Service, it hands the Web app a signed URL for each receipt. The Web app then uploads directly to Blob Storage. Large files skip the API and can retry on a weak connection.
- Once the claim is saved, the API Service fires an event to the Notification service. This is the dashed arrow. The submit does not wait for it.
- From the Notification service, a card goes to the manager on Teams. If that fails, it falls back to Azure Communication Services Email.
- When finance exports, the API Service writes a CSV to SharePoint. The Payroll automation system picks it up from there.

### Component Diagram
- This is the inside of the API Service. Everything outside its boundary is a neighbour from the container diagram.
- A request enters from the Web app at the Auth component. It validates the token with Entra ID and checks that this user may touch this claim.
- From Auth, the call goes to the Claims component. It creates or updates the claim, applies the state change, and saves it to Azure SQL.
- From Claims, it asks the Receipts component for signed URLs. Receipts checks the file limits, then issues the URLs against Blob Storage.
- Also from Claims, it calls the Audit logging component. That writes who, when, and why to Azure SQL for every transition.
- Last from Claims, it calls the Notifications component. That sends the claim alert, as a dashed arrow, to the Notification service.
- On a finance export, Claims also writes the CSV out to SharePoint.