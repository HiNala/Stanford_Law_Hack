import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  // Proxy /api/* → backend so browser never hits a cross-origin endpoint.
  // This also means the chatApi SSE stream can just call /api/chat/… without
  // needing the full absolute URL.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
  // Silence "img" warnings for SVG/external URLs if needed later
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
