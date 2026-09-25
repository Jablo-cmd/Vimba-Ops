# Database/RLS test execution

These tests are intended for a real Supabase test project using pgTAP and Supabase test helpers.

Required assertions:
1. RLS is enabled on every public operational table.
2. Internal users can only access their tenant.
3. A user from tenant A cannot SELECT, INSERT, UPDATE or DELETE tenant B rows.
4. Client roles can only read records linked to their client organisation.
5. Guard roles are restricted to their own employee operational workflows.
6. Sensitive HR data is restricted to HR/platform administration.
7. audit_log cannot be modified directly.
8. Private document storage is tenant-scoped.

Run with the Supabase CLI test database workflow after a local Supabase CLI/test environment is available.