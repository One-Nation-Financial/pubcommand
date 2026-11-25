# Architecture

Phase 1 is the shell. Later phases fill the modules. This document is the contract those phases should keep.

## Ownership and branding

PubCommand is owned by Agora StealthWorks. PubCommand's own screens (the console, every organization's app, the login and the organization picker) end with a footer carrying the black horizontal "By Agora StealthWorks" logo (`/brand/agora-stealthworks-horizontal-black.svg`, `OwnerFooter` in `apps/web/src/components/brand.tsx`). Customers' public sites (websites, funnels, mini-blogs) never show it. PubCommand's system emails carry the white logo in a black bar under the PubCommand masthead (`docs/EMAILS.md`).

## Tenancy

Platform, then Organization, Brand, Workspace, and User. A user is a global identity. Membership joins a user to one organization and one role. A role may be limited to a brand or workspace. The membership may be limited the same way.

Every tenant table has `organization_id` (the organization row uses its own `id`). Identity tables (`users`, `sessions`, `magic_links`) and platform tables (`plans`, `platform_staff`, `platform_audit_logs`) do not.

The app sets the organization with `set_config('app.current_org_id', ..., true)` inside a transaction, and a Prisma client extension also injects `organizationId` into tenant queries. Postgres row-level security uses that setting. The official Railway Postgres role is a superuser, and superusers bypass RLS, so the extension is what enforces isolation on the deployed database. RLS is the backstop for a non-owner role. Tests cover both: a non-superuser role cannot read another org, and the extension cannot read another org even as a superuser.

Do not query tenant tables with the raw client from an organization request. Bootstrap queries that must see every membership for the signed-in user filter on `userId` explicitly.

## Permissions

`can(subject, permission, scope)` in `@pubcommand/core` is the only organization check. It passes only when:

1. The membership covers the scope.
2. An allow grant covers the permission and the scope.
3. The organization plan entitles the module, and the org has not disabled it.
4. No exclusion and no deny grant covers that scope.

The settings module is always entitled so an organization cannot lock itself out of `/settings`. Product modules are not.

Platform permissions are separate. `platformCan(role, permission)` reads the staff role. An organization role never grants them, even when the email matches the super admin.

## Hosts

`ROOT_DOMAIN` is `pubcommand.com` in production.

| Host | Site |
| --- | --- |
| `pubcommand.com`, `www.pubcommand.com` | Marketing and login |
| `app.pubcommand.com` | Organization picker |
| `admin.pubcommand.com` | Platform console, staff only |
| `{slug}.pubcommand.com` | That organization |

Module routes are the manifest slug: `/knowledge`, `/editorial`, `/performance`, `/promo-studio`, `/intel`, `/forms`, `/charts`, `/billing`. `/settings` is the shell. Product modules are manifests only. TODO: do not build their features in this PR. Disabled or unentitled modules show an upsell. Unknown slugs 404.

Middleware parses the `Host` header (and, only on bare localhost, `?org=` or `?site=`). It rewrites to an internal route that includes the slug. The server resolves the slug again from the host, loads the organization, and requires a membership before any tenant query. The host is not authorization. Old slugs live in `organization_slug_history` and redirect to the current slug.

Auth cookies use `Domain=.pubcommand.com` when `ROOT_DOMAIN` is a real domain, so one login works across subdomains. Localhost cookies stay host-only. Use `?org=` and `?site=` locally.

Reserved organization slugs: `www`, `app`, `admin`, `api`, `platform`, `mail`, `status`, `docs`, `help`, `billing`, `auth`, `static`, `cdn`. Slugs are lowercase, 3–40 characters, `[a-z0-9-]`, and cannot start or end with a hyphen.

## Staff and 2FA

`PlatformStaff` is the staff flag. Roles:

- `SUPER_ADMIN` — everything, including inviting and removing staff and editing PubCommand's own system emails (Admin → Emails, `platform.emails.manage`; see `docs/EMAILS.md`). Seeded for Stephen. Only this role can change staff, and only on `admin.pubcommand.com`.
- `SUPPORT` — view organizations and users, create organizations, manage organization members, impersonate, read the platform audit.
- `BILLING` — view organizations, manage plans, read the platform audit. Billing cannot create organizations or change members.
- `OPS` — view and create organizations, manage members, suspend organizations, manage platform subdomains and plan modules, read the platform audit.

Creating an organization, adding or removing a member, and adding yourself require `platform.orgs.manage` plus an active staff row, confirmed TOTP, and a verified session. Each of those actions writes a platform audit row and an organization audit row. The create form asks for a name, a subdomain, a plan, and the first admin's email. It creates the default brand and workspace, owner and admin roles, and that admin's membership, then emails a sign-in link. When `RESEND_API_KEY` is unset the link is logged as `[magic-link]` and is never shown on the page in production.

Lucia does not issue a second factor. Phase 1 implements RFC 6238 TOTP for staff only. The secret is encrypted with `AUTH_SECRET`. A staff session is created with `mfaVerified=false` and a signed gate cookie. Middleware rejects any admin-host session that does not carry a staff gate. Staff who have not enrolled, or who have not entered a current code, can open only `/2fa`. Pending enrollment does not open the console. The admin layout checks the staff row and `mfaVerified` again. Organization users are not prompted for 2FA in this phase.

Impersonation is a signed cookie plus a banner. It uses the target member's permissions. Start and stop are platform audit events. Mutations during impersonation are audited to both logs.

`platform_audit_logs` is append-only. The Prisma client refuses update and delete, and a database trigger rejects both.

## Auth

Lucia sessions. Magic link and optional password. SSO is an interface (`SsoHooks`) with no provider. The seeded super admin has no password.

Sessions end after a period without activity: 12 hours by default, set per person in the console (Users → a person → Sign-ins and usage, `users.idle_timeout_minutes`). `readSession()` checks `sessions.last_active_at` and ends an idle session; every request counts as activity (written at most once a minute), and the in-app heartbeat counts only when the person touched the page. The 30-day Lucia expiry still caps a session. See `docs/USAGE.md`.

## AI

`AnthropicProvider` matches a completion-shaped interface and does not call the network.

## Storage

Objects, when a later phase uploads them, use:

`org/{organizationId}/brand/{brandId}/workspace/{workspaceId}/{moduleId}/{object}`

`storagePrefix()` builds that key. Phase 1 does not upload. The bucket is Railway bucket `pubcommand-files`. See `DEPLOY.md` for `S3_*`.

## Jobs and events

Modules declare jobs and events. The worker lists jobs, probes Redis when `REDIS_URL` is set, and does not attach a queue.

## Phase 6, not built

Optional per-organization custom domains, for example `hub.agora.com`, added from inside the hub through the Railway API, with a DNS verification status screen. Phase 1 does not call the Railway API. New organization slugs work from the wildcard domain alone.
