# Vimba Ops — Product Architecture

## Tenancy
Every operational record belongs to a company/tenant. Tenant isolation is enforced server-side and through database RLS.

## Roles
Platform Admin, Company Owner, Operations Manager, Compliance Officer, Inventory Officer, Supervisor, Guard, HR/Workforce, Auditor, Client Viewer.

## Inventory
Configurable company-defined categories: firearms, ammunition, protective equipment, radios, body cameras, torches, first-aid equipment, vehicles, uniforms, access cards, keys and other equipment.

Regulated items can record manufacturer, model, serial number, licence/reference number, expiry, status, storage location, site, custodian, issue/return dates, inspection, maintenance, documents and notes.

Ammunition is an accountable stock ledger with receipts, issues, returns, adjustments, balance, location, custodian and transaction history. History is never silently overwritten.

## Audit
Sensitive actions capture tenant, actor, action, entity, identifier, timestamp, previous state, new state, reason and correlation context.

## Core modules
Sites/contracts/posts; workforce/rosters/attendance; incidents; patrols/checkpoints; inventory/custody; compliance/documents/expiry; vehicles; reporting; notifications; audit.

## Security
Least privilege, tenant isolation, MFA-ready authentication, no client secrets, RLS on exposed tables, server-side validation, append-only sensitive history, controlled documents and explicit status transitions.
