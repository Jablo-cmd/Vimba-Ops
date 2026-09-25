# Vimba Ops — Build Plan

## Phase 1 — Foundation
- [x] Repository
- [x] Architecture
- [x] Security boundaries
- [x] App shell
- [x] Authentication integration
- [x] Tenant model
- [x] RBAC model
- [x] Database migrations
- [x] RLS
- [x] Audit framework
- [x] CI

## Phase 2 — Workforce & operations
- [x] Companies / tenants
- [x] Workforce profiles
- [x] Sites / contracts / posts
- [x] Rostering with database conflict protection
- [x] Attendance
- [x] Incidents / occurrence book
- [x] Patrol routes / checkpoints / runs
- [x] Leave requests and balances schema
- [x] Client portal authorization architecture

## Phase 3 — Inventory & compliance
- [x] Configurable asset categories
- [x] Asset register and custody history
- [x] Compliance documents and expiry state
- [x] Controlled document path fields
- [x] Maintenance/status fields

## Phase 4 — Intelligence
- [ ] AI operations copilot
- [ ] AI daily command-centre briefing
- [ ] AI trend/anomaly detection
- [ ] AI-assisted reports
- [ ] AI output audit trail and human approval controls

## Phase 5 — Control & reporting
- [x] Operations dashboards
- [x] Compliance exceptions
- [x] Reporting workspace foundation
- [x] Audit explorer data model
- [ ] Notification delivery providers
- [ ] Export jobs

## Phase 6 — Production hardening
- [x] Unit tests
- [x] RLS regression plan
- [ ] E2E test suite and browser harness
- [x] CI gates
- [ ] Remote database verification
- [ ] Storage policy verification
- [ ] Monitoring
- [ ] Backup/recovery verification
- [x] Deployment runbook
- [ ] Final security review

Production certification requires successful CI plus verification against a real Supabase project and production authentication/storage configuration.