import type { AccessSubject } from "@pubcommand/core";
import { brandProfile, can } from "@pubcommand/core";
import Link from "next/link";
import { appForPath, CATEGORY_ORDER, visibleApps } from "@/lib/apps";
import { canManagePublications } from "@/features/pubsetup/module";
import { stopImpersonation } from "@/server/platform-actions";
import { AppFrame } from "./app-frame";
import { SidebarApp } from "./sidebar-app";
import { BrandLogo } from "./brand";
import { BrandSwitcher } from "./brand-switcher";
import { CommandPalette } from "./command-palette";
import { SiteSwitcher } from "./site-switcher";
import { switcherPaletteItems, type SwitcherModel } from "@/features/navigation/switcher";

type Brand = { id: string; name: string; niche?: string | null };

/**
 * Sidebar with the apps grouped by area, and one Settings link at the bottom.
 * Everything administrative lives under Settings.
 */
export function OrgShell({
  organization,
  brands,
  brand,
  subject,
  pathname,
  impersonating,
  switcher,
  brandLogos = {},
  children,
}: {
  organization: { id: string; name: string; slug: string };
  brands: Brand[];
  brand: Brand | null;
  subject: AccessSubject;
  pathname: string;
  email: string;
  impersonating: { targetEmail: string } | null;
  switcher: SwitcherModel;
  /** Brand id → logo URL (and a tile color when the logo is made for dark backgrounds), for brands that uploaded one. */
  brandLogos?: Record<string, { src: string; background: string | null }>;
  children: React.ReactNode;
}) {
  const scope = { organizationId: organization.id, brandId: subject.membershipBrandId ?? brand?.id ?? null };
  const apps = visibleApps(subject, scope, brandProfile({ name: brand?.name ?? "", niche: brand?.niche }).niche);
  const current = appForPath(apps, pathname);
  const inSettings = pathname === "/settings" || pathname.startsWith("/settings/");
  const inAgents = pathname === "/agents" || pathname.startsWith("/agents/");
  const canSettings = can(subject, "settings.manage", scope);
  // Publication Setup lives under Settings; publication admins without settings.manage land straight on it.
  const canPublications = subject.entitledModuleIds.includes("pubsetup") && canManagePublications(subject, scope);
  const settingsHref = canSettings ? "/settings" : "/settings/publication-setup";
  const showSettings = canSettings || canPublications;
  const groups = CATEGORY_ORDER.map((category) => ({ category, apps: apps.filter((app) => app.category === category) })).filter(
    (group) => group.apps.length > 0,
  );

  const sidebar = (
    <div className="flex min-h-full flex-col">
      <div className="space-y-3 px-4 py-4">
        <Link href="/" className="block" aria-label="PubCommand dashboard">
          <BrandLogo fill className="w-full" />
        </Link>
        <SiteSwitcher model={switcher} />
        <div className="rounded-lg border border-line px-2 py-1.5">
          <p className="px-1 text-[11px] font-medium text-muted">Brand</p>
          {/* Second line: the brand's logo on the left (40% of the box), its name or picker beside it. */}
          <div className="flex min-w-0 items-center gap-2">
            {brand && brandLogos[brand.id] ? (
              <span className="flex w-[40%] shrink-0 items-center rounded px-1 py-1" style={brandLogos[brand.id]!.background ? { background: brandLogos[brand.id]!.background! } : undefined}>
                <img src={brandLogos[brand.id]!.src} alt={`${brand.name} logo`} className="h-auto max-h-10 w-full object-contain object-left" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <BrandSwitcher brands={brands} current={brand?.id ?? null} />
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 pb-4" aria-label="Apps">
        <Link className={navClass(pathname === "/")} href="/">
          <span aria-hidden className="w-5 text-center">
            🏠
          </span>
          Dashboard
        </Link>
        {groups.map((group) => (
          <div key={group.category} className={group.category === "Pinned" ? "" : "mt-4"}>
            {group.category === "Pinned" ? null : (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{group.category}</p>
            )}
            {group.apps.map((app) => {
              const open = current?.moduleId === app.moduleId;
              const activeSub = open ? activeSubHref(app.subnav, pathname) : null;
              return (
                <SidebarApp
                  key={app.moduleId}
                  id={app.moduleId}
                  name={app.name}
                  icon={app.icon}
                  href={app.href}
                  open={open}
                  subnav={app.subnav}
                  activeSub={activeSub}
                  linkClass={navClass(open)}
                />
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-2 py-3">
        {/* Every member can connect their own AI agents; admins (agents.manage) see all of them. */}
        <Link className={navClass(inAgents)} href="/agents">
          <span aria-hidden className="w-5 text-center">
            🤖
          </span>
          AI Agents
        </Link>
        {showSettings ? (
          <Link className={navClass(inSettings)} href={settingsHref}>
            <span aria-hidden className="w-5 text-center">
              ⚙️
            </span>
            Settings
          </Link>
        ) : null}
      </div>
    </div>
  );

  return (
    <div>
      <AppFrame
        banner={
          impersonating ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f9dbaf] bg-[#fffaeb] px-4 py-2 text-sm text-[#93370d]">
              <p className="pc-break min-w-0">Viewing as {impersonating.targetEmail}.</p>
              <form action={stopImpersonation}>
                <button className="inline-flex min-h-11 items-center font-semibold underline">Stop</button>
              </form>
            </div>
          ) : null
        }
        sidebar={sidebar}
        header={
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {current ? current.name : inSettings ? "Settings" : inAgents ? "AI Agents" : pathname === "/account" ? "Your account" : "Dashboard"}
            </p>
            <span className="ml-auto hidden text-xs text-muted sm:inline">⌘K to jump</span>
          </div>
        }
      >
        {children}
      </AppFrame>
      <CommandPalette
        items={[
          { label: "Dashboard", href: "/", group: "Apps" },
          ...apps.map((app) => ({ label: app.name, href: app.href, group: "Apps" })),
          { label: "AI Agents", href: "/agents", group: "Apps" },
          ...(showSettings ? [{ label: "Settings", href: settingsHref, group: "Apps" }] : []),
          ...(canPublications ? [{ label: "Publication Setup", href: "/settings/publication-setup", group: "Apps" }] : []),
          ...switcherPaletteItems(switcher),
        ]}
      />
    </div>
  );
}

/** The sub-menu item for this path: the longest href that matches (so /websites/posts/new beats /websites/posts). */
function activeSubHref(items: { href: string }[], pathname: string): string | null {
  let best: string | null = null;
  for (const item of items) {
    if ((pathname === item.href || pathname.startsWith(`${item.href}/`)) && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

function navClass(active: boolean) {
  return `flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium ${
    active ? "bg-[#e0e7ff] text-[#1e3a8a]" : "text-ink hover:bg-canvas"
  }`;
}
