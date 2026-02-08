import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Body font - Clean, professional, highly legible
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Heading font - Commanding, military precision, Roman column proportions
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

// Mono font for technical elements
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Repcir",
    template: "%s | Repcir",
  },
  description: "We show up. Built by those who do.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Repcir",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Repcir",
    title: "Repcir",
    description: "We show up. Built by those who do.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Repcir",
    description: "We show up. Built by those who do.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  // Repcir Black theme color
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1A1A2E" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A2E" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${bebasNeue.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
