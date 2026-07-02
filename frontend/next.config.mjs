/** @type {import('next').NextConfig} */

const IS_PROD = process.env.NODE_ENV === "production";

// Security headers applied to every response
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // Strict-Transport-Security — only sent in prod (requires HTTPS)
    key: "Strict-Transport-Security",
    value: IS_PROD ? "max-age=63072000; includeSubDomains; preload" : "",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts + React hydration require 'unsafe-inline' for now
      // Tighten with nonces once on Next.js 15+
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com https://cdn.fontshare.com",
      "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com",
      "img-src 'self' data: blob: https://avatars.githubusercontent.com",
      // Allow WS + API connections to the backend
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} ${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"} https://openrouter.ai`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      IS_PROD ? "upgrade-insecure-requests" : "",
    ]
      .filter(Boolean)
      .join("; "),
  },
];

const nextConfig = {
  output: "standalone",

  // Remove X-Powered-By: Next.js header (reduces attack surface)
  poweredByHeader: false,

  // Compress responses (gzip/brotli)
  compress: true,

  // Use remotePatterns instead of deprecated `domains`
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },

  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders.filter((h) => h.value !== ""),
      },
    ];
  },
};

export default nextConfig;
