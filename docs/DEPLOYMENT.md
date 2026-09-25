# Vimba Ops production deployment

## Required
- Supabase project with the migration in supabase/migrations/ applied.
- VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY configured in the deployment environment.
- At least one tenant and a trusted administrator/platform-owner profile provisioned through a controlled admin process.
- Authentication email settings, redirect URLs, SMTP and MFA policy configured for the production domain.
- Private Storage bucket and tenant-scoped object policies configured before enabling document uploads.

## Security
The browser uses only the Supabase publishable key. Service-role credentials are never required by the frontend. RLS is the final authorization boundary; route guards are only a UX layer.

New registrations are created as pending profiles. A trusted administrator must activate the account and assign its tenant and role. Public self-registration must never create privileged roles.

## CI
GitHub Actions runs install, typecheck, lint, tests and production build. The verification workflow is manually triggerable.

## External configuration
Supabase project provisioning, SMTP/email, MFA, production DNS, notification providers and initial administrator provisioning require credentials or business decisions outside the repository.