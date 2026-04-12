import type { NextConfig } from "next";

// In Docker the frontend container must reach the backend via the service name.
// Locally (or when not containerised), fall back to localhost.
// Set BACKEND_URL=http://backend:8000 in docker-compose; leave unset for local dev.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  // Proxy /api/* → backend so the browser never makes cross-origin requests.
  // SSE (chat streaming) also goes through this proxy transparently.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
