import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" chỉ dùng cho Docker, Vercel không cần
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
