import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The browser calls /api/... on this Next.js server, which forwards the
  // request to the FastAPI backend. This avoids CORS setup on the backend.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
