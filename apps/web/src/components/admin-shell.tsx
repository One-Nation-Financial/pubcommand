import { platformCan, PLATFORM_PERMISSIONS, type PlatformRole } from "@pubcommand/core";
import { BrandLogo } from "./brand";
import Link from "next/link";
import { AppFrame } from "./app-frame";
import { CommandPalette } from "./command-palette";
import { SiteSwitcher } from "./site-switcher";
import { switcherPaletteItems, type SwitcherModel } from "@/features/navigation/switcher";

const links: { href: string; label: string; permissions: string[]; superAdminOnly?: boolean }[] = [
  { href: "/", label: "Overview", permissions: [PLATFORM_PERMISSIONS.viewOrgs] },
  { href: "/orgs", label: "Organizations", permissions: [PLATFORM_PERMISSIONS.viewOrgs] },
  { href: "/users", label: "Users", permissions: [PLATFORM_PERMISSIONS.viewUsers] },
  { href: "/plans", label: "Plans", permissions: [PLATFORM_PERMISSIONS.managePlans, PLATFORM_PERMISSIONS.manageModules] },
  { href: "/domains", label: "Domains", permissions: [PLATFORM_PERMISSIONS.manageDomains] },
  { href: "/emails", label: "Emails", permissions: [PLATFORM_PERMISSIONS.manageSystemEmails] },
  { href: "/staff", label: "Staff", permissions: [PLATFORM_PERMISSIONS.manageStaff] },
  { href: "/brain", label: "Master Brain", permissions: [PLATFORM_PERMISSIONS.manageBrain] },
  { href: "/brain/chat", label: "BrainChat", permissions: [PLATFORM_PERMISSIONS.manageBrain] },
  { href: "/promo-studio", label: "Promo Analyzer", permissions: [PLATFORM_PERMISSIONS.manageBrain] },
  { href: "/intel/videos", label: "VidRipper", permissions: [PLATFORM_PERMISSIONS.manageBrain] },
  // Usage holds the dashboard plus Activity, Audit and Jobs (tabs on the Usage page).
  { href: "/usage", label: "Usage", permissions: [PLATFORM_PERMISSIONS.viewAudit, PLATFORM_PERMISSIONS.manageJobs] },
  { href: "/agents", label: "AI Agents", permissions: [PLATFORM_PERMISSIONS.manageStaff], superAdminOnly: true },
];

export function AdminShell({
  role,
  email,
  pathname,
  switcher,
  children,
}: {
  role: PlatformRole;
  email: string;
  pathname: string;
  switcher: SwitcherModel;
  children: React.ReactNode;
}) {
  const visible = links.filter((link) => (!link.superAdminOnly || role === "SUPER_ADMIN") && link.permissions.some((permission) => platformCan(role, permission)));
  return (
    <>
      <AppFrame
        sidebar={
          <div className="px-3 py-4">
            <div className="px-1">
              <BrandLogo fill className="w-full" />
            </div>
            <div className="mt-3 px-1">
              <SiteSwitcher model={switcher} />
            </div>
            <nav className="mt-4" aria-label="Platform console">
              {visible.map((link) => (
                <Link key={link.href} href={link.href} className={navClass(isCurrent(pathname, link.href))}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        }
        header={
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold">Platform console</span>
            <span className="pc-break min-w-0 text-muted">
              {email} · {role}
              <span className="ml-3 hidden text-xs sm:inline">⌘K to jump</span>
            </span>
          </div>
        }
      >
        {children}
      </AppFrame>
      <CommandPalette
        items={[
          ...visible.map((link) => ({ label: link.label, href: link.href, group: "Platform console" })),
          ...switcherPaletteItems(switcher),
        ]}
      />
    </>
  );
}

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // BrainChat has its own entry; the Master Brain entry covers the rest of /brain.
  if (href === "/brain" && pathname.startsWith("/brain/chat")) return false;
  if (href === "/intel/videos") return pathname.startsWith("/intel");
  if (href === "/usage") return pathname.startsWith("/usage") || pathname === "/audit" || pathname === "/jobs";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navClass(active: boolean) {
  return `flex min-h-11 items-center rounded-md px-3 text-sm font-medium ${active ? "bg-[#dbe7ff] text-[#1e3a8a]" : "hover:bg-canvas"}`;
}
