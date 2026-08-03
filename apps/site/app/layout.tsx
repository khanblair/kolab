import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://kolab.app"),
  title: {
    default: "Kolab - All you need. Nothing you don't.",
    template: "%s | Kolab",
  },
  description:
    "All you need. Nothing you don't. Open source project management that works for you, not against you.",
  keywords: [
    "kolab",
    "project management",
    "open source",
    "kanban",
    "task management",
    "self-hosted",
    "team collaboration",
  ],
  applicationName: "Kolab",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://kolab.app",
    siteName: "Kolab",
    title: "Kolab - All you need. Nothing you don't.",
    description:
      "Open source project management that works for you, not against you. Self-hosted, simple, and powerful.",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "Kolab",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kolab - All you need. Nothing you don't.",
    description:
      "Open source project management that works for you, not against you. Self-hosted, simple, and powerful.",
    images: ["/images/hero.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  category: "productivity",
  creator: "Kolab",
  publisher: "Kolab",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kolab",
    url: "https://kolab.app",
    logo: "https://kolab.app/logo-512.png",
    sameAs: ["https://github.com/khanblair/kolab"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kolab",
    url: "https://kolab.app",
    inLanguage: "en",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kolab",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Linux, macOS, Windows",
    description:
      "Open source project management that works for you, not against you. Self-hosted, simple, and powerful.",
    url: "https://kolab.app",
    image: "https://kolab.app/images/hero.png",
    license: "https://github.com/khanblair/kolab/blob/main/LICENSE",
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: This is necessary to apply the user's preferred color scheme before React hydration to prevent a flash of incorrect theme.
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var media = window.matchMedia('(prefers-color-scheme: dark)');
                  function applyTheme(isDark) {
                    document.documentElement.classList.toggle('dark', isDark);
                    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                  }
                  applyTheme(media.matches);
                  if (media.addEventListener) {
                    media.addEventListener('change', function(e) { applyTheme(e.matches); });
                  } else if (media.addListener) {
                    media.addListener(function(e) { applyTheme(e.matches); });
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data must be inlined as a script tag for search engines to parse.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          defer
          data-domain="kolab.app"
          src="https://plausible.kolab.app/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {
            "window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }"
          }
        </Script>
      </body>
    </html>
  );
}
