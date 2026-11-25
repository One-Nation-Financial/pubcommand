import type { Metadata } from "next";

/**
 * PubCommand's own logo, from the logo kit in apps/web/public/brand. Use `on` for the
 * surface it sits on: the dark-text logo on light surfaces, the light-text logo on dark ones.
 * The app itself has no dark theme, so its screens use on="light".
 */
export function BrandLogo({ on = "light", className = "h-8 w-auto", fill = false }: { on?: "light" | "dark"; className?: string; fill?: boolean }) {
  const src = on === "dark" ? "/brand/logo-dark.svg" : "/brand/logo-light.svg";
  if (fill) {
    // The logo file has padding around the drawing (x 52.5–772 and y 31–170 of 803 × 198). Negative
    // margins, as percentages of the container's width, cancel it so the mark and wordmark span
    // exactly the container's width (e.g. the same width as the sidebar's dropdowns).
    return (
      <span className={`block overflow-hidden ${className}`}>
        <img src={src} alt="PubCommand" width={803} height={198} className="block h-auto" style={{ width: "111.59%", maxWidth: "none", margin: "-4.28% 0 -3.84% -7.3%" }} />
      </span>
    );
  }
  return <img src={src} alt="PubCommand" className={className} width={130} height={32} />;
}

/** Who owns PubCommand. Its logo sits in the footer of PubCommand's own screens. */
export const OWNER_NAME = "Agora StealthWorks";

/**
 * The footer on PubCommand's own screens (console, organization app, login, picker), never on
 * customers' public sites: the black horizontal "By Agora StealthWorks" logo, centred.
 */
export function OwnerFooter({ className = "" }: { className?: string }) {
  return (
    <footer data-surface="owner-footer" className={`flex justify-center border-t border-line px-4 py-5 ${className}`}>
      <img src="/brand/agora-stealthworks-horizontal-black.svg" alt={`By ${OWNER_NAME}`} width={343} height={40} className="h-10 w-auto max-w-full" />
    </footer>
  );
}

/** Favicon, app icons, manifest and social card for PubCommand's own pages (never customers' public sites). */
export const brandMetadata: Metadata = {
  title: { default: "PubCommand", template: "%s · PubCommand" },
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/brand/site.webmanifest",
  openGraph: { images: [{ url: "/brand/og.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/brand/og.jpg"] },
};

export const brandThemeColor = "#7C3AED";
