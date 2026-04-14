import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  // output: "standalone" chỉ dùng cho Docker, Vercel không cần
  serverExternalPackages: ["bcryptjs"],

  // Proxy tất cả API requests sang NestJS backend
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ];
  },

  // Cho phép import từ workspace packages
  transpilePackages: ["@hrlite/shared"],
};

export default nextConfig;
