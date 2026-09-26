import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "unpdf"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
