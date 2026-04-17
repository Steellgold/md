import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { FC, PropsWithChildren } from "react";
import "./globals.css";

const appName = "MD";
const appDescription =
  "A focused Markdown editor with split preview, local file access, recent files, and remote GitHub or Gist opening.";
const ogTitle = "MD, a true focused Markdown editor";
const ogDescription =
  "Write, preview, and reopen Markdown files fast with local access, recent history, and GitHub or Gist URL support.";
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

const metadataBase = appUrl ? new URL(appUrl) : undefined;

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  applicationName: appName,
  referrer: "origin-when-cross-origin",
  keywords: [
    "markdown",
    "editor",
    "preview",
    "github markdown",
    "gist markdown",
    "notes",
    "writing",
  ],
  authors: [
    {
      name: appName,
    },
  ],
  creator: appName,
  publisher: appName,
  category: "productivity",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicons/favicon.ico" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicons/favicon.ico",
    apple: [
      {
        url: "/favicons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: appName,
    title: ogTitle,
    description: ogDescription,
    images: [
      {
        url: "/banner.png",
        width: 1200,
        height: 630,
        alt: ogTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: ogDescription,
    images: ["/banner.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

const inter = Geist({
  subsets: ["latin"],
  variable: "--font-sans"
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
