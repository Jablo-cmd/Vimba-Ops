# Vimba Ops — Product Architecture

## Product scope
Vimba Ops is an enterprise operations platform for private security companies. It combines workforce/HR administration, leave, rostering, attendance, field operations, incidents, patrols, assets, regulated-equipment accountability, compliance, reporting, AI-assisted decision support and audit.

## AI & intelligence layer
AI is a core platform capability, not a cosmetic add-on. It operates as an intelligence layer across Vimba Ops while respecting tenant isolation, role permissions, privacy controls and human approval.

Planned AI capabilities include:
- Operations copilot for natural-language questions about authorized operational data
- Daily command-centre briefings and shift summaries
- Incident report summarization and structured extraction
- Incident trend and anomaly detection
- Staffing and roster assistance, including leave-related coverage gaps
- Workforce risk and compliance exception prioritization
- Expiry and renewal alerts with intelligent prioritization
- Patrol and attendance anomaly detection
- Asset/inventory discrepancy detection
- Management report generation
- Natural-language search across authorized records
- Predictive/forecasting features where sufficient historical data exists
- AI-assisted recommendations with explanations and supporting source records

AI must never silently make high-impact operational or employment decisions. Human users remain accountable for approvals and actions. AI outputs must be traceable, permission-aware and auditable.

## Tenancy
Every operational record belongs to a company/tenant. Tenant isolation is enforced server-side and through database RLS.

## Roles
Platform Admin, Company Owner, Operations Manager, Compliance Officer, Inventory Officer, Supervisor, Guard, HR/Workforce, Auditor, Client Viewer.

## Workforce & HR
The Workforce domain includes:
- Employee/guard profiles and employee numbers
- Employment status, role, grade and site/post assignment
- Supervisor relationships and organisational structure
- Qualifications, certifications and training records
- Identity, employment and supporting documents
- Licence/credential expiry tracking
- Emergency contacts and next-of-kin
- Onboarding and offboarding workflows
- Workforce history
- HR records with controlled access
- HR audit trail

HR data is tenant-scoped and protected by role-based access. Sensitive HR records must not be exposed to operational roles unless explicitly authorized.

## Leave management
Leave is a first-class workforce capability and supports:
- Annual leave
- Sick leave
- Family responsibility leave
- Unpaid leave
- Study leave
- Maternity, paternity and parental leave
- Company-defined leave types
- Leave balances and accrual rules
- Leave requests, approvals and multi-level approval workflows
- Supporting documents
- Leave calendar and team/site visibility
- Leave history
- Cancellation and reversal
- HR/payroll exports where required

Leave integrates with rostering and attendance. Approved leave can identify roster coverage gaps and prevent conflicting scheduling.

## Operations
Core operational modules:
- Companies/tenants
- Sites, contracts and posts
- Workforce
- Rosters
- Attendance
- Incidents/occurrence reporting
- Patrols and checkpoints
- Supervisory operations
- Notifications
- Client/service reporting

## Inventory & regulated equipment
Configurable company-defined categories include firearms, ammunition, protective equipment, radios, body cameras, torches, first-aid equipment, vehicles, uniforms, access cards, keys and other equipment.

Regulated items can record manufacturer, model, serial number, licence/reference number, expiry, status, storage location, site, custodian, issue/return dates, inspection, maintenance, documents and notes.

Ammunition is an accountable stock ledger with receipts, issues, returns, adjustments, balance, location, custodian and transaction history. History is never silently overwritten.

These capabilities are limited to lawful inventory, licensing/reference records, custody, issue/return, inspection, maintenance, stock accountability, compliance and audit.

## Compliance
Compliance covers:
- Employee and operational document expiry
- Qualifications and training
- Licences/reference records
- Equipment inspections
- Maintenance
- Exceptions and overdue actions
- Evidence/supporting documents
- Compliance history

## Audit
Sensitive actions capture tenant, actor, action, entity, identifier, timestamp, previous state, new state, reason and correlation context. Sensitive history is append-only.

## Security
Least privilege, tenant isolation, MFA-ready authentication, no client secrets, RLS on exposed tables, server-side validation, append-only sensitive history, controlled documents and explicit status transitions.
