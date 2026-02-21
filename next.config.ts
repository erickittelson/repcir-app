import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // XSS Protection (legacy, but still useful)
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Enforce HTTPS
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Permissions Policy (formerly Feature-Policy)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  // Content Security Policy - Enforced
  // Note: 'unsafe-inline' for styles is required by Next.js for CSS-in-JS
  // 'unsafe-eval' removed for security; if needed, use nonces instead
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://vercel.live https://*.posthog.com https://us-assets.i.posthog.com https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "worker-src 'self' blob:",
      "connect-src 'self' https://api.openai.com https://*.vercel-storage.com https://*.neon.tech https://*.sentry.io https://*.ingest.sentry.io https://*.posthog.com https://us.i.posthog.com https://maps.googleapis.com wss:",
      "frame-src 'self' https://www.google.com https://maps.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
  },
  // Apply security headers to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Tunnel Sentry events through our domain to bypass ad-blockers
  async rewrites() {
    return [
      {
        source: "/monitoring",
        destination: "https://o4510845040918528.ingest.us.sentry.io/api/4510845044391936/envelope/",
      },
      {
        source: "/monitoring/:path*",
        destination: "https://o4510845040918528.ingest.us.sentry.io/api/4510845044391936/envelope/",
      },
    ];
  },
};

export default nextConfig;
